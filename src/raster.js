import { imageDimensions, MAX_EDGE, MAX_FILE_BYTES } from './image-processing.js';

function readPixels(image, maxEdge) {
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale); canvas.height = Math.round(image.height * scale);
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Image canvas is unavailable in this browser.');
  context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return { rgba: context.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
}

export async function decodePhoto(file) {
  if (!file || file.size > MAX_FILE_BYTES || file.size === 0) throw new Error('Choose a JPEG or PNG up to 10 MB.');
  const bytes = new Uint8Array(await file.arrayBuffer());
  imageDimensions(bytes);
  // The decoder applies EXIF orientation once. Do not rotate again manually.
  const bitmap = await createImageBitmap(new Blob([bytes]));
  try { return readPixels(bitmap, MAX_EDGE); }
  finally { bitmap.close(); }
}

export async function loadArchive(record) {
  const response = await fetch(`${import.meta.env.BASE_URL}${record.asset}`);
  if (!response.ok) throw new Error(`Artwork is unavailable (${response.status}). Choose another drawing or retry.`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/') || blob.size > 12_000_000) throw new Error('The artwork response was not a supported image.');
  const bitmap = await createImageBitmap(blob);
  try { return readPixels(bitmap, 2200); }
  finally { bitmap.close(); }
}

export function rasterData(result) {
  const canvas = document.createElement('canvas');
  canvas.width=result.width; canvas.height=result.height;
  const context=canvas.getContext('2d');
  if (!context) throw new Error('Image canvas is unavailable in this browser.');
  context.putImageData(new ImageData(result.rgba,result.width,result.height),0,0);
  return canvas.toDataURL('image/png');
}
