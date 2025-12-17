'use client';

import { AVAILABLE_VOICES, DEFAULT_PROMPT } from '@/lib/constants';

interface CallControlsProps {
  isCallActive: boolean;
  voice: string;
  prompt: string;
  agentSpeaksFirst: boolean;
  onVoiceChange: (voice: string) => void;
  onPromptChange: (prompt: string) => void;
  onAgentSpeaksFirstChange: (value: boolean) => void;
  onStartCall: () => void;
  onStopCall: () => void;
}

export function CallControls({
  isCallActive,
  voice,
  prompt,
  agentSpeaksFirst,
  onVoiceChange,
  onPromptChange,
  onAgentSpeaksFirstChange,
  onStartCall,
  onStopCall,
}: CallControlsProps) {
  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <span>🏠</span> Real Estate Assistant
      </h2>

      {/* Voice Selection */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Agent Voice
        </label>
        <select
          value={voice}
          onChange={(e) => onVoiceChange(e.target.value)}
          disabled={isCallActive}
          className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                     disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {AVAILABLE_VOICES.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Agent Speaks First Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-300">
          Agent speaks first
        </label>
        <button
          onClick={() => onAgentSpeaksFirstChange(!agentSpeaksFirst)}
          disabled={isCallActive}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                     disabled:opacity-50 disabled:cursor-not-allowed
                     ${agentSpeaksFirst ? 'bg-blue-600' : 'bg-gray-600'}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                       ${agentSpeaksFirst ? 'translate-x-6' : 'translate-x-1'}`}
          />
        </button>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          System Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          disabled={isCallActive}
          rows={6}
          placeholder="Enter instructions for the real estate agent..."
          className="w-full bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 
                     focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none
                     disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        />
        <button
          onClick={() => onPromptChange(DEFAULT_PROMPT)}
          disabled={isCallActive}
          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50"
        >
          Reset to default
        </button>
      </div>

      {/* Call Controls */}
      <div className="space-y-3 pt-4 border-t border-gray-700">
        {!isCallActive ? (
          <button
            onClick={onStartCall}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 
                       rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <PhoneIcon className="w-5 h-5" />
            Call Agent
          </button>
        ) : (
          <button
            onClick={onStopCall}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 
                       rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <PhoneOffIcon className="w-5 h-5" />
            End Call
          </button>
        )}
      </div>

      {/* Info */}
      <div className="text-xs text-gray-500 pt-2">
        <p>Powered by AI</p>
      </div>
    </div>
  );
}

// Simple icon components
function PhoneIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  );
}

function PhoneOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
    </svg>
  );
}
