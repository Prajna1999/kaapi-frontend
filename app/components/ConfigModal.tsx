/**
 * ConfigModal - Displays detailed configuration for an evaluation job
 * Shows assistant config, model, temperature, instructions, tools, and vector stores
 */

"use client"
import React from 'react';
import { EvalJob, AssistantConfig } from './types';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: EvalJob;
  assistantConfig?: AssistantConfig | null;
}

export default function ConfigModal({ isOpen, onClose, job, assistantConfig }: ConfigModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-modalBackdrop"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[80vh] overflow-hidden rounded-lg shadow-2xl animate-modalContent"
        style={{ backgroundColor: 'hsl(0, 0%, 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(330, 3%, 49%)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Detailed Configuration</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md transition-colors"
            style={{
              color: 'hsl(330, 3%, 49%)',
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 space-y-4" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {assistantConfig && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Assistant Name</div>
              <div className="text-sm font-medium mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>{assistantConfig.name}</div>
            </div>
          )}

          {job.assistant_id && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Assistant ID</div>
              <div className="text-sm font-mono mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.assistant_id}</div>
            </div>
          )}

          <div>
            <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Model</div>
            <div className="text-sm font-medium mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>
              {assistantConfig?.model || job.config?.model || 'N/A'}
            </div>
          </div>

          {(assistantConfig?.temperature !== undefined || job.config?.temperature !== undefined) && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Temperature</div>
              <div className="text-sm font-medium mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>
                {assistantConfig?.temperature !== undefined ? assistantConfig.temperature : job.config?.temperature}
              </div>
            </div>
          )}

          {(assistantConfig?.instructions || job.config?.instructions) && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Instructions</div>
              <div className="text-sm p-3 rounded-md font-mono whitespace-pre-wrap border" style={{
                backgroundColor: 'hsl(0, 0%, 98%)',
                borderColor: 'hsl(0, 0%, 85%)',
                color: 'hsl(330, 3%, 19%)',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {assistantConfig?.instructions || job.config?.instructions}
              </div>
            </div>
          )}

          {Array.isArray(job.config?.tools) && job.config.tools.length > 0 && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Tools</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {job.config.tools.map((tool, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 rounded text-sm font-medium"
                    style={{
                      backgroundColor: 'hsl(167, 59%, 95%)',
                      borderWidth: '1px',
                      borderColor: 'hsl(167, 59%, 70%)',
                      color: 'hsl(167, 59%, 22%)'
                    }}
                  >
                    {tool.type}
                  </span>
                ))}
              </div>
              {job.config.tools.map((tool, idx) => (
                Array.isArray(tool.vector_store_ids) && tool.vector_store_ids.length > 0 && (
                  <div key={`vs-${idx}`} className="mb-4">
                    <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>
                      Vector Store IDs ({tool.type})
                    </div>
                    <div className="text-sm font-mono p-3 rounded-md border" style={{
                      backgroundColor: 'hsl(0, 0%, 98%)',
                      borderColor: 'hsl(0, 0%, 85%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}>
                      {tool.vector_store_ids.join(', ')}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}

          {Array.isArray(assistantConfig?.vector_store_ids) && assistantConfig.vector_store_ids.length > 0 && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Vector Store IDs</div>
              <div className="text-sm font-mono p-3 rounded-md border" style={{
                backgroundColor: 'hsl(0, 0%, 98%)',
                borderColor: 'hsl(0, 0%, 85%)',
                color: 'hsl(330, 3%, 19%)'
              }}>
                {assistantConfig.vector_store_ids.join(', ')}
              </div>
            </div>
          )}

          {Array.isArray(job.config?.include) && job.config.include.length > 0 && (
            <div>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Include</div>
              <div className="flex flex-wrap gap-2">
                {job.config.include.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-1 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'hsl(0, 0%, 95%)',
                      borderWidth: '1px',
                      borderColor: 'hsl(0, 0%, 85%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: 'hsl(0, 0%, 85%)', backgroundColor: 'hsl(0, 0%, 98%)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'hsl(167, 59%, 22%)',
              color: 'hsl(0, 0%, 100%)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
