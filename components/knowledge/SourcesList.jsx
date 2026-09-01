"use client";
import React from 'react';
import { Search, Globe, FileText, Upload, Trash2, Edit3, Eye } from 'lucide-react';

export default function SourcesList({ sources, loading, onDelete, onEdit }) {
    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!sources || sources.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <Search className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="text-white font-medium mb-1">No knowledge sources yet</h3>
                <p className="text-gray-500 text-sm max-w-sm">
                    Add content to your knowledge base to start training your chatbot.
                </p>
            </div>
        );
    }

    const getIcon = (type) => {
        switch (type) {
            case 'website': return <Globe className="w-4 h-4 text-blue-400" />;
            case 'text': return <FileText className="w-4 h-4 text-purple-400" />;
            case 'file': return <Upload className="w-4 h-4 text-green-400" />;
            default: return <FileText className="w-4 h-4 text-gray-400" />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        try {
            return new Date(dateString).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (e) {
            return 'Invalid Date';
        }
    };

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                    <tr>
                        <th className="pb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider pl-4">Name</th>
                        <th className="pb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                        <th className="pb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Content Size</th>
                        <th className="pb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="pb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Updated</th>
                        <th className="pb-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right pr-4">Actions</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {sources.map((source) => {
                        const charLength = source.content?.length || source.metadata?.contentLength || source.metadata?.size || 0;
                        const titleText = source.metadata?.title || source.metadata?.filename || source.metadata?.url || 'Untitled';

                        return (
                            <tr
                                key={source.id}
                                className="group hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => onEdit && onEdit(source)}
                            >
                                <td className="py-4 pl-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-white/5 rounded-lg border border-white/5 group-hover:border-blue-500/30 transition-colors">
                                            {getIcon(source.type)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors truncate max-w-[240px]">
                                                {titleText}
                                            </p>
                                            {source.type === 'website' && (
                                                <p className="text-xs text-gray-500 truncate max-w-[240px]">{source.metadata?.url}</p>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="py-4">
                                    <span className="text-sm text-gray-400 capitalize">{source.type}</span>
                                </td>
                                <td className="py-4">
                                    <span className="text-xs text-gray-500 font-mono">
                                        {charLength > 0 ? `${charLength.toLocaleString()} chars` : '-'}
                                    </span>
                                </td>
                                <td className="py-4">
                                    <span className={`
                                        text-xs px-2.5 py-0.5 rounded-full border
                                        ${source.metadata?.status === 'crawling' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                            source.metadata?.status === 'error' ? 'bg-red-500/10 text-red-500 border-red-500/20' :
                                                'bg-green-500/10 text-green-500 border-green-500/20'}
                                    `}>
                                        {source.metadata?.status || 'Active'}
                                    </span>
                                </td>
                                <td className="py-4">
                                    <span className="text-sm text-gray-500">{formatDate(source.updatedAt || source.createdAt)}</span>
                                </td>
                                <td className="py-4 pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                                        <button
                                            className="px-2.5 py-1.5 bg-white/5 hover:bg-blue-600 hover:text-white text-gray-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-white/5"
                                            title="View and Edit Source"
                                            onClick={() => onEdit && onEdit(source)}
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                            <span>Edit</span>
                                        </button>
                                        <button
                                            className="p-1.5 hover:bg-red-500/10 hover:text-red-500 text-gray-500 rounded-lg transition-colors"
                                            title="Delete"
                                            onClick={() => onDelete && onDelete(source.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
