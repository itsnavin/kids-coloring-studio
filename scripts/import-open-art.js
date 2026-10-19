// Development-only, bounded importer. Never called by the application.
import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const headers = { 'User-Agent': 'LittleLinesStudio/2.0 (https://github.com/itsnavin/kids-coloring-studio; public-domain artwork review)' };
const api = async params => {
  const response = await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ action: 'query', format: 'json', ...params })}`, { headers });
  if (!response.ok) throw new Error(`Commons API: ${response.status}`);
  return response.json();
};
const clean = html => String(html ?? '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
const result = await api({ list: 'categorymembers', cmtitle: 'Category:Prehistoric Life in the National Parks Coloring Book', cmtype: 'file', cmlimit: '100' });
if (result.continue) throw new Error('Collection grew beyond bounded import; review the source first.');
const candidates = result.query.categorymembers.filter(item => /\.(png|jpg)$/i.test(item.title));
const groups = new Map();
for (const item of candidates) {
  const key = item.title.replace(/ \(cropped\)/g, '').replace(/\.(png|jpg)$/i, '').toLowerCase();
  if (!groups.has(key) || item.title.includes('(cropped)')) groups.set(key, item);
}
const records = [];
for (const item of groups.values()) {
  const data = await api({ titles: item.title, prop: 'imageinfo', iiprop: 'url|extmetadata|size|sha1' });
  const info = Object.values(data.query.pages)[0].imageinfo[0];
  const meta = info.extmetadata;
  const categories = meta.Categories?.value ?? '';
  if (meta.LicenseShortName?.value !== 'Public domain' || !categories.includes('PD US NPS')) {
    console.log(`SKIP unverified rights: ${item.title}`);
    continue;
  }
  const id = `nps-${item.pageid}`;
  const name = clean(meta.ObjectName?.value ?? item.title.replace('File:', '')).split(' National ')[0];
  const record = {
    id, name, category: 'nature', kind: 'archive',
    sourceId: String(item.pageid), source: info.descriptionurl,
    originalSource: /https:\/\/npgallery\.nps\.gov\/AssetDetail\/[\w-]+/i.exec(meta.Credit?.value ?? '')?.[0] ?? 'https://www.nps.gov/subjects/fossils/coloring-book.htm',
    author: clean(meta.Artist?.value) || 'National Park Service',
    license: 'PD-USGov-NPS', licenseUrl: 'https://www.nps.gov/aboutus/disclaimer.htm',
    rights: 'Public domain in the United States (U.S. government work). Rights outside the U.S. may differ. No claim to original U.S. Government works.',
    description: clean(meta.ImageDescription?.value) || name,
    originalUrl: info.url, originalSha1: info.sha1,
    checked: '2026-10-20', sourceWidth: info.width, sourceHeight: info.height,
  };
  records.push(record);
}
await mkdir('artifacts', { recursive: true });
await writeFile('artifacts/source-candidates.json', JSON.stringify(records, null, 2));
console.log(`Verified metadata: ${records.length} distinct candidate drawings. Review before acceptance.`);
if (!process.argv.includes('--download')) process.exit(0);
await mkdir('public/art', { recursive: true });
const seen = new Set();
for (const record of records) {
  const response = await fetch(record.originalUrl, { headers });
  if (!response.ok) throw new Error(`${record.id}: download ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 12_000_000) throw new Error(`${record.id}: unexpectedly large source`);
  const sourceHash = createHash('sha256').update(bytes).digest('hex');
  if (seen.has(sourceHash)) throw new Error(`Duplicate original: ${record.id}`);
  seen.add(sourceHash);
  const image = await loadImage(bytes);
  const scale = Math.min(1, 2200 / Math.max(image.width, image.height));
  const canvas = createCanvas(Math.round(image.width * scale), Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  let left = canvas.width, top = canvas.height, right = 0, bottom = 0;
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const i = (y * canvas.width + x) * 4;
    const gray = Math.round((pixels.data[i] + pixels.data[i+1] + pixels.data[i+2]) / 3);
    pixels.data[i] = pixels.data[i+1] = pixels.data[i+2] = gray > 220 ? 255 : gray;
    if (gray < 180) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  context.putImageData(pixels, 0, 0);
  if (right <= left || bottom <= top) throw new Error(`Blank source: ${record.id}`);
  const output = createCanvas(right - left + 41, bottom - top + 41);
  const out = output.getContext('2d');
  out.fillStyle = 'white'; out.fillRect(0, 0, output.width, output.height);
  out.drawImage(canvas, left, top, right-left+1, bottom-top+1, 20, 20, right-left+1, bottom-top+1);
  const png = output.toBuffer('image/png');
  record.sha256 = createHash('sha256').update(png).digest('hex');
  record.sourceSha256 = sourceHash;
  record.width = output.width; record.height = output.height;
  record.asset = `art/${record.id}.png`;
  record.modifications = 'Converted to grayscale, whitened near-white paper, trimmed whitespace; no added artwork.';
  await writeFile(`public/${record.asset}`, png);
  const thumb = createCanvas(300, Math.round(300 * output.height / output.width));
  thumb.getContext('2d').drawImage(output, 0, 0, thumb.width, thumb.height);
  record.thumbnail = `art/${record.id}-thumb.png`;
  await writeFile(`public/${record.thumbnail}`, thumb.toBuffer('image/png'));
  console.log(`Downloaded ${record.id}: ${output.width}x${output.height}, ${Math.round(png.length / 1024)} KB`);
  await new Promise(resolve => setTimeout(resolve, 300));
}
await writeFile('src/open-art.json', JSON.stringify(records, null, 2) + '\n');
