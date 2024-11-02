import React, { useRef, useState } from 'react';
import { Camera, Upload, Loader2 } from 'lucide-react';
import { createWorker } from 'tesseract.js';
import type { DocumentData, ScanResult } from '../types';

export default function Scanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  const extractDocumentData = (text: string): DocumentData => {
    // Basic extraction logic - in production, this would be more sophisticated
    const lines = text.split('\n');
    const data: DocumentData = {
      name: '',
      documentNumber: '',
      expirationDate: '',
    };

    lines.forEach(line => {
      if (line.toLowerCase().includes('name')) {
        data.name = line.split(':')[1]?.trim() || '';
      }
      if (line.match(/\b[A-Z0-9]{9}\b/)) {
        data.documentNumber = line.match(/\b[A-Z0-9]{9}\b/)?.[0] || '';
      }
      if (line.match(/\d{2}\/\d{2}\/\d{4}/)) {
        data.expirationDate = line.match(/\d{2}\/\d{2}\/\d{4}/)?.[0] || '';
      }
    });

    return data;
  };

  const processImage = async (imageData: string | Blob) => {
    setIsScanning(true);
    try {
      const worker = await createWorker('eng');
      const result = await worker.recognize(imageData);
      await worker.terminate();

      const extractedData = extractDocumentData(result.data.text);
      setDocumentData(extractedData);
    } catch (error) {
      console.error('Error processing image:', error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processImage(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
    }
  };

  const captureImage = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) processImage(blob);
      });
      stopCamera();
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      <div className="bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Document Scanner</h1>
        
        <div className="space-y-6">
          <div className="flex gap-4">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isScanning}
            >
              <Upload size={20} />
              Upload Document
            </button>
            
            <button
              onClick={isCameraActive ? captureImage : startCamera}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              disabled={isScanning}
            >
              <Camera size={20} />
              {isCameraActive ? 'Capture' : 'Use Camera'}
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />

          {isCameraActive && (
            <div className="relative">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full rounded-lg border-2 border-gray-300"
              />
              <button
                onClick={stopCamera}
                className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
              >
                ✕
              </button>
            </div>
          )}

          {isScanning && (
            <div className="flex items-center gap-3 text-blue-600">
              <Loader2 className="animate-spin" />
              <span>Processing document...</span>
            </div>
          )}

          {documentData && (
            <div className="mt-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
              <h2 className="text-xl font-semibold mb-4">Extracted Information</h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Name</dt>
                  <dd className="text-lg text-gray-900">{documentData.name || 'Not found'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Document Number</dt>
                  <dd className="text-lg text-gray-900">{documentData.documentNumber || 'Not found'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Expiration Date</dt>
                  <dd className="text-lg text-gray-900">{documentData.expirationDate || 'Not found'}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}