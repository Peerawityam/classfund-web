import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, X, Upload } from 'lucide-react';

interface QrScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onClose: () => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScanSuccess, onClose }) => {
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string>('');
    const [scanMode, setScanMode] = useState<'camera' | 'file'>('camera');
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (scanMode === 'camera') {
            startScanner();
        }

        return () => {
            stopScanner();
        };
    }, [scanMode]);

    const startScanner = async () => {
        try {
            setError('');
            setIsScanning(true);

            const html5QrCode = new Html5Qrcode('qr-reader');
            scannerRef.current = html5QrCode;

            await html5QrCode.start(
                { facingMode: 'environment' }, // Use back camera on mobile
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    onScanSuccess(decodedText);
                    stopScanner();
                },
                () => {
                    // Ignore scanning errors (too noisy)
                }
            );
        } catch (err: any) {
            console.error('Scanner error:', err);
            setError('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้องหรือใช้โหมดอัปโหลดไฟล์');
            setIsScanning(false);
        }
    };

    const stopScanner = async () => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
                scannerRef.current.clear();
            } catch (err) {
                console.error('Error stopping scanner:', err);
            }
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setError('');
            const html5QrCode = new Html5Qrcode('qr-reader');

            const decodedText = await html5QrCode.scanFile(file, true);
            onScanSuccess(decodedText);
            onClose();
        } catch (err: any) {
            setError('ไม่พบ QR Code ในรูปภาพ กรุณาลองใหม่');
            console.error('File scan error:', err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                    <X size={24} />
                </button>

                {/* Title */}
                <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
                    สแกน QR Code
                </h2>

                {/* Mode Toggle */}
                <div className="flex gap-2 mb-4">
                    <button
                        onClick={() => setScanMode('camera')}
                        className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${scanMode === 'camera'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        <Camera size={18} />
                        <span>กล้อง</span>
                    </button>
                    <button
                        onClick={() => {
                            stopScanner();
                            setScanMode('file');
                        }}
                        className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors ${scanMode === 'file'
                            ? 'bg-emerald-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            }`}
                    >
                        <Upload size={18} />
                        <span>อัปโหลด</span>
                    </button>
                </div>

                {/* Scanner Area */}
                <div className="mb-4">
                    {scanMode === 'camera' ? (
                        <div>
                            <div
                                id="qr-reader"
                                className="rounded-lg overflow-hidden border-2 border-gray-300 dark:border-gray-600"
                            ></div>
                            {isScanning && (
                                <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    📸 กำลังสแกน... นำกล้องไปที่ QR Code
                                </p>
                            )}
                        </div>
                    ) : (
                        <div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full py-12 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors flex flex-col items-center justify-center gap-2 text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400"
                            >
                                <Upload size={48} />
                                <span className="font-medium">คลิกเพื่ออัปโหลดรูป QR Code</span>
                            </button>
                            <div id="qr-reader" className="hidden"></div>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
                        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                    </div>
                )}

                {/* Instructions */}
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-sm text-blue-700 dark:text-blue-400">
                        💡 <strong>คำแนะนำ:</strong> วาง QR Code ให้อยู่ในกรอบสี่เหลี่ยม
                        ระบบจะสแกนอัตโนมัติเมื่อตรวจพบ
                    </p>
                </div>
            </div>
        </div>
    );
};

export default QrScanner;
