"use client";
import React, { useState } from 'react';
import { X, Plus, Trash2, Mail } from 'lucide-react';

export default function EmailListModal({ isOpen, onClose, emails = [], onAddEmail, onRemoveEmail, isLoading }) {
    const [newEmail, setNewEmail] = useState('');
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const validateEmail = (email) => {
        return String(email)
            .toLowerCase()
            .match(
                /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
            );
    };

    const handleAdd = async () => {
        setError('');
        const email = newEmail.trim();

        if (!email) {
            setError('Please enter an email address');
            return;
        }

        if (!validateEmail(email)) {
            setError('Please enter a valid email address');
            return;
        }

        if (emails.includes(email)) {
            setError('This email is already in the list');
            return;
        }

        try {
            await onAddEmail(email);
            setNewEmail('');
        } catch (err) {
            setError('Failed to add email');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-white/10 rounded-xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Notification Emails
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4">
                    <p className="text-sm text-gray-400 mb-4">
                        Add emails to be notified when you are offline for more than 2 minutes.
                    </p>

                    <div className="flex gap-2 mb-4">
                        <input
                            type="email"
                            value={newEmail}
                            onChange={(e) => setNewEmail(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder="Enter email address"
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={isLoading || !newEmail.trim()}
                            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-3 py-2 transition-colors flex items-center justify-center"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>

                    {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

                    <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                        {emails.length === 0 ? (
                            <p className="text-center text-gray-500 text-sm py-4">No emails added yet</p>
                        ) : (
                            emails.map((email, index) => (
                                <div key={index} className="flex justify-between items-center bg-white/5 rounded-lg px-3 py-2">
                                    <span className="text-white text-sm">{email}</span>
                                    <button
                                        onClick={() => onRemoveEmail(email)}
                                        disabled={isLoading}
                                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
