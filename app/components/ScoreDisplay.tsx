/**
 * ScoreDisplay - Shows summary scores from evaluation results
 * Displays average scores from summary_scores array
 */

"use client"
import React from 'react';
import { ScoreObject, isNewScoreObject, isNewScoreObjectV2 } from './types';

interface ScoreDisplayProps {
  score: ScoreObject | null;
  errorMessage?: string | null;
}

export default function ScoreDisplay({ score, errorMessage }: ScoreDisplayProps) {
  // No score available
  if (!score) {
    return (
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
        style={{
          backgroundColor: 'hsl(0, 0%, 95%)',
          borderWidth: '1px',
          borderColor: 'hsl(0, 0%, 85%)',
          color: 'hsl(330, 3%, 49%)'
        }}
      >
        <span className="font-medium">Score:</span>
        <span>N/A</span>
        {errorMessage && (
          <span className="text-xs" style={{ color: 'hsl(8, 86%, 40%)' }}>
            (Error)
          </span>
        )}
      </div>
    );
  }

  // Handle new score format (V1 or V2) - show summary scores
  const isNewFormat = isNewScoreObject(score) || isNewScoreObjectV2(score);

  if (isNewFormat && 'summary_scores' in score) {
    const summaryScores = score.summary_scores || [];

    if (summaryScores.length === 0) {
      return (
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
          style={{
            backgroundColor: 'hsl(0, 0%, 95%)',
            borderWidth: '1px',
            borderColor: 'hsl(0, 0%, 85%)',
            color: 'hsl(330, 3%, 49%)'
          }}
        >
          <span className="font-medium">Score:</span>
          <span>No scores available</span>
        </div>
      );
    }

    // Display all summary scores in a compact format
    return (
      <div className="inline-flex items-center gap-3 flex-wrap">
        {summaryScores.filter(s => s.data_type === 'NUMERIC').map((summary) => (
          <div
            key={summary.name}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
            style={{
              backgroundColor: 'hsl(0, 0%, 98%)',
              borderWidth: '1px',
              borderColor: 'hsl(0, 0%, 85%)',
              color: 'hsl(330, 3%, 19%)'
            }}
          >
            <span className="font-medium text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
              {summary.name}:
            </span>
            <span className="font-semibold">
              {summary.avg !== undefined ? summary.avg.toFixed(2) : 'N/A'}
            </span>
            {summary.std !== undefined && (
              <span className="text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
                ±{summary.std.toFixed(2)}
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Fallback for unsupported format
  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm"
      style={{
        backgroundColor: 'hsl(0, 0%, 95%)',
        borderWidth: '1px',
        borderColor: 'hsl(0, 0%, 85%)',
        color: 'hsl(330, 3%, 49%)'
      }}
    >
      <span className="font-medium">Score:</span>
      <span>Unsupported format</span>
    </div>
  );
}
