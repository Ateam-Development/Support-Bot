"use client";
import React, { useState } from 'react';
import { Globe, FileUp, Type, UploadCloud } from 'lucide-react';
import { motion } from 'framer-motion';

export default function KnowledgePage() {
    const [activeTab, setActiveTab] = useState('website');

    const tabs = [
        { id: 'website', label: 'Website URL', icon: Globe },
        { id: 'file', label: 'File Upload', icon: FileUp },
        { id: 'text', label: 'Manual Text', icon: Type },
    ];

    return (
        <div className="p-8 h-full overflow-y-auto custom-scrollbar">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">Knowledge Base</h1>
                <p className="text-gray-400">Train your chatbot with various data sources.</p>
            </header>

            {/* Tabs */}
            <div className="flex bg-white/5 p-1 rounded-xl w-fit mb-8 border border-white/5">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <tab.icon className="w-4 h-4" />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-w-3xl"
            >
                {activeTab === 'website' && (
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <Globe className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-lg">Crawl Website</h3>
                                <p className="text-sm text-gray-500">We will crawl your website to train the chatbot.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="url"
                                placeholder="https://example.com"
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                            />
                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                                Start Crawling (Firecrawl)
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'file' && (
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8 border-dashed border-2 flex flex-col items-center justify-center min-h-[300px] hover:border-blue-500/50 transition-colors cursor-pointer group">
                        <div className="p-4 bg-white/5 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                            <UploadCloud className="w-8 h-8 text-gray-400 group-hover:text-blue-400" />
                        </div>
                        <h3 className="text-white font-medium text-lg mb-2">Upload Files</h3>
                        <p className="text-sm text-gray-500 mb-6 text-center max-w-sm">Drag & drop files here, or click to browse.<br />Supported: .pdf, .txt, .csv, .docx</p>
                        <div className="flex gap-2">
                            <span className="px-3 py-1 bg-white/5 rounded-lg text-xs text-gray-400 border border-white/5">PDF</span>
                            <span className="px-3 py-1 bg-white/5 rounded-lg text-xs text-gray-400 border border-white/5">TXT</span>
                            <span className="px-3 py-1 bg-white/5 rounded-lg text-xs text-gray-400 border border-white/5">DOCX</span>
                        </div>
                    </div>
                )}

                {activeTab === 'text' && (
                    <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl p-8">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400">
                                <Type className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-white font-medium text-lg">Manual Input</h3>
                                <p className="text-sm text-gray-500">Directly paste text to train your chatbot.</p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <textarea
                                rows={8}
                                placeholder="Paste your text content here..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none custom-scrollbar"
                            />
                            <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-blue-600/20">
                                Add to Knowledge Base
                            </button>
                        </div>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
