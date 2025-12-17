'use client';

import { useState, useCallback, useRef } from 'react';
import { CallControls } from '@/components/CallControls';
import { TranscriptPanel } from '@/components/TranscriptPanel';
import { MetricsPanel } from '@/components/MetricsPanel';
import { CallHistory, CallDetail } from '@/components/CallHistory';
import { LiveKitVoice } from '@/components/LiveKitVoice';
import { TranscriptEntry, CallMetrics, CallRecord } from '@/types';
import { DEFAULT_PROMPT } from '@/lib/constants';

export default function Home() {
  // Settings state
  const [voice, setVoice] = useState('shimmer'); // Default to shimmer for real estate agent
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [agentSpeaksFirst, setAgentSpeaksFirst] = useState(true);

  // Call state
  const [isCallActive, setIsCallActive] = useState(false);
  const [metrics, setMetrics] = useState<CallMetrics>({
    status: 'idle',
    duration: 0,
    estimatedCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    audioInputMs: 0,
    audioOutputMs: 0,
  });

  // Transcript state
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);

  // Call history state
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallRecord | null>(null);
  const callStartTimeRef = useRef<Date | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Start the call
  const handleStartCall = useCallback(() => {
    setError(null);
    setTranscript([]);
    callStartTimeRef.current = new Date();

    setMetrics({
      status: 'connecting',
      duration: 0,
      estimatedCost: 0,
      inputTokens: 0,
      outputTokens: 0,
      audioInputMs: 0,
      audioOutputMs: 0,
    });
    setIsCallActive(true);
  }, []);

  // Stop the call and save to history
  const handleStopCall = useCallback(() => {
    const endTime = new Date();
    const startTime = callStartTimeRef.current || endTime;

    // Save call to history (only if there was actual activity)
    setMetrics((currentMetrics) => {
      if (currentMetrics.duration > 0 || transcript.length > 0) {
        const durationMinutes = currentMetrics.duration / 60;
        const estimatedCost = durationMinutes * 0.05; // Approximate cost

        const callRecord: CallRecord = {
          id: `call_${Date.now()}`,
          startTime,
          endTime,
          duration: currentMetrics.duration,
          voice,
          prompt,
          transcript: [...transcript],
          estimatedCost,
          inputTokens: currentMetrics.inputTokens,
          outputTokens: currentMetrics.outputTokens,
        };

        setCallHistory((prev) => [callRecord, ...prev]);
      }
      return { ...currentMetrics, status: 'disconnected' };
    });

    setIsCallActive(false);
    callStartTimeRef.current = null;
  }, [voice, prompt, transcript]);

  // LiveKit-specific handlers
  const handleLiveKitTranscript = useCallback((entry: TranscriptEntry) => {
    setTranscript((prev) => {
      const existing = prev.find((t) => t.id === entry.id);
      if (existing) {
        return prev.map((t) => (t.id === entry.id ? { ...t, ...entry } : t));
      }
      return [...prev, entry];
    });
  }, []);

  const handleLiveKitMetrics = useCallback((update: Partial<CallMetrics>) => {
    setMetrics((prev) => ({ ...prev, ...update }));
  }, []);

  const handleLiveKitError = useCallback((errorMsg: string) => {
    setError(errorMsg);
    setMetrics((prev) => ({ ...prev, status: 'error' }));
  }, []);

  const handleLiveKitSessionEnd = useCallback(() => {
    setIsCallActive(false);
    setMetrics((prev) => ({ ...prev, status: 'disconnected' }));
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">🏠 Real Estate Assistant</h1>
            <p className="text-sm text-gray-400">
              AI-Powered Voice Assistant
            </p>
          </div>
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-[1600px] mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Controls */}
          <div className="lg:col-span-3 space-y-4">
            <CallControls
              isCallActive={isCallActive}
              voice={voice}
              prompt={prompt}
              agentSpeaksFirst={agentSpeaksFirst}
              onVoiceChange={setVoice}
              onPromptChange={setPrompt}
              onAgentSpeaksFirstChange={setAgentSpeaksFirst}
              onStartCall={handleStartCall}
              onStopCall={handleStopCall}
            />
            
            {/* LiveKit Voice Component */}
            <LiveKitVoice
              config={{
                voice,
                prompt,
                inputCostPerMinute: 0.01,
                outputCostPerMinute: 0.04,
                agentSpeaksFirst,
              }}
              onTranscriptUpdate={handleLiveKitTranscript}
              onMetricsUpdate={handleLiveKitMetrics}
              onError={handleLiveKitError}
              onSessionEnd={handleLiveKitSessionEnd}
              isActive={isCallActive}
            />
          </div>

          {/* Middle Column - Transcript */}
          <div className="lg:col-span-5 h-[calc(100vh-160px)]">
            <TranscriptPanel entries={transcript} />
          </div>

          {/* Right Column - Metrics & History */}
          <div className="lg:col-span-4 space-y-4">
            <MetricsPanel
              metrics={metrics}
              inputCostPerMinute={0.01}
              outputCostPerMinute={0.04}
            />
            <CallHistory
              calls={callHistory}
              onSelectCall={setSelectedCall}
              selectedCallId={selectedCall?.id || null}
            />
          </div>
        </div>
      </div>

      {/* Call Detail Modal */}
      {selectedCall && (
        <CallDetail
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </main>
  );
}
