import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { imageDimensions, processPixels, MAX_EDGE } from '../src/image-processing.js';

const archive = JSON.parse(await readFile('src/open-art.json', 'utf8'));
test('all 22 actual archive assets have verified provenance, distinct hashes and printable image content', async () => {
  assert.equal(archive.length, 22);
  for (const key of ['id', 'sourceId', 'sha256', 'sourceSha256', 'originalSha1']) assert.equal(new Set(archive.map(record => record[key])).size, archive.length);
  const files = await readdir('public/art');
  assert.equal(files.length, archive.length*2);
  let bytes = 0;
  for (const record of archive) {
    assert.equal(record.license, 'PD-USGov-NPS');
    assert.match(record.rights, /United States.*outside/);
    assert.ok(record.author);
    assert.ok(record.review);
    assert.match(record.source, /^https:\/\/commons.wikimedia.org\/wiki\/File:/);
    assert.match(record.originalSource, /^https:\/\/(npgallery|www)\.nps\.gov\//);
    assert.match(record.asset, /^art\/nps-\d+\.png$/);
    assert.equal(record.checked, '2026-10-20');
    const buffer=await readFile(`public/${record.asset}`);
    assert.equal(createHash('sha256').update(buffer).digest('hex'),record.sha256);
    bytes+=buffer.length;
    const image=await loadImage(buffer);
    assert.equal(image.width,record.width);assert.equal(image.height,record.height);
    assert.ok(image.width>1000 && image.height>700);
    const canvas=createCanvas(image.width,image.height), ctx=canvas.getContext('2d');
    ctx.drawImage(image,0,0);
    const data=ctx.getImageData(0,0,image.width,image.height).data;
    let dark=0, white=0;
    for(let i=0;i<data.length;i+=4) {
      assert.equal(data[i+3],255);
      assert.equal(data[i],data[i+1]); assert.equal(data[i],data[i+2]);
      if(data[i]<180) dark++; if(data[i]===255) white++;
    }
    assert.ok(dark/(image.width*image.height)>.002,record.id);
    assert.ok(dark/(image.width*image.height)<.25,record.id);
    assert.ok(white/(image.width*image.height)>.7,record.id);
    const thumbnail=await loadImage(`public/${record.thumbnail}`);
    assert.equal(thumbnail.width,300);
    assert.ok((await stat(`public/${record.thumbnail}`)).size<150_000);
  }
  assert.ok(bytes<25_000_000);
});

function fixture(noise=false) {
  const width=160,height=120,rgba=new Uint8ClampedArray(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++) {
    const i=(y*width+x)*4;
    const gray=x>35&&x<125&&y>25&&y<95?65:245;
    const n=noise?((x*31+y*53)%47)-23:0;
    rgba[i]=rgba[i+1]=rgba[i+2]=Math.max(0,Math.min(255,gray+n));rgba[i+3]=255;
  }
  return {rgba,width,height};
}
test('photo edges retain empty coloring regions; real tuning changes output and removes texture',()=>{
  const input=fixture();
  const outline=processPixels({...input,smoothing:0,weight:3});
  assert.ok(outline.coverage>.01 && outline.coverage<.1);
  assert.equal(outline.rgba[(60*160+80)*4],255);
  assert.equal(outline.rgba[(25*160+80)*4],0);
  const bold=processPixels({...input,smoothing:0,weight:8});
  assert.ok(bold.coverage>outline.coverage*2);
  const noisy=fixture(true);
  const many=processPixels({...noisy,threshold:5,smoothing:0,weight:3,cleanup:0});
  const smooth=processPixels({...noisy,threshold:5,smoothing:5,weight:3,cleanup:30});
  assert.ok(smooth.coverage<many.coverage*.5);
  const simple=processPixels({...noisy,threshold:20,smoothing:0,detail:'simple',weight:3});
  const detailed=processPixels({...noisy,threshold:20,smoothing:0,detail:'detailed',weight:3});
  assert.ok(detailed.coverage>simple.coverage);
  for(let i=0;i<outline.rgba.length;i+=4) {
    assert.ok([0,255].includes(outline.rgba[i])); assert.equal(outline.rgba[i+3],255);
  }
  assert.throws(()=>processPixels({...input,width:999999}));
  assert.throws(()=>processPixels({...input,smoothing:100}));
  assert.throws(()=>processPixels({...input,threshold:NaN}));
  assert.equal(MAX_EDGE,1280);
  const equalBrightness=fixture();
  for(let y=0;y<120;y++)for(let x=0;x<160;x++){
    const i=(y*160+x)*4,inside=x>35&&x<125&&y>25&&y<95;
    equalBrightness.rgba[i]=inside?255:0;
    equalBrightness.rgba[i+1]=inside?0:130;
    equalBrightness.rgba[i+2]=0;
  }
  assert.ok(processPixels({...equalBrightness,weight:3}).coverage>.01,'Chroma boundaries survive equal luminance');
});

test('photo sniffing rejects unsupported files and oversized decode bombs',()=>{
  const canvas=createCanvas(100,70);
  assert.deepEqual(imageDimensions(canvas.toBuffer('image/png')),[100,70]);
  assert.deepEqual(imageDimensions(canvas.toBuffer('image/jpeg')),[100,70]);
  assert.throws(()=>imageDimensions(new Uint8Array([1,2,3])));
  assert.throws(()=>imageDimensions(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>')));
  const png=canvas.toBuffer('image/png');
  png.writeUInt32BE(100_000,16);
  assert.throws(()=>imageDimensions(png),/16 megapixels/);
  const transparent=fixture();transparent.rgba.fill(0);
  assert.equal(processPixels(transparent).coverage,0);
});
