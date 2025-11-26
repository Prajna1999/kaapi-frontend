/**
 * ScoreDisplay - Hoverable score badge with per-item breakdown tooltip
 * Shows average cosine similarity score with expandable per-item details
 */

"use client"
import React, { useState, useMemo } from 'react';
import { ScoreObject } from './types';
import { getScoreColor, calculateDynamicThresholds } from './utils';

interface ScoreDisplayProps {
  score: ScoreObject | null;
  errorMessage?: string | null;
}

export default function ScoreDisplay({ score, errorMessage }: ScoreDisplayProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const leaveTimeoutRef = useState<NodeJS.Timeout | null>(null)[0];

  const handleMouseEnter = () => {
    if (leaveTimeoutRef) {
      clearTimeout(leaveTimeoutRef);
    }
    setIsLeaving(false);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsLeaving(true);
    const timeout = setTimeout(() => {
      setIsHovered(false);
      setIsLeaving(false);
    }, 200);
  };

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
        <span className="font-medium">Similarity Score:</span>
        <span>N/A</span>
        {errorMessage && (
          <span className="text-xs" style={{ color: 'hsl(8, 86%, 40%)' }}>
            (Error)
          </span>
        )}
      </div>
    );
  }

  const { cosine_similarity } = score;

  // Defensive check: ensure cosine_similarity and per_item_scores exist
  if (!cosine_similarity ||
      !Array.isArray(cosine_similarity.per_item_scores) ||
      typeof cosine_similarity.avg !== 'number' ||
      typeof cosine_similarity.std !== 'number' ||
      typeof cosine_similarity.total_pairs !== 'number') {
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
        <span className="font-medium">Similarity Score:</span>
        <span>Invalid Data</span>
      </div>
    );
  }

  const avgScore = cosine_similarity.avg.toFixed(2);
  const stdScore = cosine_similarity.std.toFixed(2);

  // Calculate dynamic thresholds based on the score distribution
  const dynamicThresholds = useMemo(() => {
    const scores = cosine_similarity.per_item_scores
      .filter(item => item && typeof item.cosine_similarity === 'number')
      .map(item => item.cosine_similarity);
    return calculateDynamicThresholds(scores);
  }, [cosine_similarity.per_item_scores]);

  const avgColors = getScoreColor(cosine_similarity.avg, dynamicThresholds);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Collapsed View - Always Visible */}
      <div
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm cursor-pointer transition-all duration-200"
        style={{
          backgroundColor: isHovered ? avgColors.bg : 'hsl(0, 0%, 98%)',
          borderWidth: '1px',
          borderColor: isHovered ? avgColors.border : 'hsl(0, 0%, 85%)',
          color: avgColors.text
        }}
      >
        <span className="font-medium">Similarity Score:</span>
        <span className="font-semibold">{avgScore}</span>
        <span className="text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
          ±{stdScore}
        </span>
        <span className="text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
          ({cosine_similarity.total_pairs} pairs)
        </span>
        {/* Dropdown indicator */}
        <svg
          className="w-3 h-3 transition-transform duration-200"
          style={{
            color: 'hsl(330, 3%, 49%)',
            transform: isHovered ? 'rotate(180deg)' : 'rotate(0deg)'
          }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded View - Shown on Hover */}
      {isHovered && (
        <div
          className="absolute left-0 top-full mt-2 border rounded-lg shadow-lg z-50 animate-fadeIn"
          style={{
            backgroundColor: 'hsl(0, 0%, 100%)',
            borderColor: 'hsl(0, 0%, 85%)',
            minWidth: '400px',
            maxWidth: '500px',
            opacity: isLeaving ? 0.5 : 1,
            transition: 'opacity 200ms ease-in-out'
          }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
            <h4 className="text-sm font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
              Per-Item Similarity Scores
            </h4>
            <p className="text-xs mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
              Average: {avgScore} • Std Dev: {stdScore} • Total: {cosine_similarity.total_pairs} items
            </p>
          </div>

          {/* Scrollable List */}
          <div
            className="overflow-y-auto"
            style={{
              maxHeight: '300px'
            }}
          >
            {[...cosine_similarity.per_item_scores]
              .sort((a, b) => {
                // Sort in descending order by cosine_similarity
                if (!a || typeof a.cosine_similarity !== 'number') return 1;
                if (!b || typeof b.cosine_similarity !== 'number') return -1;
                return b.cosine_similarity - a.cosine_similarity;
              })
              .map((item, index) => {
              // Defensive null check for item properties
              if (!item || typeof item.cosine_similarity !== 'number') {
                return null;
              }

              const itemScore = item.cosine_similarity.toFixed(2);
              const itemColors = getScoreColor(item.cosine_similarity, dynamicThresholds);

              return (
                <div
                  key={item.trace_id}
                  className="px-4 py-2.5 border-b transition-colors"
                  style={{
                    borderColor: 'hsl(0, 0%, 92%)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 98%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div className="flex items-center justify-between gap-4">
                    {/* Trace ID */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium" style={{ color: 'hsl(330, 3%, 49%)' }}>
                          Trace ID #{index + 1}:
                        </span>
                        <code
                          className="text-xs font-mono truncate"
                          style={{ color: 'hsl(330, 3%, 19%)' }}
                          title={item.trace_id}
                        >
                          {item.trace_id}
                        </code>
                      </div>
                    </div>

                    {/* Score Badge */}
                    <div
                      className="px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap"
                      style={{
                        backgroundColor: itemColors.bg,
                        borderWidth: '1px',
                        borderColor: itemColors.border,
                        color: itemColors.text
                      }}
                    >
                      {itemScore}
                    </div>
                  </div>

                  {/* Visual Bar */}
                  <div
                    className="mt-1.5 h-1.5 rounded-full overflow-hidden"
                    style={{ backgroundColor: 'hsl(0, 0%, 92%)' }}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${item.cosine_similarity * 100}%`,
                        backgroundColor: itemColors.text
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t text-center" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
            <p className="text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
              Hover to keep open • Move away to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
