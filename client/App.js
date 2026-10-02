import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Metro resolves index.web.js or index.native.js automatically
import { runOcr } from './services/ocr';
import { startSpeechRecording, stopSpeechRecording } from './services/stt';

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrStatus, setOcrStatus] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const [sttStatus, setSttStatus] = useState('');
  const [sttResult, setSttResult] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
      base64: Platform.OS === 'web', // Base64 needed only for web worker
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      const uri = Platform.OS === 'web' && asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;

      setImageUri(uri);
      setOcrResult('');
    }
  };

  const handleRunOcr = async () => {
    if (!imageUri) return;
    try {
      setOcrLoading(true);
      const text = await runOcr(imageUri, setOcrStatus);
      setOcrResult(text);
    } catch (e) {
      setOcrResult('OCR Error: ' + e.message);
    } finally {
      setOcrLoading(false);
      setOcrStatus('');
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      try {
        setIsRecording(false);
        setSttLoading(true);
        const text = await stopSpeechRecording(setSttStatus);
        setSttResult(text);
      } catch (e) {
        setSttResult('STT Error: ' + e.message);
      } finally {
        setSttLoading(false);
        setSttStatus('');
      }
    } else {
      try {
        setSttResult('');
        await startSpeechRecording();
        setIsRecording(true);
      } catch (e) {
        setSttResult('Mic Error: ' + e.message);
      }
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Universal Notetaking AI</Text>
        <Text style={styles.subtitle}>
          Running {Platform.OS === 'web' ? 'WebAssembly Runtimes' : 'Native Hardware Acceleration'}
        </Text>

        {/* STT Block */}
        <Text style={styles.sectionHeader}>Speech-to-Text</Text>
        <TouchableOpacity
          style={[styles.button, isRecording ? styles.recordingButton : styles.micButton]}
          onPress={toggleRecording}
          disabled={sttLoading}
        >
          <Text style={styles.buttonText}>{isRecording ? 'Stop Recording' : 'Start Voice Note'}</Text>
        </TouchableOpacity>

        {sttLoading && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color="#38bdf8" />
            <Text style={styles.statusText}>{sttStatus}</Text>
          </View>
        )}
        {sttResult !== '' && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Transcription:</Text>
            <Text style={styles.resultText}>{sttResult}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* OCR Block */}
        <Text style={styles.sectionHeader}>Optical Character Recognition</Text>
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Select Image</Text>
        </TouchableOpacity>

        {imageUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.imagePreview} />
            <TouchableOpacity
              style={[styles.button, styles.ocrButton]}
              onPress={handleRunOcr}
              disabled={ocrLoading}
            >
              <Text style={styles.buttonText}>Extract Text</Text>
            </TouchableOpacity>
          </View>
        )}

        {ocrLoading && (
          <View style={styles.statusBox}>
            <ActivityIndicator size="small" color="#38bdf8" />
            <Text style={styles.statusText}>{ocrStatus}</Text>
          </View>
        )}
        {ocrResult !== '' && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Extracted Text:</Text>
            <Text style={styles.resultText}>{ocrResult}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0f172a', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#1e293b', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#334155' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  subtitle: { color: '#94a3b8', textAlign: 'center', marginBottom: 20, fontSize: 13 },
  sectionHeader: { color: '#e2e8f0', fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 4 },
  divider: { height: 1, backgroundColor: '#334155', marginVertical: 24 },
  button: { backgroundColor: '#2563eb', padding: 12, borderRadius: 8, alignItems: 'center' },
  micButton: { backgroundColor: '#7c3aed' },
  recordingButton: { backgroundColor: '#dc2626' },
  ocrButton: { backgroundColor: '#059669', marginTop: 12, width: '100%' },
  buttonText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  previewContainer: { alignItems: 'center', marginTop: 12 },
  imagePreview: { width: '100%', height: 200, borderRadius: 8, backgroundColor: '#0f172a' },
  statusBox: { alignItems: 'center', marginTop: 12 },
  statusText: { color: '#38bdf8', marginTop: 6, fontSize: 13 },
  resultBox: { marginTop: 16, backgroundColor: '#0f172a', padding: 14, borderRadius: 8, borderWidth: 1, borderColor: '#334155' },
  resultLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: 6 },
  resultText: { color: '#f8fafc', fontFamily: 'monospace', fontSize: 13, lineHeight: 18 },
});