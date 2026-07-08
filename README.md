# DICOM → NIfTI Converter

A single-page, fully offline-capable DICOM → NIfTI converter that runs entirely
in the browser using the WebAssembly build of
[dcm2niix](https://github.com/rordenlab/dcm2niix) via
[`@niivue/dcm2niix`](https://github.com/niivue/mono/tree/main/packages/nv-ext-dcm2niix).
No files ever leave the browser, and the built page makes **zero runtime
network requests** — the dcm2niix WASM binary and JSZip are embedded directly
in the HTML at build time.

Live version: `https://<your-username>.github.io/<repo-name>/` once Pages is enabled (see below).

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

or uncomment the `env:` block in `.github/workflows/deploy.yml` to change
what GitHub Actions builds.

## Deploying to GitHub Pages via GitHub Actions

1. Push this repo to GitHub.
2. In the repo, go to **Settings → Pages**, and under "Build and deployment"
   set **Source** to **GitHub Actions** (not "Deploy from a branch").
3. Push to `main` (or run the workflow manually from the **Actions** tab) —
   [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) will build
   the page with `npm run build` and deploy the `dist/` folder to Pages.
4. Your site will be live at `https://<your-username>.github.io/<repo-name>/`.

No build secrets or tokens are needed beyond the default `GITHUB_TOKEN` that
Actions provides automatically for Pages deployments.

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

## Credits

- [dcm2niix](https://github.com/rordenlab/dcm2niix) by Chris Rorden
- [`@niivue/dcm2niix`](https://github.com/niivue/mono/tree/main/packages/nv-ext-dcm2niix) — WASM build & browser API, part of the [NiiVue](https://github.com/niivue/niivue) project
- [JSZip](https://stuk.github.io/jszip/) for the zip-download feature
