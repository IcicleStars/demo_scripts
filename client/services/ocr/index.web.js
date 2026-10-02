import { createWorker } from 'tesseract.js';

export async function runOcr(imageUri, onProgress) {
  if (onProgress) onProgress('Initializing Tesseract...');
  const worker = await createWorker('eng');

  if (onProgress) onProgress('Recognizing text...');
  const result = await worker.recognize(imageUri);
  await worker.terminate();

  return result.data.text || 'No text detected.';
}