# DICOM → NIfTI Converter

A single-page, fully offline-capable DICOM → NIfTI converter that runs entirely
in the browser using the WebAssembly build of
[dcm2niix](https://github.com/rordenlab/dcm2niix) via
[`@niivue/dcm2niix`](https://github.com/niivue/mono/tree/main/packages/nv-ext-dcm2niix).
No files ever leave the browser, and the built page makes **zero runtime
network requests**. The dcm2niix WASM binary and JSZip are embedded directly
in the HTML at build time.

Live version: [DICOM to NIfTI Webtool](https://dibz15.github.io/dicom-to-nifti-webtool/)

## Usage

Either navigate to the live page above, or download the latest release from [GitHub releases](https://github.com/DIBZ15/dicom-to-nifti-webtool/releases/latest) and open `index.html` in your browser. See below for local development options.

## How it works

This repo contains *source*, not the built artifact. The build step
(`npm run build`) does the following:

1. Pulls `@niivue/dcm2niix` and `jszip` from npm (`node_modules`, not committed).
2. Bundles [`src/worker-entry.js`](src/worker-entry.js) — the code that runs
   inside the conversion Web Worker — into a single dependency-free ESM file
   with [esbuild](https://esbuild.github.io/), inlining the Emscripten glue
   code (`dcm2niix.js`) so there are no relative imports left to resolve.
3. Base64-encodes the dcm2niix `.wasm` binary and embeds it (along with the
   bundled worker script) inside `<script type="text/plain">` tags in the
   page. At runtime, JS decodes these, concatenates them into one script, and
   constructs the Worker from a `Blob` URL — this is what avoids the
   "Worker failed to load" cross-origin error you get if you try to point a
   Worker directly at a `file://` page or CDN URL.
4. Bundles [`src/jszip-entry.js`](src/jszip-entry.js) (for the "Download all
   as .zip" button) into a minified inline `<script>`.
5. Fills in [`src/index.template.html`](src/index.template.html) with all of
   the above and writes the result to `dist/index.html`.

The result is one ~1.3MB static HTML file with no external dependencies —
open it directly from disk, or host it anywhere that serves static files.

## Local development

```bash
npm install
npm run build      # writes dist/index.html
npm run serve       # optional: serves ./dist at http://localhost:3000
```

You can also just open `dist/index.html` directly in a browser (double-click
it) — it works from `file://` too, no server required.

## Choosing the dcm2niix variant

Some DICOMs use JPEG2000 or JPEG-LS compressed transfer syntaxes (e.g.
`1.2.840.10008.1.2.4.90`, `.91`, `.4.50`, `.4.51`, `.70`...). Decoding those
requires the larger `.jpeg` build of dcm2niix (OpenJPEG + CharLS support).

By default this repo builds with `DCM2NIIX_VARIANT=jpeg` (the safer default —
handles more real-world DICOMs, at the cost of a larger page, ~1.3MB vs
~800KB). To build the smaller, standard-transfer-syntax-only variant instead:

```bash
DCM2NIIX_VARIANT=standard npm run build
```

## Project layout

```
src/
  index.template.html   # page markup/CSS/UI logic, with placeholders for embedded assets
  worker-entry.js        # conversion worker source (runs dcm2niix WASM off the main thread)
  jszip-entry.js          # thin wrapper that exposes JSZip on window
scripts/
  build.mjs               # the build script described above
.github/workflows/
  deploy.yml               # CI: npm ci && npm run build, then deploy dist/ to Pages
```

## License

This repository's own code is licensed under [Apache-2.0](LICENSE).

The built page embeds compiled/bundled code from two third-party projects at
build time (not committed here, pulled from npm): dcm2niix /
`@niivue/dcm2niix` (BSD-2-Clause) and JSZip (MIT, dual-licensed with
GPL-3.0-or-later — used here under the MIT option). Neither is copyleft, so
both are compatible with Apache-2.0. Full third-party license texts are in
[`THIRD_PARTY_LICENSES.md`](THIRD_PARTY_LICENSES.md).

## Credits

- [dcm2niix](https://github.com/rordenlab/dcm2niix) by Chris Rorden
- [`@niivue/dcm2niix`](https://github.com/niivue/mono/tree/main/packages/nv-ext-dcm2niix) — WASM build & browser API, part of the [NiiVue](https://github.com/niivue/niivue) project
- [JSZip](https://stuk.github.io/jszip/) for the zip-download feature