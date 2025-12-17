'use client';

import { CallMetrics } from '@/types';

interface MetricsPanelProps {
  metrics: CallMetrics;
  inputCostPerMinute: number;
  outputCostPerMinute: number;
}

export function MetricsPanel({ metrics, inputCostPerMinute, outputCostPerMinute }: MetricsPanelProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCost = (cost: number) => {
    return `$${cost.toFixed(4)}`;
  };

  const getStatusInfo = (status: CallMetrics['status']) => {
    switch (status) {
      case 'connected':
        return { color: 'bg-green-500', text: 'In Call', icon: '🟢' };
      case 'connecting':
        return { color: 'bg-yellow-500 animate-pulse', text: 'Connecting...', icon: '🟡' };
      case 'disconnected':
        return { color: 'bg-gray-500', text: 'Disconnected', icon: '⚪' };
      case 'error':
        return { color: 'bg-red-500', text: 'Error', icon: '🔴' };
      default:
        return { color: 'bg-gray-500', text: 'Ready', icon: '⚪' };
    }
  };

  // Calculate estimated cost based on duration
  const durationMinutes = metrics.duration / 60;
  const averageCostPerMinute = (inputCostPerMinute + outputCostPerMinute) / 2;
  const estimatedCost = durationMinutes * averageCostPerMinute;
  
  const statusInfo = getStatusInfo(metrics.status);

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-700 p-4 space-y-4">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <span>📊</span> Call Stats
      </h2>

      {/* Status */}
      <div className="flex items-center gap-3 bg-gray-800 rounded-lg p-3">
        <div className={`w-3 h-3 rounded-full ${statusInfo.color}`} />
        <span className="text-white font-medium">{statusInfo.text}</span>
      </div>

      {/* Duration */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
          <span>⏱️</span> Duration
        </div>
        <div className="text-3xl font-mono text-white">
          {formatDuration(metrics.duration)}
        </div>
      </div>

      {/* Cost Estimate - Hidden */}
      {/* <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-sm text-gray-400 mb-1 flex items-center gap-1">
          <span>💰</span> Estimated Cost
        </div>
        <div className="text-2xl font-mono text-green-400">
          {formatCost(estimatedCost)}
        </div>
        <div className="text-xs text-gray-500 mt-1">
          ~${averageCostPerMinute.toFixed(3)}/min
        </div>
      </div> */}

      {/* Usage Stats (if available) */}
      {(metrics.inputTokens > 0 || metrics.outputTokens > 0) && (
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="text-sm text-gray-400">Token Usage</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-gray-500">Input:</span>
              <span className="text-white ml-1">{metrics.inputTokens.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-gray-500">Output:</span>
              <span className="text-white ml-1">{metrics.outputTokens.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-xs text-gray-500 italic">
        * Cost is an estimate based on configured rates. Actual billing may vary.
      </p>
    </div>
  );
}
