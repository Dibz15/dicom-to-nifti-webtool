#!/usr/bin/env node
// Builds dist/index.html: a single, self-contained static page with the
// dcm2niix WASM worker and JSZip fully embedded as base64/inline JS.
//
// Why bundle instead of just `npm install` + `<script src="...">` pointing at
// node_modules? Two reasons:
//   1. The worker needs to be constructed from a Blob URL (not a file/URL on
//      disk or a CDN URL) so the page works from file:// and cross-origin
//      restrictions never bite, whether it's opened locally or served from
//      GitHub Pages.
//   2. We want zero runtime network requests once the page has loaded, so it
//      keeps working offline and never depends on a third-party CDN.
//
// Run with: npm run build   (outputs to ./dist)
//
// Env vars:
//   DCM2NIIX_VARIANT=standard|jpeg   (default: jpeg)
//     "jpeg" adds OpenJPEG/CharLS support for JPEG2000 / JPEG-LS compressed
//     DICOMs (transfer syntaxes like 1.2.840.10008.1.2.4.90/.91/.4.50 etc.)
//     at the cost of a larger WASM binary (~900KB vs ~480KB uncompressed).

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const SRC = path.join(ROOT, 'src');
const DIST = path.join(ROOT, 'dist');
const TMP = path.join(ROOT, 'build-tmp');
const PKG_DIST = path.join(ROOT, 'node_modules', '@niivue', 'dcm2niix', 'dist');

const variant = (process.env.DCM2NIIX_VARIANT || 'jpeg').toLowerCase();
if (!['standard', 'jpeg'].includes(variant)) {
  throw new Error(`DCM2NIIX_VARIANT must be "standard" or "jpeg", got "${variant}"`);
}
const suffix = variant === 'jpeg' ? '.jpeg' : '';

async function main() {
  if (!existsSync(PKG_DIST)) {
    throw new Error(
      `Could not find ${PKG_DIST} — did you run "npm install" first?`
    );
  }

  await fs.rm(DIST, { recursive: true, force: true });
  await fs.rm(TMP, { recursive: true, force: true });
  await fs.mkdir(DIST, { recursive: true });
  await fs.mkdir(TMP, { recursive: true });

  console.log(`[build] dcm2niix variant: ${variant}`);

  // 1. Stage the Emscripten glue file + our worker entry side by side so the
  //    relative `import Module from './dcm2niix.js'` in worker-entry.js resolves.
  const glueSrc = path.join(PKG_DIST, `dcm2niix${suffix}.js`);
  const glueDst = path.join(TMP, 'dcm2niix.js');
  await fs.copyFile(glueSrc, glueDst);
  await fs.copyFile(path.join(SRC, 'worker-entry.js'), path.join(TMP, 'worker-entry.js'));

  // 2. Bundle the worker into a single dependency-free ESM file.
  //    format=esm (not iife) because the glue code uses import.meta.url and
  //    top-level await in a code path that's dead in the browser but still
  //    needs to parse; esbuild only preserves import.meta correctly in esm.
  //    `module` (Node's builtin) is marked external since it's only ever
  //    referenced inside an `if (ENVIRONMENT_IS_NODE)` branch that never
  //    executes in a browser/worker context.
  const workerBundlePath = path.join(TMP, 'worker.bundle.js');
  await build({
    entryPoints: [path.join(TMP, 'worker-entry.js')],
    bundle: true,
    format: 'esm',
    platform: 'browser',
    external: ['module'],
    minify: true,
    outfile: workerBundlePath
  });

  // 3. Bundle JSZip as a standalone minified IIFE that sets window.JSZip.
  const jszipBundlePath = path.join(TMP, 'jszip.bundle.js');
  await build({
    entryPoints: [path.join(SRC, 'jszip-entry.js')],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    minify: true,
    outfile: jszipBundlePath
  });

  // 4. Read + base64-encode the wasm binary and the worker bundle text.
  const wasmPath = path.join(PKG_DIST, `dcm2niix${suffix}.wasm`);
  const wasmB64 = (await fs.readFile(wasmPath)).toString('base64');
  const workerB64 = Buffer.from(await fs.readFile(workerBundlePath, 'utf8')).toString('base64');
  const jszipJs = await fs.readFile(jszipBundlePath, 'utf8');

  // Sanity check: base64's alphabet [A-Za-z0-9+/=] can never contain "</",
  // so these are safe to place inside a <script type="text/plain"> tag
  // without accidentally terminating it early. Verified defensively anyway.
  for (const [name, text] of [['wasm', wasmB64], ['worker', workerB64]]) {
    if (/<\/script/i.test(text)) {
      throw new Error(`[build] unexpected "</script" sequence in ${name} payload`);
    }
  }
  if (/<\/script/i.test(jszipJs)) {
    throw new Error('[build] unexpected "</script" sequence in the JSZip bundle');
  }

  // 5. Fill in the HTML template.
  //    NOTE: use function replacements, not string replacements — a plain
  //    string second argument to String.replace() specially interprets "$&",
  //    "$$", "$`", "$'" sequences, and minified JS (JSZip in particular)
  //    reliably contains "$&" somewhere. Function replacements insert their
  //    return value literally, with no special-casing.
  const template = await fs.readFile(path.join(SRC, 'index.template.html'), 'utf8');
  const html = template
    .replace('__WASM_B64_PLACEHOLDER__', () => wasmB64)
    .replace('__WORKER_B64_PLACEHOLDER__', () => workerB64)
    .replace('__JSZIP_JS_PLACEHOLDER__', () => jszipJs);

  if (html.includes('_PLACEHOLDER__')) {
    throw new Error('[build] a template placeholder was not substituted — check index.template.html');
  }

  await fs.writeFile(path.join(DIST, 'index.html'), html, 'utf8');
  // Tell GitHub Pages not to run this through Jekyll.
  await fs.writeFile(path.join(DIST, '.nojekyll'), '');

  await fs.rm(TMP, { recursive: true, force: true });

  const sizeKb = (html.length / 1024).toFixed(0);
  console.log(`[build] wrote dist/index.html (${sizeKb} KB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
