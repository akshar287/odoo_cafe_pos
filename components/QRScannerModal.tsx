'use client';

import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { X, QrCode } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QRScannerModalProps {
  onClose: () => void;
}

export default function QRScannerModal({ onClose }: QRScannerModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // We need to wait for the DOM element to be ready
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 }, aspectRatio: 1.0 },
      false
    );

    scanner.render(
      (decodedText) => {
        // Success
        console.log('Scanned:', decodedText);
        try {
          // Verify if it's a valid URL for our app
          const url = new URL(decodedText);
          if (url.pathname.includes('/menu')) {
            scanner.clear();
            router.push(url.pathname + url.search);
          } else {
            setError('Invalid QR code. Please scan a valid table QR code.');
          }
        } catch (e) {
          setError('Invalid QR code format. Please scan a valid table QR code.');
        }
      },
      (errorMessage) => {
        // We usually ignore these read errors as it fires constantly while searching
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [router]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl overflow-hidden shadow-2xl max-w-sm w-full animate-in fade-in zoom-in duration-200">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2 text-gray-900 font-bold">
            <QrCode className="w-5 h-5 text-orange-500" />
            Scan Table QR
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-500 text-center mb-4">
            Point your camera at the QR code on your table to start ordering.
          </p>
          <div className="rounded-xl overflow-hidden border-2 border-orange-100 bg-black">
            <div id="qr-reader" className="w-full"></div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-xs font-semibold rounded-xl text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
