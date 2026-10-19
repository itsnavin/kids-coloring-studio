import { jsPDF } from 'jspdf';
import { pageSvg } from './art.js';

export const rasterSize = orientation => orientation === 'landscape' ? [3508, 2480] : [2480, 3508];

export async function rasterize(svg, orientation) {
  const [width, height] = rasterSize(orientation);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not create an image canvas.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function createDownload(design, options, format) {
  const svg = pageSvg(design, options);
  if (format === 'svg') return new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  if (!['png', 'pdf'].includes(format)) throw new Error('Unsupported download format.');
  const canvas = await rasterize(svg, options.orientation);
  if (format === 'png') {
    return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('The browser could not encode the PNG.')), 'image/png'));
  }
  const landscape = options.orientation === 'landscape';
  const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4', compress: true });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, landscape ? 297 : 210, landscape ? 210 : 297, undefined, 'FAST');
  pdf.setProperties({ title: `${design.name} - Little Lines`, author: design.kind === 'archive' ? design.author : 'Little Lines', subject: design.kind === 'archive' ? `${design.rights} Source: ${design.source}` : design.kind === 'photo' ? 'Locally processed photo-derived raster outline' : 'Original printable coloring outline' });
  return pdf.output('blob');
}

export function saveDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Downloads can be handed off asynchronously by the browser.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
