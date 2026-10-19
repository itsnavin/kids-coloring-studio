import { test, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createCanvas } from '@napi-rs/canvas';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import AxeBuilder from '@axe-core/playwright';
const archive=JSON.parse(await readFile('src/open-art.json','utf8'));

test.beforeAll(async()=>{await mkdir('artifacts/expanded',{recursive:true});});
async function save(page,format,name) {
  const received=page.waitForEvent('download');
  await page.locator(`#download-${format}`).click();
  const download=await received;
  expect(await download.failure()).toBeNull();
  const path=`artifacts/expanded/${name}.${format}`;await download.saveAs(path);
  return readFile(path);
}
function syntheticPhoto() {
  const c=createCanvas(900,650),ctx=c.getContext('2d');
  const bg=ctx.createLinearGradient(0,0,900,650);bg.addColorStop(0,'#ebe7df');bg.addColorStop(1,'#b5c1ba');
  ctx.fillStyle=bg;ctx.fillRect(0,0,900,650);
  ctx.fillStyle='#bbb4a2';ctx.fillRect(0,485,900,165);
  ctx.fillStyle='#787d73';ctx.beginPath();ctx.ellipse(455,510,280,32,0,0,Math.PI*2);ctx.fill();
  const body=ctx.createLinearGradient(200,250,650,500);body.addColorStop(0,'#ce6f40');body.addColorStop(1,'#7a3029');
  ctx.fillStyle=body;ctx.beginPath();ctx.roundRect(200,280,490,180,45);ctx.fill();
  ctx.beginPath();ctx.moveTo(290,280);ctx.lineTo(355,175);ctx.lineTo(540,175);ctx.lineTo(620,280);ctx.closePath();ctx.fill();
  ctx.fillStyle='#a0c2c9';ctx.beginPath();ctx.moveTo(325,265);ctx.lineTo(369,195);ctx.lineTo(439,195);ctx.lineTo(439,265);ctx.closePath();ctx.fill();
  ctx.beginPath();ctx.moveTo(462,265);ctx.lineTo(462,195);ctx.lineTo(527,195);ctx.lineTo(581,265);ctx.closePath();ctx.fill();
  ctx.strokeStyle='#542b28';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(450,280);ctx.lineTo(450,418);ctx.stroke();
  for(const x of [310,590]) {
    ctx.fillStyle='#303b3b';ctx.beginPath();ctx.arc(x,455,64,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#c0c5bb';ctx.beginPath();ctx.arc(x,455,33,0,Math.PI*2);ctx.fill();
  }
  ctx.fillStyle='#f3dd9c';ctx.fillRect(647,315,32,38);ctx.fillStyle='#4b2d28';ctx.fillRect(477,311,35,10);
  return c.toBuffer('image/png');
}

test('all 22 real archive pages load and export with attribution and no remote artwork requests',async({page,baseURL})=>{
  test.setTimeout(240_000);
  const errors=[],external=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',r=>{if(r.url().startsWith('http')&&new URL(r.url()).origin!==new URL(baseURL).origin&&new URL(r.url()).hostname!=='local.adguard.org')external.push(r.url());});
  await page.goto('./');
  await page.locator('[data-category=nature]').click();
  const accessibility=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
  expect(accessibility.violations).toEqual([]);
  await expect(page.locator('#design-count')).toHaveText('22 designs');
  await expect(page.locator('.design-card')).toHaveCount(12);
  const sheets=[],pdfSheets=[];
  for(let i=0;i<archive.length;i++) {
    const record=archive[i];
    if(i===12)await page.locator('#next-page').click();
    await page.locator(`[data-design="${record.id}"]`).click();
    await expect(page.locator('#download-png')).toBeEnabled();
    await expect(page.locator('#image-status')).toContainText(/ready|lot of ink/);
    await expect(page.locator('#art-credit')).toContainText('Public domain in the United States');
    await expect(page.locator('#art-credit a').first()).toHaveAttribute('href',record.source);
    await expect(page.locator('#detail-field')).toBeHidden();
    await expect(page.locator('#svg-kind')).toHaveText('Embedded raster');
    await page.locator('#line-weight').fill('8');
    await expect(page.locator('#download-png')).toBeEnabled();
    await page.locator('#orientation').selectOption(i%2?'landscape':'portrait');
    const png=await save(page,'png',record.id);
    sheets.push({name:record.name,png:png.toString('base64')});
    const svg=await save(page,'svg',record.id);
    expect(svg.toString()).toContain(record.sourceId);
    expect(svg.toString()).toContain('data:image/png;base64,');
    expect(svg.toString()).toContain(record.source.replaceAll('&','&amp;'));
    const pdf=await save(page,'pdf',record.id);
    const loading=getDocument({data:new Uint8Array(pdf),isEvalSupported:false}),document=await loading.promise;
    const p=await document.getPage(1),[,,w,h]=p.view;
    expect(w).toBeCloseTo((i%2?297:210)*72/25.4,2);expect(h).toBeCloseTo((i%2?210:297)*72/25.4,2);
    const metadata=await document.getMetadata();
    expect(metadata.info.Subject).toContain(record.source);
    const viewport=p.getViewport({scale:.7}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
    await p.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
    const rendered=canvas.toBuffer('image/png');
    await writeFile(`artifacts/expanded/${record.id}-pdf.png`,rendered);
    pdfSheets.push({name:record.name,png:rendered.toString('base64')});
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let dark=0;
    for(let k=0;k<pixels.length;k+=4)if(pixels[k]<100)dark++;
    expect(dark).toBeGreaterThan(500);
    expect(pixels[0]).toBe(255);
    const margins=await page.locator('#preview image').evaluate(image=>{
      const root=image.ownerSVGElement.viewBox.baseVal;
      return {x:Number(image.getAttribute('x')),y:Number(image.getAttribute('y')),
        right:Number(image.getAttribute('x'))+Number(image.getAttribute('width')),
        bottom:Number(image.getAttribute('y'))+Number(image.getAttribute('height')),
        width:root.width,height:root.height};
    });
    expect(margins.x).toBeGreaterThanOrEqual(55);expect(margins.y).toBeGreaterThanOrEqual(94);
    expect(margins.right).toBeLessThanOrEqual(margins.width-55);
    expect(margins.bottom).toBeLessThanOrEqual(margins.height-94);
    await loading.destroy();
  }
  for(const [kind,entries] of [['png',sheets],['pdf',pdfSheets]])for(let offset=0;offset<entries.length;offset+=8){
    const sheet=await page.context().newPage();await sheet.setViewportSize({width:1400,height:1200});
    await sheet.setContent(`<style>body{font:16px Arial;background:#eee}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}figure{margin:0;background:white;padding:8px}img{width:100%;height:430px;object-fit:contain}figcaption{text-align:center}</style><h1>Realistic gallery A4 ${kind.toUpperCase()} exports · maximum line weight</h1><div class="grid">${entries.slice(offset,offset+8).map(r=>`<figure><img src="data:image/png;base64,${r.png}"><figcaption>${r.name}</figcaption></figure>`).join('')}</div>`);
    await sheet.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    await sheet.screenshot({path:`artifacts/expanded/archive-${kind}-sheet-${offset/8+1}.png`,fullPage:true});await sheet.close();
  }
  expect(errors).toEqual([]);expect(external).toEqual([]);
  await page.locator('#gallery-search').fill('stingray');
  await expect(page.locator('.design-card')).toHaveCount(1);
  await page.locator('#gallery-search').fill('no-such-picture');
  await expect(page.locator('#gallery-empty')).toBeVisible();
});

test('textured synthetic still-life tuning and large-photo bounding',async({page})=>{
  await page.goto('./');await page.locator('#photo-mode').click();
  const canvas=createCanvas(1800,1400),ctx=canvas.getContext('2d');
  ctx.fillStyle='#ddd6bf';ctx.fillRect(0,0,1800,1400);
  // A shaded ceramic vase and leaves: synthetic input, never a real person's photo.
  const shade=ctx.createLinearGradient(550,500,1150,1050);shade.addColorStop(0,'#a1c4a5');shade.addColorStop(.5,'#e8e9cf');shade.addColorStop(1,'#537960');
  ctx.fillStyle=shade;ctx.beginPath();ctx.moveTo(700,600);ctx.lineTo(1100,600);ctx.bezierCurveTo(1050,800,1250,1100,1050,1200);ctx.lineTo(750,1200);ctx.bezierCurveTo(550,1100,750,800,700,600);ctx.fill();
  ctx.strokeStyle='#4a7550';ctx.lineWidth=20;ctx.beginPath();ctx.moveTo(900,600);ctx.lineTo(900,220);ctx.stroke();
  ctx.fillStyle='#679052';for(const [x,y,rot] of [[800,310,-.5],[1010,390,.5],[790,480,-.6]]){ctx.beginPath();ctx.ellipse(x,y,150,55,rot,0,Math.PI*2);ctx.fill();}
  const pixels=ctx.getImageData(0,0,1800,1400);
  for(let i=0;i<pixels.data.length;i+=4){const noise=((i*71)%31)-15;for(let j=0;j<3;j++)pixels.data[i+j]=Math.max(0,Math.min(255,pixels.data[i+j]+noise));}
  ctx.putImageData(pixels,0,0);
  await writeFile('artifacts/expanded/synthetic-textured-vase.png',canvas.toBuffer('image/png'));
  await page.locator('#photo-file').setInputFiles({name:'vase.png',mimeType:'image/png',buffer:canvas.toBuffer('image/png')});
  await expect(page.locator('#download-png')).toBeEnabled();
  const before=await page.locator('#preview image').getAttribute('href');
  await page.locator('#smoothing').fill('5');await page.locator('#edge-threshold').fill('10');
  await page.locator('[data-detail=detailed]').click();
  await expect(page.locator('#download-png')).toBeEnabled();
  const after=await page.locator('#preview image').getAttribute('href');
  expect(after).not.toBe(before);
  const size=await page.evaluate(async()=>{
    const image=new Image();image.src=document.querySelector('#preview image').getAttribute('href');await image.decode();
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,c.width,c.height).data;let dark=0;
    for(let i=0;i<data.length;i+=4)if(data[i]===0)dark++;
    return {width:c.width,height:c.height,coverage:dark/(c.width*c.height)};
  });
  expect(size.width).toBe(1280);expect(size.height).toBe(Math.round(1400*1280/1800));
  expect(size.coverage).toBeGreaterThan(.001);expect(size.coverage).toBeLessThan(.2);
  await save(page,'png','photo-vase');
  await page.screenshot({path:'artifacts/expanded/photo-vase-desktop.png',fullPage:true});
});

test('local photo workflow, real tuning, aspect ratio, clear, formats and mobile keyboard',async({page})=>{
  await page.setViewportSize({width:390,height:844});await page.goto('./');
  await page.locator('#photo-mode').focus();await page.keyboard.press('Enter');
  await expect(page.locator('#photo-tools')).toBeVisible();
  const violations=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();expect(violations.violations).toEqual([]);
  const requests=[];page.on('request',r=>{if(r.method()!=='GET')requests.push(r.url());});
  const input=syntheticPhoto();await writeFile('artifacts/expanded/synthetic-toy-car.png',input);
  await page.locator('#photo-file').setInputFiles({name:'private-name-never-displayed.png',mimeType:'image/png',buffer:input});
  await expect(page.locator('#image-status')).toContainText('Outline ready');
  await expect(page.locator('#download-png')).toBeEnabled();
  const href=await page.locator('#preview image').getAttribute('href');
  const size=await page.locator('#preview image').evaluate(image=>({w:Number(image.getAttribute('width')),h:Number(image.getAttribute('height'))}));
  expect(size.w/size.h).toBeCloseTo(900/650,4);
  await page.locator('#edge-threshold').fill('70');await expect(page.locator('#download-png')).toBeEnabled();
  expect(await page.locator('#preview image').getAttribute('href')).not.toBe(href);
  await page.locator('#edge-threshold').fill('25');
  await page.locator('#smoothing').fill('1');
  await page.locator('#cleanup').fill('20');
  await page.locator('[data-detail=detailed]').click();
  await expect(page.locator('#download-png')).toBeEnabled();
  await page.screenshot({path:'artifacts/expanded/photo-mobile.png',fullPage:true});
  await save(page,'png','photo-car');
  await page.locator('#orientation').selectOption('landscape');await page.locator('#mirror').check();
  const svg=await save(page,'svg','photo-car');
  expect(svg.toString()).toContain('not vector paths');expect(svg.toString()).toContain('scale(-1 1)');
  expect(svg.toString()).not.toContain('private-name');
  const pdf=await save(page,'pdf','photo-car');
  const loading=getDocument({data:new Uint8Array(pdf),isEvalSupported:false}),doc=await loading.promise;
  const p=await doc.getPage(1);expect(p.view[2]).toBeCloseTo(297*72/25.4,2);
  const viewport=p.getViewport({scale:1}),canvas=createCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));
  await p.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;
  await writeFile('artifacts/expanded/photo-car-pdf.png',canvas.toBuffer('image/png'));await loading.destroy();
  expect(requests).toEqual([]);
  await page.locator('#clear-photo').click();
  await expect(page.locator('#photo-tools')).toBeHidden();await expect(page.locator('#preview image')).toHaveCount(0);
  await page.locator('#photo-mode').click();
  await page.locator('#photo-file').setInputFiles({name:'invalid.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg/>')});
  await expect(page.locator('#image-status')).toContainText('Choose a valid JPEG or PNG');
  await expect(page.locator('#download-png')).toBeDisabled();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
});

test('oversized inputs, stale processing, EXIF orientation once and source failure',async({page})=>{
  await page.goto('./');await page.locator('#photo-mode').click();
  const photo=syntheticPhoto();
  const oversized=Buffer.from(photo);oversized.writeUInt32BE(100000,16);
  await page.locator('#photo-file').setInputFiles({name:'oversized.png',mimeType:'image/png',buffer:oversized});
  await expect(page.locator('#image-status')).toContainText('16 megapixels');
  const canvas=createCanvas(240,100),ctx=canvas.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,240,100);ctx.fillStyle='black';ctx.fillRect(20,20,150,60);
  const jpeg=canvas.toBuffer('image/jpeg');
  const exif=Buffer.from([0xff,0xe1,0,34,0x45,0x78,0x69,0x66,0,0,0x49,0x49,0x2a,0,8,0,0,0,1,0,0x12,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
  await page.locator('#photo-file').setInputFiles({name:'rotated.jpg',mimeType:'image/jpeg',buffer:Buffer.concat([jpeg.subarray(0,2),exif,jpeg.subarray(2)])});
  await expect(page.locator('#download-png')).toBeEnabled();
  const ratio=await page.locator('#preview image').evaluate(i=>Number(i.getAttribute('width'))/Number(i.getAttribute('height')));
  expect(ratio).toBeCloseTo(100/240,4);
  await page.locator('#photo-file').setInputFiles({name:'car.png',mimeType:'image/png',buffer:photo});
  await page.locator('#edge-threshold').fill('90');
  await page.locator('#clear-photo').click();
  await expect(page.locator('#selected-name')).toHaveText('Garden songbird');
  await expect(page.locator('#preview image')).toHaveCount(0);
  await page.route('**/art/nps-196860634.png',route=>route.fulfill({status:404,body:'Missing'}));
  await page.locator('[data-category=nature]').click();
  await expect(page.locator('#image-status')).toContainText('Artwork is unavailable (404)');
  await expect(page.locator('#download-pdf')).toBeDisabled();
  await page.unroute('**/art/nps-196860634.png');
  await page.locator('[data-design=nps-196860634]').click();
  await expect(page.locator('#download-pdf')).toBeEnabled();
});
