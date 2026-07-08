# Third-Party Licenses

This repository is licensed under the Apache License, Version 2.0 (see
[`LICENSE`](LICENSE)). The built page (`dist/index.html`) embeds compiled/
bundled code from two third-party projects, pulled from npm at build time
(`scripts/build.mjs`) and not committed to this repo. Their licenses are
reproduced below, as required by their respective terms. Each piece of third-party code remains under its
own original license as reproduced here.

---

## dcm2niix / @niivue/dcm2niix — BSD 2-Clause

This project bundles the WebAssembly build of
[dcm2niix](https://github.com/rordenlab/dcm2niix) (Chris Rorden), via the
[`@niivue/dcm2niix`](https://github.com/niivue/mono/tree/main/packages/nv-ext-dcm2niix)
npm package, which declares itself `"license": "BSD-2-Clause"` (author:
"dcm2niix developers"). Per the upstream project's README: "the bulk of the
code is covered by the BSD license. Some units are either public domain
(nifti*.*, miniz.c) or use the MIT license (ujpeg.cpp)." — see dcm2niix's own
`license.txt` in that repository for the complete, authoritative breakdown.

```
Copyright (c) 2014-2026, Chris Rorden and the dcm2niix developers
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE
LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE
POSSIBILITY OF SUCH DAMAGE.
```

*Note: the `@niivue/dcm2niix` npm package does not ship its own `LICENSE`
file separately from its `package.json` license field, so the copyright
holder line above is a standard BSD-2-Clause attribution to the dcm2niix
project rather than a verbatim copy of a file from the package. For the
authoritative license text, see
[rordenlab/dcm2niix](https://github.com/rordenlab/dcm2niix)'s `license.txt`.*

---

## JSZip — MIT

Used for the "Download all as .zip" feature (`src/jszip-entry.js`), dual
licensed by its authors under MIT or GPL-3.0-or-later. This project uses it
under the MIT option, reproduced verbatim from JSZip's own
`LICENSE.markdown`:

```
The MIT License
================

Copyright (c) 2009-2016 Stuart Knightley, David Duponchel, Franz Buchinger, António Afonso

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

---

## esbuild — MIT (build-time only)

[esbuild](https://esbuild.github.io/) is used only to bundle the above at
build time (`devDependencies` in `package.json`); none of its own code ends
up in `dist/index.html`. Listed here for completeness. MIT licensed,
copyright (c) 2020 Evan Wallace.