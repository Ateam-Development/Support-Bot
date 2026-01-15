"use client";
import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, File, AlertCircle } from 'lucide-react';

export default function AddFileModal({ isOpen, onClose, onAdd }) {
    const [file, setFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [processingStatus, setProcessingStatus] = useState('');
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            // Validate file type
            const validTypes = ['application/pdf', 'text/plain'];
            if (!validTypes.includes(selectedFile.type) &&
                !selectedFile.name.endsWith('.txt') &&
                !selectedFile.name.endsWith('.pdf')) {
                setError('Only PDF and TXT files are supported');
                return;
            }

            // Validate file size (max 10MB)
            if (selectedFile.size > 10 * 1024 * 1024) {
                setError('File size must be less than 10MB');
                return;
            }

            setFile(selectedFile);
            setError('');
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) {
            handleFileChange({ target: { files: [droppedFile] } });
        }
    };

    const extractTextFromPDF = async (file) => {
        setProcessingStatus('Extracting text from PDF...');

        try {
            // Dynamically import pdfjs-dist
            const pdfjsLib = await import('pdfjs-dist');

            // Set worker to use local file from node_modules
            pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
                'pdfjs-dist/build/pdf.worker.min.mjs',
                import.meta.url
            ).toString();

            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

            let fullText = '';

            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => item.str).join(' ');
                fullText += pageText + '\n\n';
            }

            return fullText.trim();
        } catch (err) {
            console.error('PDF extraction error:', err);
            throw new Error('Failed to extract text from PDF. Please ensure the PDF contains readable text.');
        }
    };

    const extractTextFromTXT = async (file) => {
        setProcessingStatus('Reading text file...');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Failed to read text file'));
            reader.readAsText(file);
        });
    };

    const handleSubmit = async () => {
        if (!file) return;

        setLoading(true);
        setError('');
        setProcessingStatus('');

        try {
            let content = '';

            // Extract text based on file type
            if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                content = await extractTextFromPDF(file);
            } else {
                content = await extractTextFromTXT(file);
            }

            if (!content || content.trim().length === 0) {
                throw new Error('No text content found in file');
            }

            setProcessingStatus('Summarizing content...');

            // Send to backend
            await onAdd({
                filename: file.name,
                content: content,
                fileType: file.type
            });

            setFile(null);
            setProcessingStatus('');
            onClose();
        } catch (err) {
            console.error('File upload error:', err);

            // Check for API configuration errors
            if (err.message && err.message.includes('Gemini API key')) {
                setError('⚠️ Gemini API key is not configured. Please add it to your environment variables.');
            } else {
                setError(err.message || 'Failed to upload file');
            }
            setLoading(false);
            setProcessingStatus('');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <div className="p-2 bg-green-500/10 rounded-lg">
                            <Upload className="w-5 h-5 text-green-500" />
                        </div>
                        Upload File
                    </h3>
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="p-2 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-6">
                    <div
                        className={`
                            border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                            ${file ? 'border-green-500/50 bg-green-500/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}
                            ${loading ? 'pointer-events-none opacity-50' : ''}
                        `}
                        onDragOver={handleDragOver}
                        onDrop={handleDrop}
                        onClick={() => !loading && fileInputRef.current?.click()}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept=".txt,.pdf"
                            disabled={loading}
                        />

                        {file ? (
                            <div className="flex flex-col items-center">
                                <File className="w-10 h-10 text-green-400 mb-3" />
                                <p className="text-sm font-medium text-white break-all">{file.name}</p>
                                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                                {!loading && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setFile(null);
                                        }}
                                        className="mt-3 text-xs text-red-400 hover:text-red-300 hover:underline"
                                    >
                                        Remove
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center">
                                <Upload className="w-10 h-10 text-gray-500 mb-3" />
                                <p className="text-sm font-medium text-gray-300">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Supported: PDF, TXT (max 10MB)
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {processingStatus && (
                    <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-blue-400 text-sm flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {processingStatus}
                    </div>
                )}

                {error && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !file}
                        className="px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Processing...
                            </>
                        ) : (
                            'Upload'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
