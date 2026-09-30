import TextRecognition from '@react-native-ml-kit/text-recognition';

export async function runOcr(imageUri, onProgress) {
  if (onProgress) onProgress('Scanning with ML Kit...');
  const result = await TextRecognition.recognize(imageUri);
  return result.text || 'No text detected.';
}