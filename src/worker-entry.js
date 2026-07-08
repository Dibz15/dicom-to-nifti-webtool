// Self-contained worker entry point.
//
// Expects `self.__DCM2NIIX_WASM_B64__` to already be defined (a base64 string
// of the dcm2niix wasm binary) before this script runs. This lets the built
// page avoid any network fetch or cross-origin Worker script loading, which
// is what breaks dcm2niix demos when opened directly from disk (file://).
// It also means the deployed GitHub Pages site makes zero requests to any
// third-party CDN at runtime.
//
// The build script (scripts/build.mjs) copies the appropriate dcm2niix glue
// file (standard or .jpeg variant) to this same directory as `dcm2niix.js`
// before bundling, so the relative import below always resolves.

import Module from './dcm2niix.js';

function b64ToUint8Array(b64) {
  const binaryString = atob(b64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

let mod = null;
Module({
  wasmBinary: b64ToUint8Array(self.__DCM2NIIX_WASM_B64__),
  // Never actually used to fetch anything (we already supply wasmBinary above),
  // but without this, the glue code calls `new URL('dcm2niix.wasm', import.meta.url)`
  // which throws when import.meta.url is a blob: URL (as it is when this worker
  // script is constructed from a Blob, which is what lets this run under file://
  // as well as from a GitHub Pages origin with no extra requests).
  locateFile: (path) => path,
  // By default the Emscripten glue falls back to console.log/console.error for
  // dcm2niix's own stdout/stderr, which means all of its per-series diagnostics
  // ("Found N DICOM files", "Warning: ...", "Error: Missing images...", etc.)
  // are invisible unless someone opens devtools. Forward them to the main
  // thread instead so the page can show real, live conversion output.
  print: (text) => self.postMessage({ type: 'log', text, stream: 'stdout' }),
  printErr: (text) => self.postMessage({ type: 'log', text, stream: 'stderr' })
}).then((initializedMod) => {
  mod = initializedMod;
  self.postMessage({ type: 'ready' });
});

self.onerror = (message, error) => {
  self.postMessage({ type: 'error', message: message, error: error ? error.stack : null });
};
self.onunhandledrejection = (event) => {
  self.postMessage({
    type: 'error',
    message: event.reason ? event.reason.message : 'Unhandled rejection',
    error: event.reason ? event.reason.stack : null
  });
};

const copyFilesToFS = async (fileList, inDir, outDir) => {
  mod.FS.mkdir(inDir);
  mod.FS.mkdir(outDir);

  const promises = [];
  for (const fileItem of fileList) {
    const file = fileItem.file;
    // Note: Safari strips webkitRelativePath in the worker,
    // so we use the name property of the file object instead.
    const webkitRelativePath = fileItem.webkitRelativePath || file.name;
    const promise = new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const fileName = `${webkitRelativePath.split('/').join('_')}`;
          mod.FS.createDataFile(inDir, fileName, data, true, true);
          resolve();
        } catch (error) {
          console.error(error);
          reject(error);
        }
      };
      reader.onerror = () => {
        console.error(reader.error);
        reject(reader.error);
      };
      reader.readAsArrayBuffer(file);
    });
    promises.push(promise);
  }
  return Promise.all(promises);
};

const typeFromExtension = (fileName) => {
  const ext = fileName.split('.').pop();
  switch (ext) {
    case 'nii': return 'application/sla';
    case 'json': return 'application/json';
    case 'txt': return 'text/plain';
    case 'gz': return 'application/gzip';
    case 'bvec': return 'text/plain';
    case 'bval': return 'text/plain';
    case 'nrrd': return 'application/octet-stream';
    default: return 'application/octet-stream';
  }
};

const handleMessage = async (e) => {
  try {
    const inDir = '/input';
    const outDir = '/output';
    const fileList = e.data.fileList;
    const args = e.data.cmd;
    args.unshift('-o', outDir);

    if (!fileList || args.length < 1) {
      throw new Error('Expected a flat file list and at least one command');
    }
    if (!Array.isArray(args)) {
      throw new Error('Expected args to be an array');
    }
    if (!mod) {
      throw new Error('WASM module not loaded yet!');
    }

    await copyFilesToFS(fileList, inDir, outDir);

    args.push(inDir);
    const exitCode = mod.callMain(args);

    const files = mod.FS.readdir(outDir);
    const filteredFiles = files.filter((file) => !file.startsWith('.'));

    const convertedFiles = [];
    for (const file of filteredFiles) {
      const filePath = outDir + '/' + file;
      const fileData = mod.FS.readFile(filePath);
      const f = new File([fileData], file, { type: typeFromExtension(file) });
      convertedFiles.push(f);
    }

    // Always report whatever files actually landed in outDir, even on a
    // non-zero exit code. dcm2niix processes a study series-by-series; a
    // fatal error on one series (e.g. an inconsistent slice count on a
    // messy DWI series) doesn't mean earlier series didn't convert fine —
    // it just means the whole-run exit code reflects the worst outcome.
    // Throwing those good files away on any non-3/0 exit code was silently
    // discarding real, usable output. Let the caller decide what to do with
    // a partial result instead.
    self.postMessage({ type: 'result', convertedFiles: convertedFiles, exitCode: exitCode });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message, error: err.stack });
  }
};

self.addEventListener('message', handleMessage, false);
