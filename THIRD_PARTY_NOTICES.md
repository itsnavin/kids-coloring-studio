# Third-party notices

The production bundle includes locally bundled npm dependencies; no CDN is used.
Package license files are retained in `node_modules` when installing from the
lockfile. The application and original artwork licenses are in `LICENSE`.

| Package | License | Use |
| --- | --- | --- |
| jsPDF | MIT | A4 PDF encoding |
| fast-png | MIT | PNG decoding inside jsPDF |
| iobuffer | MIT | Binary buffer handling |
| fflate | MIT | PDF compression |
| @babel/runtime | MIT | Bundled runtime helpers |
| pako | MIT / Zlib | PNG decompression |
| core-js | MIT | Runtime polyfills |
| DOMPurify | Apache-2.0 OR MPL-2.0 | Optional jsPDF HTML helper |
| html2canvas | MIT | Optional jsPDF HTML helper |
| css-line-break, text-segmentation, utrie, base64-arraybuffer | MIT | html2canvas helpers |

jsPDF also declares optional dependencies (including canvg, DOMPurify and
html2canvas) for its HTML/SVG APIs, which this application does not call.
Vite may produce local optional chunks for these APIs; no remote code is loaded.
Development and test dependencies (Vite, Playwright, PDF.js, axe-core,
@napi-rs/canvas and xmldom) are
not required by the deployed application and retain their upstream licenses.
See the exact locked versions and transitive dependency graph in `package-lock.json`.
