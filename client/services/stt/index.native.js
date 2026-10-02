import Voice from '@react-native-voice/voice';

let currentSpeechResult = '';

export async function startSpeechRecording() {
  currentSpeechResult = '';
  Voice.onSpeechResults = (e) => {
    if (e.value && e.value.length > 0) {
      currentSpeechResult = e.value[0];
    }
  };
  await Voice.start('en-US');
}

export async function stopSpeechRecording(onProgress) {
  if (onProgress) onProgress('Processing native speech...');
  await Voice.stop();
  Voice.removeAllListeners();
  return currentSpeechResult || 'No speech detected.';
}