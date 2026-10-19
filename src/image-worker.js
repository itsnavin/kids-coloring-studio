import { processPixels } from './image-processing.js';

self.onmessage = ({ data }) => {
  try {
    const result = processPixels(data);
    self.postMessage({ result }, [result.rgba.buffer]);
  } catch (error) {
    self.postMessage({ error: error instanceof Error ? error.message : 'Image processing failed.' });
  }
};
