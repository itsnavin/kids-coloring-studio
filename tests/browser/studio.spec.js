import { test, expect } from '@playwright/test';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from '@napi-rs/canvas';
import AxeBuilder from '@axe-core/playwright';
import { designs } from '../../src/art.js';

const artifacts = 'artifacts';
const downloads = `${artifacts}/downloads`;
test.beforeAll(async () => { await mkdir(downloads, { recursive: true }); });

async function download(page, format, filename) {
  const received = page.waitForEvent('download');
  await page.locator(`#download-${format}`).click();
  const file = await received;
  expect(file.suggestedFilename()).toMatch(new RegExp(`\\.(${format})$`));
  expect(await file.failure()).toBeNull();
  const path = `${downloads}/${filename}`;
  await file.saveAs(path);
  await expect(page.locator('#export-status')).toContainText(`${format.toUpperCase()} ready`);
  return readFile(path);
}

async function pngMetrics(page, bytes) {
  return page.evaluate(async data => {
    const image = new Image();
    image.src = `data:image/png;base64,${data}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, image.width, image.height).data;
    let minX = image.width, minY = image.height, maxX = 0, maxY = 0, dark = 0, transparent = 0, colored = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i + 3] !== 255) transparent++;
      if (Math.max(pixels[i], pixels[i+1], pixels[i+2]) - Math.min(pixels[i], pixels[i+1], pixels[i+2]) > 2) colored++;
      if (pixels[i] < 180) {
        const x = (i / 4) % image.width, y = Math.floor(i / 4 / image.width);
        minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); dark++;
      }
    }
    return { width: image.width, height: image.height, minX, minY, maxX, maxY, dark, transparent, colored };
  }, bytes.toString('base64'));
}

test('all original drawings, detail levels, A4 PDF/PNG/SVG downloads and visual sheets', async ({ page, baseURL }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 1440, height: 1100 });
  const errors = [];
  const external = [];
  const environmentRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    const url = request.url();
    if (url.startsWith('http') && new URL(url).origin !== new URL(baseURL).origin) {
      // Some Windows hosts inject AdGuard scripts. Record these separately;
      // they are not referenced by this application's source or bundle.
      if (new URL(url).hostname === 'local.adguard.org') environmentRequests.push('local.adguard.org');
      else external.push(url);
    }
  });
  await page.goto('./');
  await expect(page.locator('.design-card')).toHaveCount(12);
  await page.screenshot({ path: `${artifacts}/desktop.png`, fullPage: true });
  const sheets = { simple: [], detailed: [], pdf: [] };
  for (let index = 0; index < designs.length; index++) {
    const design = designs[index];
    await page.locator(`[data-design="${design.id}"]`).click();
    for (const detail of ['simple', 'detailed']) {
      await page.locator(`[data-detail="${detail}"]`).click();
      await page.locator('#line-weight').fill(detail === 'simple' ? '5' : '8');
      const orientation = index % 2 ? 'landscape' : 'portrait';
      await page.locator('#orientation').selectOption(orientation);
      const bounds = await page.locator('#preview svg svg > g').evaluate(group => {
        const box = group.getBBox();
        return { x: box.x, y: box.y, right: box.x + box.width, bottom: box.y + box.height,
          lengths: [...group.querySelectorAll('path')].map(path => path.getTotalLength()) };
      });
      expect(bounds.x).toBeGreaterThan(30);
      expect(bounds.y).toBeGreaterThan(30);
      expect(bounds.right).toBeLessThan(570);
      expect(bounds.bottom).toBeLessThan(570);
      const [frameX, frameY, frameWidth, frameHeight] = design.frame;
      expect(bounds.x - 4).toBeGreaterThan(frameX);
      expect(bounds.y - 4).toBeGreaterThan(frameY);
      expect(bounds.right + 4).toBeLessThan(frameX + frameWidth);
      expect(bounds.bottom + 4).toBeLessThan(frameY + frameHeight);
      expect(bounds.lengths.every(length => Number.isFinite(length) && length > 0)).toBe(true);
      const bytes = await download(page, 'png', `${design.id}-${detail}.png`);
      sheets[detail].push({ name: design.name, image: bytes.toString('base64'), orientation });
      const metrics = await pngMetrics(page, bytes);
      expect(metrics.width).toBe(orientation === 'portrait' ? 2480 : 3508);
      expect(metrics.height).toBe(orientation === 'portrait' ? 3508 : 2480);
      expect(metrics.transparent).toBe(0);
      expect(metrics.colored).toBe(0);
      expect(metrics.dark).toBeGreaterThan(25_000);
      expect(Math.max(metrics.maxX - metrics.minX, metrics.maxY - metrics.minY))
        .toBeGreaterThan(Math.min(metrics.width, metrics.height) * 0.6);
      expect(metrics.minX).toBeGreaterThan(130);
      expect(metrics.minY).toBeGreaterThan(130);
      expect(metrics.maxX).toBeLessThan(metrics.width - 130);
      expect(metrics.maxY).toBeLessThan(metrics.height - 130);
      if (detail === 'detailed') {
        const pdfBytes = await download(page, 'pdf', `${design.id}.pdf`);
        const loading = getDocument({ data: new Uint8Array(pdfBytes), isEvalSupported: false });
        const document = await loading.promise;
        expect(document.numPages).toBe(1);
        const pdfPage = await document.getPage(1);
        const [, , width, height] = pdfPage.view;
        expect(width).toBeCloseTo((orientation === 'portrait' ? 210 : 297) * 72 / 25.4, 2);
        expect(height).toBeCloseTo((orientation === 'portrait' ? 297 : 210) * 72 / 25.4, 2);
        const ops = await pdfPage.getOperatorList();
        const images = ops.fnArray.map((op, i) => op === OPS.paintImageXObject ? ops.argsArray[i] : null).filter(Boolean);
        expect(images).toHaveLength(1);
        expect(images[0].slice(1)).toEqual([metrics.width, metrics.height]);
        const image = pdfPage.objs.get(images[0][0]);
        expect(image.width).toBe(metrics.width);
        expect(image.height).toBe(metrics.height);
        const viewport = pdfPage.getViewport({ scale: 1.2 });
        const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
        await pdfPage.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
        const rendered = canvas.toBuffer('image/png');
        await writeFile(`${downloads}/${design.id}-pdf-render.png`, rendered);
        sheets.pdf.push({ name: design.name, image: rendered.toString('base64'), orientation });
        await loading.destroy();
      }
    }
  }
  await page.locator('#mirror').check();
  await page.locator('#show-title').uncheck();
  const source = await page.locator('#preview').innerHTML();
  const svg = await download(page, 'svg', 'mirrored-no-title.svg');
  // Browser serialization may normalize quotes/namespaces; compare parsed content.
  const consistent = await page.evaluate(({ exported, preview }) => {
    const parser = new DOMParser();
    const a = parser.parseFromString(exported, 'image/svg+xml');
    const b = parser.parseFromString(preview, 'image/svg+xml');
    return a.documentElement.isEqualNode(b.documentElement);
  }, { exported: svg.toString(), preview: source });
  expect(consistent).toBe(true);
  expect(svg.toString()).toContain('translate(600 0) scale(-1 1)');
  expect(svg.toString()).not.toContain('<text');
  expect(errors).toEqual([]);
  expect(external).toEqual([]);
  // Contact sheets use actual exported files, not a second drawing implementation.
  for (const [detail, entries] of Object.entries(sheets)) {
    const sheet = await page.context().newPage();
    await sheet.setViewportSize({ width: 1440, height: 1600 });
    const html = `<html lang="en"><title>${detail} artwork inspection</title><style>body{font:18px Arial;background:#eee;margin:20px}h1{font-size:24px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}figure{background:white;margin:0;border:1px solid #bbb;padding:8px}img{width:100%;height:330px;object-fit:contain}figcaption{text-align:center;font-size:15px;padding:8px}</style><h1>Little Lines — ${detail} · actual A4 PNG exports</h1><div class="grid">${entries.map(entry => `<figure><img alt="${entry.name}" src="data:image/png;base64,${entry.image}"><figcaption>${entry.name} · ${entry.orientation}</figcaption></figure>`).join('')}</div></html>`;
    await sheet.setContent(html);
    await sheet.locator('img').evaluateAll(images => Promise.all(images.map(image => image.decode())));
    await sheet.screenshot({ path: `${artifacts}/all-${detail}.png`, fullPage: true });
    await sheet.close();
  }
  await writeFile(`${artifacts}/export-summary.json`, JSON.stringify({ designs: 12, png: 24, pdf: 12, svg: 1, errors, external, environmentRequests }, null, 2));
});

test('mobile, categories, keyboard settings and visible feedback', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  const accessibility = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  for (const category of ['birds', 'animals', 'dinosaurs', 'houses', 'technology', 'heroes']) {
    await page.locator(`[data-category="${category}"]`).click();
    await expect(page.locator('.design-card')).toHaveCount(2);
    await expect(page.locator(`[data-category="${category}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('.design-card[aria-pressed=true]')).toHaveCount(1);
  }
  await page.locator('[data-design="little-explorer"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#selected-name')).toHaveText('Little explorer');
  await page.locator('[data-detail="detailed"]').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[data-detail="detailed"]')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#line-weight').focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#weight-value')).toHaveText('6');
  await page.locator('#mirror').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#mirror')).toBeChecked();
  await expect(page.locator('#preview')).toHaveAttribute('aria-label', /mirrored/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ path: `${artifacts}/mobile.png`, fullPage: true });
  await page.locator('#orientation').selectOption('landscape');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await download(page, 'pdf', 'mobile-landscape.pdf');
});

test('changing settings cancels stale exports and export failures are explicit', async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => {
    window.originalDecode = HTMLImageElement.prototype.decode;
    HTMLImageElement.prototype.decode = async function () {
      await new Promise(resolve => setTimeout(resolve, 400));
      return window.originalDecode.call(this);
    };
  });
  let received = 0;
  page.on('download', () => { received++; });
  await page.locator('#download-png').click();
  await page.locator('#line-weight').fill('8');
  await expect(page.locator('#export-status')).toContainText('This download was canceled');
  expect(received).toBe(0);
  await expect(page.locator('#download-png')).toBeEnabled();
  await page.evaluate(() => {
    HTMLImageElement.prototype.decode = window.originalDecode;
    window.originalContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = () => null;
  });
  await page.locator('#download-png').click();
  await expect(page.locator('#export-status')).toContainText('Could not create the PNG');
  await expect(page.locator('#export-status')).toHaveClass('error');
  await expect(page.locator('#download-pdf')).toBeEnabled();
  await page.evaluate(() => { HTMLCanvasElement.prototype.getContext = window.originalContext; });
  await download(page, 'svg', 'recovered.svg');
});
