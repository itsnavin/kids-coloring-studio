# Little Lines · Kids Coloring Studio

A free, static, privacy-friendly coloring studio for parents and children.
Choose from **12 original drawings**: two each of birds, animals, dinosaurs,
houses, technology, and friendly original robot heroes. This is a small curated
collection, not an AI drawing generator. It does not reproduce branded characters.

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
editable vector paths. Choose SVG for vector editing. Downloads happen locally;
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
fonts, storage, cookies, or generative services. Options live only in memory.
The hosting provider (GitHub Pages) receives normal web requests and may retain
server logs under its own privacy policy. The app never asks for children's data.
No service worker is installed; the first visit needs connectivity.

Push `main` to run `.github/workflows/pages.yml`: catalog tests, production
build, browser/export tests, then deployment through GitHub Pages Actions.
Set repository **Settings → Pages → Source → GitHub Actions**. The Vite base is
`/kids-coloring-studio/`; change it and the README URL if renaming the repository.
No server or secrets are needed.
