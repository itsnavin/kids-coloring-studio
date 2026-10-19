# Little Lines · Kids Coloring Studio

A free, static, privacy-friendly coloring studio for parents and children.
Choose from **34 distinct artist-made pages**: the original 12 drawings (birds,
animals, dinosaurs, houses, technology and original robot heroes), plus **22
realistic scientific nature drawings** from the National Park Service. Search,
filter, and browse 12 cards per page. Or convert a photo locally into an outline.
This is **not a collection of thousands**, an AI generator, or a photorealistic
redrawing service. Variations and uploaded photos do not increase the gallery count.

**Live:** https://itsnavin.github.io/kids-coloring-studio/

## Use it

Pick a category and picture. “Little artists” has larger, simpler regions;
“Growing artists” adds feathers, shell markings, flowers, stars, or panel details.
Ages are suggestions. Adjust the stroke, mirror the picture, or hide its name.
The preview and every download use the same original SVG renderer.

- **PDF:** one exact A4 page, portrait (210 × 297 mm) or landscape (297 × 210 mm).
  Use matching A4 paper, matching orientation, **actual size / 100%**, and
  disable printer headers/footers. The artwork has generous safe margins.
  On US Letter or another paper size, select **Fit**; physical size will change.
  Preview the printer dialog because hardware nonprintable areas vary.
- **PNG:** white, opaque, 2480 × 3508 pixels (or rotated dimensions),
  approximately 300 pixels per inch when placed on A4. PNG does **not** embed
  physical DPI metadata: set A4 paper/fit manually in your image printing app.
- **SVG:** original scalable vectors in an A4-sized page with physical mm units.
  Browser/app font substitution may slightly change the optional design name.

PDF artwork is a high-resolution raster embedded in an exact-size page, not
editable vector paths. Original illustrations have vector SVGs. Nature pages
and photo outlines have **PNG pixels embedded inside SVG**, not traced paths.
Upsampling an input does not invent detail. Downloads happen locally;
the browser may ask where to save. Print with adult help and suitable crayons.

## Local development

Requires Node.js 22.12+ (CI uses 24) and npm.

```sh
npm ci
npm run dev
```

Open the displayed `/kids-coloring-studio/` URL. On Windows, use `npm.cmd` if
PowerShell selects the script shim instead of the npm executable.

```sh
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

The browser suite runs against the production build with Vite preview. It checks
all designs and both detail levels, paths/bounds, opaque monochrome PNGs with
safe margins, all 12 PDF MediaBoxes via independent PDF.js parsing, embedded
image dimensions, exact SVG/preview consistency, mobile layout, keyboard
controls, category selection, stale-export cancellation and visible errors.
It saves actual downloads and artwork contact sheets to ignored `artifacts/`.
Visually inspect `all-simple.png` and `all-detailed.png` after changing artwork;
geometric tests cannot judge whether an animal is recognizable.

To run the same browser checks against a deployed site, set `LIVE_URL` to its
full URL ending in `/`. No local preview server is then started.

## Photo to outline

Open **Photo to outline** and select a JPEG or PNG you have permission to use.
Avoid sensitive or private images. There is no upload: the image is decoded,
processed in a local Web Worker and exported entirely inside your browser.
Select **Clear photo & return to gallery**, switch modes, or reload to discard
the working image. No photo, filename or options are stored persistently.
Downloads you save remain in your chosen download folder.

- Maximum file: 10,000,000 bytes; 16 megapixels; 8000 pixels per side; minimum
  32 × 32 pixels. Headers are checked before decode. HEIC, GIF, WebP and SVG are
  intentionally unsupported. Resize/convert locally before trying larger files.
- Processing: fit within 1280 px on the longest side, without cropping or
  stretching. Browser decoding applies JPEG EXIF orientation **once**.
  Transparent PNG backgrounds are composited onto white.
- The algorithm uses luminance and red/green and blue/green chroma differences
  (to retain equally bright color boundaries), separable box smoothing, Sobel edge detection,
  connected weak-edge hysteresis, connected-component speck removal and circular
  line dilation. No AI service or
  extra image-processing dependency is required.
- Lower **Edge sensitivity** to find weaker edges, or raise it to simplify.
  Raise **Smooth texture** for fur, foliage or noise; raise **Remove small specks**
  for isolated marks. The detailed preset lowers the edge threshold, while line
  weight expands detected marks. These change real processing, not just scale.
- Choose a high-contrast subject against a plain background. Shadows, patterned
  clothing, fur, busy scenes or low contrast can produce missing/open edges or
  dense texture. It cannot guarantee clean, closed crayon regions. Artist-made
  gallery pages are more predictable. Very blank/inky results show a tuning hint.
- Current desktop/mobile Chromium is automated-tested. This feature needs
  `createImageBitmap`, Canvas, and Web Workers; failures are shown explicitly.
  Approximate 1280-pixel inputs will look softer when enlarged on A4.

## Realistic gallery: verified source plan and scale limitation

The requested thousand-page target is **not met**. As checked on 2026-10-20:

| Source examined | Evidence and decision |
| --- | --- |
| [NPS official collection](https://www.nps.gov/subjects/fossils/coloring-book.htm) | Explicitly offers 40 main drawings plus 10 extras. The Commons mirror category had 64 files, including crops, duplicates and a PDF. Per-file metadata yielded 50 candidate compositions; visual review accepted 22 unframed, distinct usable drawings. |
| [Commons coloring pages](https://commons.wikimedia.org/wiki/Category:Coloring_pages) | Top category had 211 files, not 1,000 usable distinct pages; flags, duplicate crops and protected-character files are not appropriate additions. Subcategories do not automatically establish asset suitability or rights. |
| [BHL collection](https://www.biodiversitylibrary.org/collection/ColorOurCollections/) | Direct collection access returned 403 and was not bypassed. Broad claims of 150,000 historic illustrations refer to a general archive, not a verified collection of clean coloring outlines. No BHL artwork was imported. |

The attainable **reviewed, bundled** count for this release is 22 nature pages +
12 originals = **34**. More sources need individual rights/quality review before
expansion. Do not advertise 1,000 records, crops, generated permutations or photos
as 1,000 distinct printable artworks.

`src/open-art.json` records each accepted file's original source, Commons source
page/ID, author as supplied by that source (`NPS image`), public-domain-US basis,
verification date, source and bundled hashes, dimensions and modifications.
All 22 files have individual **PD-USGov-NPS** metadata; the
[NPS rights policy](https://www.nps.gov/aboutus/disclaimer.htm) explains that not
all material on NPS websites is government-owned. Public-domain status here is
U.S.-specific, not a global guarantee. No NPS insignia, endorsement or affiliation
is implied. No claim to original U.S. Government works.

The artwork is grayscale/near-white-paper cleaned and whitespace-trimmed; it is
not our original work or AI generation. Some fine scientific hatching is retained
for older artists. Archive drawings have **fixed detail**; thickness can strengthen
existing lines. Source links appear beside the selected artwork, source/rights
are included in SVG descriptions and PDF metadata, and a short credit/source ID
is printed in all nature downloads. The build publishes a complete
`ARTWORK-ATTRIBUTION.json`.

All nature assets and 300-pixel lazy thumbnails are bundled (~11 MB of full-size
images), with no cross-origin fetch at runtime and no canvas-taint dependency.
The manifest is small; only 12 thumbnail cards are rendered at once, and just the
selected full-size image is loaded. A future thousand-page release would need
an independently reviewed source manifest, duplicate-composition checks and
measured hosting/build budgets; this release intentionally does not dump a huge archive.

Development-only `scripts/import-open-art.js` queries official Commons metadata,
verifies the NPS rights category, hashes sources, and performs bounded sequential
downloads. It is not part of the app or CI and does not accept a collection
automatically. `scripts/curate-open-art.js` contains the explicit 22-file visual
allowlist, rejecting other candidates and removing their local files.
`scripts/review-open-art.js` generates review sheets and reports similar
compositions. To refresh, run the importer **without** `--download` first, review
the metadata, then deliberately download, curate and visually review all assets.
Recheck rights; never assume a source's current contents match this release.

## Content maintenance and licenses

`src/art.js` contains the catalog and hand-authored illustrations in a 600 × 600
coordinate frame, with curated `frame` bounds to make each design large on paper
without changing scale between detail levels. Add designs using the same metadata shape; keep the drawing
inside 40–560 (including the maximum 8-unit stroke), use closed, white-filled
coloring regions and reserve black fills for tiny eyes. Detail should add
meaningful shapes, not scale the artwork. Layering is deliberate: white shapes
occlude rear limbs, capes, and stems. Check both levels at the maximum stroke.
Do not insert user-supplied markup, remote images, protected characters, or logos.
All labels are fixed catalog strings; the SVG renderer XML-escapes text.

Application code: MIT. All 12 original illustrations: CC0-1.0 public-domain
dedication, free to print, adapt and share. See `LICENSE` and
`THIRD_PARTY_NOTICES.md`. PDF encoding uses locally bundled jsPDF; dependencies
and development/test tools are locked in `package-lock.json`. The build includes
upstream production license texts in `THIRD-PARTY-LICENSES.txt`.

## Privacy and deployment

No accounts, advertising, analytics, upload endpoints, runtime CDNs, external
fonts, storage, cookies, or generative services. Options/photos live only in memory.
Bundled images are requested from this site's host, not external art providers.
Source/rights links navigate to external sites only when clicked.
The hosting provider (GitHub Pages) receives normal web requests and may retain
server logs under its own privacy policy. The app never asks for children's data.
No service worker is installed; the first visit needs connectivity.

Push `main` to run `.github/workflows/pages.yml`: catalog tests, production
build, browser/export tests, then deployment through GitHub Pages Actions.
Set repository **Settings → Pages → Source → GitHub Actions**. The Vite base is
`/kids-coloring-studio/`; change it and the README URL if renaming the repository.
No server or secrets are needed.
