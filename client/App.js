import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createWorker } from 'tesseract.js';
// import { pipeline } from '@huggingface/transformers';

export default function App() {
  // OCR State
  const [imageUri, setImageUri] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  // STT State
  const [isRecording, setIsRecording] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const [sttStatus, setSttStatus] = useState('');
  const [sttResult, setSttResult] = useState('');

  // Audio recording references
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // OCR Logic
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
      base64: true,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const imageDataUri = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;

      setImageUri(imageDataUri);
      setOcrResult('');
    }
  };

  const runOCR = async () => {
    if (!imageUri) return;

    try {
      setOcrLoading(true);
      setOcrStatus('Initializing Tesseract...');
      const worker = await createWorker('eng');

      setOcrStatus('Recognizing text...');
      const result = await worker.recognize(imageUri);
      setOcrResult(result.data.text || 'No text detected.');
      await worker.terminate();
    } catch (error) {
      console.error(error);
      setOcrResult('Error running OCR: ' + error.message);
    } finally {
      setOcrLoading(false);
      setOcrStatus('');
    }
  };

  // STT Logic
  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
      });

      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = handleAudioTranscribe;
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setSttResult('');
    } catch (err) {
      console.error('Mic access error:', err);
      setSttResult('Microphone permission denied or unsupported.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      // Stop all mic tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const handleAudioTranscribe = async () => {
    try {
      setSttLoading(true);
      setSttStatus('Preparing audio...');

      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();

      // Whisper requires 16kHz mono PCM Float32 audio
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const audioData = decodedBuffer.getChannelData(0);

      setSttStatus('Loading Transformers.js library...');

      // Native browser dynamic import hidden from Metro/Babel
      const dynamicImport = new Function('url', 'return import(url)');
      const { pipeline, env } = await dynamicImport('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.3.3');

      // Configure Transformers.js for browser execution
      env.allowLocalModels = false;

      setSttStatus('Downloading/loading Whisper model...');
      const transcriber = await pipeline(
        'automatic-speech-recognition',
        'onnx-community/whisper-tiny.en',
        { dtype: 'q8', device: 'wasm' }
      );

      setSttStatus('Transcribing speech...');
      const output = await transcriber(audioData);
      setSttResult(output.text || 'No speech detected.');
    } catch (err) {
      console.error('Transcription error:', err);
      setSttResult('Transcription failed: ' + err.message);
    } finally {
      setSttLoading(false);
      setSttStatus('');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Client-Side AI Playground</Text>
        <Text style={styles.subtitle}>Tesseract OCR & Transformers.js Whisper STT</Text>

        {/* STT Section */}
        <Text style={styles.sectionHeader}>Speech-to-Text</Text>
        <TouchableOpacity
          style={[styles.button, isRecording ? styles.recordingButton : styles.micButton]}
          onPress={isRecording ? stopRecording : startRecording}
          disabled={sttLoading}
        >
          <Text style={styles.buttonText}>
            {isRecording ? 'Stop Recording' : 'Start Voice Note'}
          </Text>
        </TouchableOpacity>

        {sttLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#38bdf8" />
            <Text style={styles.loadingText}>{sttStatus}</Text>
          </View>
        )}

        {sttResult !== '' && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>STT Transcription:</Text>
            <Text style={styles.resultText}>{sttResult}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* OCR Section */}
        <Text style={styles.sectionHeader}>Optical Character Recognition</Text>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Select Image for OCR</Text>
        </TouchableOpacity>

        {imageUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.imagePreview} />
            <TouchableOpacity
              style={[styles.button, styles.ocrButton]}
              onPress={runOCR}
              disabled={ocrLoading}
            >
              <Text style={styles.buttonText}>Extract Text</Text>
            </TouchableOpacity>
          </View>
        )}

        {ocrLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#38bdf8" />
            <Text style={styles.loadingText}>{ocrStatus}</Text>
          </View>
        )}

        {ocrResult !== '' && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>OCR Result:</Text>
            <Text style={styles.resultText}>{ocrResult}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 550,
    backgroundColor: '#1e293b',
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    fontSize: 13,
  },
  sectionHeader: {
    color: '#e2e8f0',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  micButton: {
    backgroundColor: '#7c3aed',
  },
  recordingButton: {
    backgroundColor: '#dc2626',
  },
  ocrButton: {
    backgroundColor: '#059669',
    marginTop: 12,
    width: '100%',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 14,
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  loadingText: {
    color: '#38bdf8',
    marginTop: 6,
    fontSize: 13,
  },
  resultBox: {
    marginTop: 16,
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  resultText: {
    color: '#f8fafc',
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
});