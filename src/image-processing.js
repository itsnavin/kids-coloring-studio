export const MAX_EDGE = 1280;
export const MAX_PIXELS = 16_000_000;
export const MAX_FILE_BYTES = 10_000_000;

export function imageDimensions(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let dimensions;
  if (bytes.length >= 24 && view.getUint32(0) === 0x89504e47 && view.getUint32(4) === 0x0d0a1a0a &&
      view.getUint32(12) === 0x49484452) {
    dimensions = [view.getUint32(16), view.getUint32(20)];
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 255) throw new Error('Invalid JPEG marker.');
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      const size = view.getUint16(offset);
      if (size < 2 || offset + size > bytes.length) throw new Error('Truncated JPEG.');
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) {
        if (size < 8) throw new Error('Invalid JPEG dimensions.');
        dimensions = [view.getUint16(offset + 5), view.getUint16(offset + 3)];
        break;
      }
      offset += size;
    }
  }
  if (!dimensions) throw new Error('Choose a valid JPEG or PNG. HEIC, GIF, WebP and SVG are not supported.');
  const [width, height] = dimensions;
  if (width < 32 || height < 32 || width > 8000 || height > 8000 || width * height > MAX_PIXELS) {
    throw new Error('Use an image at least 32 × 32 pixels, no larger than 16 megapixels or 8000 pixels per side.');
  }
  return dimensions;
}

export function boxBlur(input, width, height, radius) {
  if (radius === 0) return input;
  const temp = new Float32Array(input.length), output = new Float32Array(input.length);
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += input[y*width + Math.max(0, Math.min(width-1, x))];
    for (let x = 0; x < width; x++) {
      temp[y*width+x] = sum / (2*radius+1);
      sum += input[y*width+Math.min(width-1, x+radius+1)] - input[y*width+Math.max(0,x-radius)];
    }
  }
  for (let x = 0; x < width; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += temp[Math.max(0,Math.min(height-1,y))*width+x];
    for (let y = 0; y < height; y++) {
      output[y*width+x] = sum / (2*radius+1);
      sum += temp[Math.min(height-1,y+radius+1)*width+x] - temp[Math.max(0,y-radius)*width+x];
    }
  }
  return output;
}

function removeSpecks(mask, width, height, minimum) {
  const visited = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || visited[start]) continue;
    let head = 0, end = 1;
    queue[0] = start; visited[start] = 1;
    while (head < end) {
      const i = queue[head++], x = i % width, y = Math.floor(i / width);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x+dx, ny = y+dy, n = ny*width+nx;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[n] && !visited[n]) {
          visited[n] = 1; queue[end++] = n;
        }
      }
    }
    if (end < minimum) for (let j = 0; j < end; j++) mask[queue[j]] = 0;
  }
}

export function processPixels({ rgba, width, height, mode = 'photo', threshold = 35, smoothing = 2, cleanup = 14, weight = 5, detail = 'simple' }) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width > 2240 || height > 2240 || width*height > 5_000_000 || rgba.length !== width*height*4) throw new Error('Invalid processing dimensions.');
  if (!['photo','archive'].includes(mode) || !['simple','detailed'].includes(detail) ||
      !Number.isInteger(smoothing) || smoothing < 0 || smoothing > 5 ||
      !Number.isInteger(cleanup) || cleanup < 0 || cleanup > 60 ||
      !Number.isFinite(threshold) || threshold < 5 || threshold > 100 ||
      !Number.isInteger(weight) || weight < 3 || weight > 8) throw new Error('Invalid outline settings.');
  let gray = new Float32Array(width*height);
  let redGreen = mode === 'photo' ? new Float32Array(width*height) : null;
  let blueGreen = mode === 'photo' ? new Float32Array(width*height) : null;
  for (let i = 0; i < gray.length; i++) {
    const p = i*4, alpha = rgba[p+3] / 255;
    gray[i] = (rgba[p]*.299 + rgba[p+1]*.587 + rgba[p+2]*.114)*alpha + 255*(1-alpha);
    if (mode === 'photo') {
      redGreen[i] = (rgba[p]-rgba[p+1])*alpha;
      blueGreen[i] = (rgba[p+2]-rgba[p+1])*alpha;
    }
  }
  const mask = new Uint8Array(width*height);
  if (mode === 'archive') {
    for (let i = 0; i < gray.length; i++) mask[i] = gray[i] < 205 ? 1 : 0;
  } else {
    gray = boxBlur(gray, width, height, smoothing);
    redGreen = boxBlur(redGreen, width, height, smoothing);
    blueGreen = boxBlur(blueGreen, width, height, smoothing);
    const cutoff = threshold * (detail === 'detailed' ? .65 : 1);
    const channels = [gray, redGreen, blueGreen];
    for (let y = 1; y < height-1; y++) for (let x = 1; x < width-1; x++) {
      const i = y*width+x;
      let strength = 0;
      // Chroma contours preserve boundaries between similarly bright colors.
      for (const channel of channels) {
        const gx = -channel[i-width-1]+channel[i-width+1]-2*channel[i-1]+2*channel[i+1]-channel[i+width-1]+channel[i+width+1];
        const gy = -channel[i-width-1]-2*channel[i-width]-channel[i-width+1]+channel[i+width-1]+2*channel[i+width]+channel[i+width+1];
        strength = Math.max(strength, Math.hypot(gx,gy)/4);
      }
      mask[i] = strength >= cutoff ? 2 : strength >= cutoff*.35 ? 1 : 0;
    }
    // Keep weak edges only when connected to a stronger contour.
    const connected = new Uint8Array(mask.length), queue = new Int32Array(mask.length);
    let head = 0, end = 0;
    for (let i = 0; i < mask.length; i++) if (mask[i] === 2) { connected[i]=1; queue[end++]=i; }
    while (head < end) {
      const i=queue[head++], x=i%width, y=Math.floor(i/width);
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) {
        const nx=x+dx, ny=y+dy, n=ny*width+nx;
        if(nx>=0 && nx<width && ny>=0 && ny<height && mask[n] && !connected[n]) {
          connected[n]=1; queue[end++]=n;
        }
      }
    }
    mask.set(connected);
    if (cleanup) removeSpecks(mask, width, height, cleanup);
  }
  const radius = Math.floor((weight-3)/2);
  const result = new Uint8ClampedArray(width*height*4);
  let dark = 0;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    let ink = false;
    for (let dy = -radius; dy <= radius && !ink; dy++) for (let dx = -radius; dx <= radius; dx++) {
      if (dx*dx+dy*dy > radius*radius) continue;
      const nx=x+dx, ny=y+dy;
      if (nx>=0 && nx<width && ny>=0 && ny<height && mask[ny*width+nx]) { ink=true; break; }
    }
    const i=(y*width+x)*4;
    result[i]=result[i+1]=result[i+2]=ink?0:255; result[i+3]=255;
    if (ink) dark++;
  }
  return { rgba: result, width, height, coverage: dark/(width*height) };
}
