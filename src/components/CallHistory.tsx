'use client';

import { CallRecord } from '@/types';
import { downloadBlob } from '@/lib/recording';

interface CallHistoryProps {
  calls: CallRecord[];
  onSelectCall: (call: CallRecord) => void;
  selectedCallId: string | null;
}

export function CallHistory({ calls, onSelectCall, selectedCallId }: CallHistoryProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const handleDownload = (call: CallRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    if (call.recordingBlob) {
      const timestamp = new Date(call.startTime).toISOString().replace(/[:.]/g, '-');
      downloadBlob(call.recordingBlob, `call-${timestamp}.webm`);
    }
  };

  if (calls.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
        <h2 className="text-lg font-semibold text-white mb-4">Call History</h2>
        <p className="text-gray-500 text-sm text-center py-8">
          No calls yet. Start a call to see history here.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4">
      <h2 className="text-lg font-semibold text-white mb-4">
        Call History ({calls.length})
      </h2>
      
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {calls.map((call) => (
          <div
            key={call.id}
            onClick={() => onSelectCall(call)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedCallId === call.id
                ? 'bg-blue-600/30 border border-blue-500'
                : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">
                {formatTime(call.startTime)}
              </span>
              <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">
                {call.voice}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-3">
                <span className="text-white font-mono">
                  {formatDuration(call.duration)}
                </span>
                <span className="text-green-400">
                  {formatCost(call.estimatedCost)}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">
                  {call.transcript.filter(t => t.isFinal).length} messages
                </span>
                {call.recordingBlob && (
                  <button
                    onClick={(e) => handleDownload(call, e)}
                    className="text-blue-400 hover:text-blue-300 p-1"
                    title="Download recording"
                  >
                    <DownloadIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Preview of first message */}
            {call.transcript.length > 0 && (
              <p className="text-xs text-gray-500 mt-2 truncate">
                {call.transcript.find(t => t.isFinal)?.text || 'No transcript'}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface CallDetailProps {
  call: CallRecord;
  onClose: () => void;
}

export function CallDetail({ call, onClose }: CallDetailProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleDownload = () => {
    if (call.recordingBlob) {
      const timestamp = new Date(call.startTime).toISOString().replace(/[:.]/g, '-');
      downloadBlob(call.recordingBlob, `call-${timestamp}.webm`);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg border border-gray-700 w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div>
            <h2 className="text-lg font-semibold text-white">Call Details</h2>
            <p className="text-sm text-gray-400">
              {new Date(call.startTime).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-2"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 p-4 border-b border-gray-700">
          <div className="text-center">
            <div className="text-2xl font-mono text-white">{formatDuration(call.duration)}</div>
            <div className="text-xs text-gray-500">Duration</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono text-green-400">${call.estimatedCost.toFixed(4)}</div>
            <div className="text-xs text-gray-500">Est. Cost</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono text-white">{call.inputTokens}</div>
            <div className="text-xs text-gray-500">Input Tokens</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-mono text-white">{call.outputTokens}</div>
            <div className="text-xs text-gray-500">Output Tokens</div>
          </div>
        </div>

        {/* Voice & Prompt */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center gap-4 mb-2">
            <span className="text-sm text-gray-400">Voice:</span>
            <span className="text-sm text-white bg-gray-800 px-2 py-1 rounded">{call.voice}</span>
          </div>
          <div className="text-sm text-gray-400 mb-1">Prompt:</div>
          <p className="text-sm text-gray-300 bg-gray-800 p-2 rounded max-h-20 overflow-y-auto">
            {call.prompt}
          </p>
        </div>

        {/* Transcript */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Transcript</h3>
          <div className="space-y-3">
            {call.transcript.filter(t => t.isFinal).map((entry) => (
              <div
                key={entry.id}
                className={`flex flex-col ${
                  entry.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 ${
                    entry.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium uppercase">
                      {entry.role === 'user' ? 'You' : 'AI'}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatTime(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm">{entry.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-700 flex gap-2">
          {call.recordingBlob && (
            <button
              onClick={handleDownload}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg 
                         flex items-center justify-center gap-2"
            >
              <DownloadIcon className="w-4 h-4" />
              Download Recording
            </button>
          )}
          <button
            onClick={onClose}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
