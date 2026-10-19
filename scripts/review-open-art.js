import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createCanvas, loadImage } from '@napi-rs/canvas';

const records = JSON.parse(await readFile('src/open-art.json', 'utf8'));
await mkdir('artifacts', { recursive: true });
const hashes = [];
for (let offset = 0; offset < records.length; offset += 10) {
  const canvas = createCanvas(1500, 1150);
  const context = canvas.getContext('2d');
  context.fillStyle = '#e8e8e8'; context.fillRect(0, 0, 1500, 1150);
  for (let i = offset; i < Math.min(records.length, offset + 10); i++) {
    const record = records[i];
    const image = await loadImage(`public/${record.asset}`);
    const x = ((i - offset) % 5) * 300, y = Math.floor((i - offset) / 5) * 575;
    context.fillStyle = 'white'; context.fillRect(x + 5, y + 5, 290, 565);
    const scale = Math.min(275 / image.width, 480 / image.height);
    context.drawImage(image, x + 150 - image.width*scale/2, y + 240 - image.height*scale/2, image.width*scale, image.height*scale);
    context.fillStyle = 'black'; context.font = '14px sans-serif';
    context.fillText(record.id, x + 12, y + 512);
    context.fillText(record.name.slice(0, 35), x + 12, y + 537);
    const tiny = createCanvas(32, 32), tc = tiny.getContext('2d');
    tc.drawImage(image, 0, 0, 32, 32);
    const pixels = tc.getImageData(0, 0, 32, 32).data;
    hashes.push({ id: record.id, values: Array.from({length:1024}, (_, j) => pixels[j*4]) });
  }
  await writeFile(`artifacts/open-art-${offset / 10 + 1}.png`, canvas.toBuffer('image/png'));
}
for (let i = 0; i < hashes.length; i++) for (let j = 0; j < i; j++) {
  const difference = hashes[i].values.reduce((sum, value, k) => sum + Math.abs(value - hashes[j].values[k]), 0) / 1024;
  if (difference < 10) console.log(`Review similar composition: ${hashes[i].id} / ${hashes[j].id} (${difference.toFixed(2)})`);
}
