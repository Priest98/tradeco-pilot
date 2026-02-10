
'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

export default function KnowledgePage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [ingestContent, setIngestContent] = useState('');

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await api.post('/knowledge/search', { query });
            setResults(data);
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleIngest = async () => {
        if (!ingestContent) return;
        try {
            await api.post('/knowledge/ingest', { content: ingestContent, category: 'research' });
            setIngestContent('');
            alert('Knowledge Ingested!');
        } catch (error) {
            console.error('Ingest failed:', error);
            alert('Ingest failed');
        }
    };

    return (
        <main className="min-h-screen bg-black text-white p-6 md:p-12">
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-orange-500 mb-8">
                Quant Knowledge Base
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Search Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-200">Semantic Search</h2>
                    <form onSubmit={handleSearch} className="flex gap-2 mb-6">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Ask about strategies, market behavior..."
                            className="flex-1 bg-black/50 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-yellow-500"
                        />
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-yellow-600 hover:bg-yellow-500 text-white px-6 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
                        >
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </form>

                    <div className="space-y-4">
                        {results.map((result: any, i) => (
                            <div key={i} className="p-4 bg-black/30 rounded-lg border border-white/5">
                                <p className="text-gray-300 text-sm leading-relaxed">{result.content}</p>
                                <div className="mt-2 flex gap-2">
                                    <span className="text-xs bg-white/10 px-2 py-1 rounded text-gray-400">
                                        Match: {(result.similarity * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        ))}
                        {results.length === 0 && !loading && (
                            <p className="text-gray-500 text-center py-8">No results found.</p>
                        )}
                    </div>
                </div>

                {/* Ingest Section */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-6 backdrop-blur-md">
                    <h2 className="text-2xl font-semibold mb-4 text-gray-200">Ingest Knowledge</h2>
                    <p className="text-gray-400 text-sm mb-4">
                        Add research papers, notes, or strategy ideas to the vector database.
                    </p>
                    <textarea
                        value={ingestContent}
                        onChange={(e) => setIngestContent(e.target.value)}
                        placeholder="Paste text content here..."
                        className="w-full h-64 bg-black/50 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 mb-4 font-mono text-sm"
                    />
                    <button
                        onClick={handleIngest}
                        disabled={!ingestContent}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg transition-colors font-medium disabled:opacity-50"
                    >
                        Ingest Content
                    </button>
                </div>
            </div>
        </main>
    );
}
