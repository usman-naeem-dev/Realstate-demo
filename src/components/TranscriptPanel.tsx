'use client';

import { TranscriptEntry } from '@/types';
import { useEffect, useRef } from 'react';

interface TranscriptPanelProps {
  entries: TranscriptEntry[];
}

export function TranscriptPanel({ entries }: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg border border-gray-700">
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <span>💬</span> Conversation
        </h2>
        {entries.length > 0 && (
          <span className="text-xs text-gray-500">{entries.length} messages</span>
        )}
      </div>
      
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="text-4xl mb-4">🏠</div>
            <p className="text-gray-400 text-sm mb-2">
              Start a call to speak with Esko
            </p>
            <p className="text-gray-500 text-xs">
              Your conversation will appear here
            </p>
          </div>
        ) : (
          entries.map((entry, index) => (
            <div
              key={entry.id}
              className={`flex gap-3 ${
                entry.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              } animate-fadeIn`}
            >
              {/* Avatar */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                  entry.role === 'user'
                    ? 'bg-blue-600'
                    : 'bg-gradient-to-br from-purple-500 to-pink-500'
                }`}
              >
                {entry.role === 'user' ? '👤' : '🏠'}
              </div>

              {/* Message bubble */}
              <div
                className={`flex flex-col max-w-[80%] ${
                  entry.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Name and time */}
                <div className="flex items-center gap-2 mb-1 px-1">
                  <span className={`text-xs font-medium ${
                    entry.role === 'user' ? 'text-blue-400' : 'text-purple-400'
                  }`}>
                    {entry.role === 'user' ? 'You' : 'Esko'}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatTime(entry.timestamp)}
                  </span>
                </div>

                {/* Message content */}
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    entry.role === 'user'
                      ? 'bg-blue-600 text-white rounded-tr-md'
                      : 'bg-gray-800 text-gray-100 rounded-tl-md border border-gray-700'
                  } ${!entry.isFinal ? 'opacity-80' : ''}`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {entry.text}
                    {!entry.isFinal && (
                      <span className="inline-flex ml-1">
                        <span className="animate-bounce">.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>.</span>
                        <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
