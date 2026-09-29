import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createWorker } from 'tesseract.js';

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  // Pick an image from the device/browser
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setOcrResult('');
    }
  };

  // Run Tesseract.js client-side OCR
  const runOCR = async () => {
    if (!imageUri) return;

    try {
      setLoading(true);
      setStatusText('Initializing Tesseract worker...');
      
      // Create a Tesseract worker for English
      const worker = await createWorker('eng');

      setStatusText('Recognizing text...');
      const { data: { text } } = await worker.recognize(imageUri);

      setOcrResult(text || 'No text detected.');
      await worker.terminate();
    } catch (error) {
      console.error(error);
      setOcrResult('Error running OCR: ' + error.message);
    } finally {
      setLoading(false);
      setStatusText('');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>JS AI Playground</Text>
        <Text style={styles.subtitle}>Client-Side OCR (Tesseract.js)</Text>

        {/* Image Selection Button */}
        <TouchableOpacity style={styles.button} onPress={pickImage}>
          <Text style={styles.buttonText}>Select Image for OCR</Text>
        </TouchableOpacity>

        {/* Image Preview */}
        {imageUri && (
          <View style={styles.previewContainer}>
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            <TouchableOpacity style={[styles.button, styles.ocrButton]} onPress={runOCR} disabled={loading}>
              <Text style={styles.buttonText}>Extract Text</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Loading State */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38bdf8" />
            <Text style={styles.loadingText}>{statusText}</Text>
          </View>
        )}

        {/* OCR Result Box */}
        {ocrResult !== '' && (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Extracted Text Result:</Text>
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
    maxWidth: 500,
    backgroundColor: '#1e293b',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  subtitle: {
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  ocrButton: {
    backgroundColor: '#059669',
    marginTop: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  previewContainer: {
    alignItems: 'center',
    marginTop: 12,
  },
  imagePreview: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    resizeMode: 'contain',
    backgroundColor: '#0f172a',
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    color: '#38bdf8',
    marginTop: 8,
    fontSize: 14,
  },
  resultBox: {
    marginTop: 24,
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  resultText: {
    color: '#f8fafc',
    fontFamily: 'monospace',
    fontSize: 14,
  },
});