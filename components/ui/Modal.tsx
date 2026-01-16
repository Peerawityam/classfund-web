import React from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    type = 'info',
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: 'bg-red-600 hover:bg-red-700',
        warning: 'bg-yellow-600 hover:bg-yellow-700',
        info: 'bg-blue-600 hover:bg-blue-700',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-fade-in">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 animate-scale-in">
                <div className="p-6">
                    <h3 className="text-xl font-bold mb-4">{title}</h3>
                    <p className="text-gray-700 mb-6 whitespace-pre-line">{message}</p>
                    <div className="flex gap-3 justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={`px-4 py-2 ${colors[type]} text-white rounded-lg font-medium transition-colors`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Modal;
