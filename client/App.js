import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { createWorker } from 'tesseract.js';

export default function App() {
  const [imageUri, setImageUri] = useState(null);
  const [ocrResult, setOcrResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState('');

  // Pick an image from the device/browser and extract base64
  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 1,
      base64: true, // Tell Expo to return the raw image data
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      
      // Construct a base64 data URI that Web Workers can universally read
      // Fallback to the standard URI if base64 somehow fails
      const imageDataUri = asset.base64 
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}` 
        : asset.uri;

      setImageUri(imageDataUri);
      setOcrResult('');
    }
  };

  // Strips out purely symbolic lines and graphical OCR hallucinations
  const cleanOcrOutput = (rawText) => {
    return rawText
      .split('\n')
      .map(line => line.trim())
      .filter(line => {
        // Count actual alphanumeric characters
        const alphanumerics = line.match(/[a-zA-Z0-9]/g) || [];
        // Keep the line only if it has at least 3 readable characters 
        // AND isn't made up mostly of random symbols (like "Ee ————" or ": [")
        return alphanumerics.length >= 3 && (alphanumerics.length / line.length) > 0.4;
      })
      .join('\n');
  };

  const runOCR = async () => {
    if (!imageUri) return;

    try {
      setLoading(true);
      setStatusText('Initializing Tesseract worker...');
      
      const worker = await createWorker('eng');

      setStatusText('Recognizing text...');
      const result = await worker.recognize(imageUri);

      const cleanedText = cleanOcrOutput(result.data.text);

      // Log the entire raw output object to the console
      console.log("RAW TEXT STRING START:");
      console.log(result.data.text);
      console.log("RAW TEXT STRING END");

      // Bypass Tesseract's flawed confidence scores and filter the raw text directly
      setOcrResult(cleanedText || 'No readable text detected');

      await worker.terminate();
    } catch (error) {
      console.error("OCR ERROR:", error);
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
            <Image source={{ uri: imageUri }} resizeMode="contain" style={styles.imagePreview} />
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