let mediaRecorder = null;
let audioChunks = [];

export async function startSpeechRecording() {
  audioChunks = [];
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { noiseSuppression: true, echoCancellation: true, autoGainControl: true },
  });

  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };
  mediaRecorder.start();
}

export async function stopSpeechRecording(onProgress) {
  return new Promise((resolve, reject) => {
    if (!mediaRecorder) return resolve('');

    mediaRecorder.onstop = async () => {
      try {
        if (onProgress) onProgress('Preparing audio...');
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const arrayBuffer = await audioBlob.arrayBuffer();

        const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        const audioData = decodedBuffer.getChannelData(0);

        if (onProgress) onProgress('Loading Whisper model...');
        const dynamicImport = new Function('url', 'return import(url)');
        const { pipeline, env } = await dynamicImport('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3');
        env.allowLocalModels = false;

        const transcriber = await pipeline(
          'automatic-speech-recognition',
          'onnx-community/whisper-tiny.en',
          { dtype: 'q8', device: 'wasm' }
        );

        if (onProgress) onProgress('Transcribing...');
        const output = await transcriber(audioData);
        resolve(output.text || 'No speech detected.');
      } catch (err) {
        reject(err);
      }
    };

    mediaRecorder.stop();
    mediaRecorder.stream.getTracks().forEach((track) => track.stop());
  });
}