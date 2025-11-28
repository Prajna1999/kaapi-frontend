/**
 * EvaluationReport.tsx - Separate page for detailed evaluation report
 *
 * Shows detailed metrics, summary, and per-item scores for a specific evaluation job
 */

"use client"
import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { APIKey, STORAGE_KEY } from '../../keystore/page';
import { EvalJob, AssistantConfig, isNewScoreObject, isNewScoreObjectV2, getScoreObject, normalizeToIndividualScores } from '../../components/types';
import { formatDate, getStatusColor } from '../../components/utils';
import ConfigModal from '../../components/ConfigModal';
import Sidebar from '../../components/Sidebar';
import DetailedResultsTable from '../../components/DetailedResultsTable';

export default function EvaluationReport() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<EvalJob | null>(null);
  const [assistantConfig, setAssistantConfig] = useState<AssistantConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Load API keys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
        // Auto-select the first API key
        if (keys.length > 0) {
          setSelectedKeyId(keys[0].id);
        }
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Fetch job details
  const fetchJobDetails = useCallback(async () => {
    if (!selectedKeyId || !jobId) return;

    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch the specific evaluation by ID
      const response = await fetch(`/api/evaluations/${jobId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': selectedKey.key,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch evaluation: ${response.status}`);
      }

      const data = await response.json();

      // Backend may return the job directly or wrapped in a data property
      const foundJob = data.data || data;

      if (!foundJob) {
        throw new Error('Evaluation job not found');
      }

      setJob(foundJob);

      // Fetch assistant config if assistant_id exists
      if (foundJob.assistant_id) {
        fetchAssistantConfig(foundJob.assistant_id, selectedKey.key);
      }
    } catch (err: any) {
      console.error('Failed to fetch job details:', err);
      setError(err.message || 'Failed to fetch evaluation job');
    } finally {
      setIsLoading(false);
    }
  }, [apiKeys, selectedKeyId, jobId]);

  // Fetch assistant config
  const fetchAssistantConfig = async (assistantId: string, apiKey: string) => {
    try {
      const response = await fetch(`/api/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKey,
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch assistant config for ${assistantId}:`, response.status);
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setAssistantConfig(result.data);
      }
    } catch (err: any) {
      console.error(`Failed to fetch assistant config for ${assistantId}:`, err);
    }
  };

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (selectedKeyId && jobId) {
      fetchJobDetails();
    }
  }, [selectedKeyId, jobId, fetchJobDetails]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!job || !scoreObject) {
      alert('No valid data available to export');
      return;
    }

    try {
      // Normalize to individual scores format (supports both new formats)
      const individual_scores = normalizeToIndividualScores(scoreObject);

      if (!individual_scores || individual_scores.length === 0) {
        alert('No valid data available to export');
        return;
      }

      // Build CSV content
      let csvContent = 'data:text/csv;charset=utf-8,';

      // Get all score names for header
      const firstItem = individual_scores[0];
      const scoreNames = firstItem?.trace_scores?.map(s => s.name) || [];

      // Header row
      csvContent += 'Trace ID,Job ID,Run Name,Dataset,Model,Status,Total Items,';
      csvContent += 'Question,Answer,Ground Truth,';
      csvContent += scoreNames.map(name => `${name},${name} (comment)`).join(',') + '\n';

      // Data rows
      individual_scores.forEach((item) => {
        const row = [
          item.trace_id || 'N/A',
          job.id,
          `"${job.run_name.replace(/"/g, '""')}"`,
          `"${job.dataset_name.replace(/"/g, '""')}"`,
          assistantConfig?.model || job.config?.model || 'N/A',
          job.status,
          job.total_items,
          `"${(item.input?.question || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${(item.output?.answer || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          `"${(item.metadata?.ground_truth || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`,
          ...scoreNames.flatMap(name => {
            const score = item.trace_scores?.find(s => s.name === name);
            return [
              score ? score.value : 'N/A',
              score?.comment ? `"${score.comment.replace(/"/g, '""').replace(/\n/g, ' ')}"` : ''
            ];
          })
        ].join(',');

        csvContent += row + '\n';
      });

      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `evaluation_${job.id}_${job.run_name.replace(/[^a-z0-9]/gi, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export CSV. Please check the console for details.');
    }
  };


  if (isLoading) {
    return (
      <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-pulse" style={{ color: 'hsl(330, 3%, 49%)' }}>
                <svg
                  className="mx-auto h-12 w-12 mb-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <p className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>
                  Loading evaluation report...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
        <div className="flex flex-1 overflow-hidden">
          <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />
          <div className="flex-1 flex items-center justify-center">
            <div className="border rounded-lg p-8 max-w-md" style={{ backgroundColor: 'hsl(8, 86%, 95%)', borderColor: 'hsl(8, 86%, 80%)' }}>
              <p className="text-lg font-medium mb-4" style={{ color: 'hsl(8, 86%, 40%)' }}>
                {error || 'Evaluation job not found'}
              </p>
              <button
                onClick={() => router.push('/evaluations?tab=results')}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{
                  backgroundColor: 'hsl(167, 59%, 22%)',
                  color: 'hsl(0, 0%, 100%)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
              >
                Back to Evaluations
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const scoreObject = getScoreObject(job);
  const hasScore = !!scoreObject;
  const statusColors = getStatusColor(job.status);

  // Check if we have new score structure (V1 or V2)
  const isNewFormat = isNewScoreObject(scoreObject) || isNewScoreObjectV2(scoreObject);

  // Safe access to summary scores
  const summaryScores = (isNewFormat && scoreObject && 'summary_scores' in scoreObject)
    ? scoreObject.summary_scores || []
    : [];

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header with Back Button */}
          <div className="border-b px-6 py-4" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 rounded-md transition-colors flex-shrink-0"
                style={{
                  borderWidth: '1px',
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              {/* Back Button */}
              <button
                onClick={() => router.push('/evaluations?tab=results')}
                className="p-2 rounded-md transition-colors flex items-center gap-2"
                style={{
                  borderWidth: '1px',
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                <span className="text-sm font-medium">Back to Results</span>
              </button>

              <div className="flex-1">
                <h1 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Evaluation Report</h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                  {job.run_name}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsConfigModalOpen(true)}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: 'hsl(0, 0%, 100%)',
                    borderWidth: '1px',
                    borderColor: 'hsl(167, 59%, 70%)',
                    color: 'hsl(167, 59%, 22%)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 95%)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
                >
                  View Config
                </button>
                <button
                  onClick={handleExportCSV}
                  disabled={!hasScore}
                  className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: hasScore ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 95%)',
                    color: hasScore ? 'hsl(0, 0%, 100%)' : 'hsl(330, 3%, 49%)',
                    cursor: hasScore ? 'pointer' : 'not-allowed',
                    borderWidth: hasScore ? '0' : '1px',
                    borderColor: hasScore ? 'transparent' : 'hsl(0, 0%, 85%)'
                  }}
                  onMouseEnter={(e) => {
                    if (hasScore) e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)';
                  }}
                  onMouseLeave={(e) => {
                    if (hasScore) e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)';
                  }}
                >
                  Export CSV
                </button>
              </div>
            </div>
            {assistantConfig && (
              <div className="flex items-center gap-2 mt-3 ml-20">
                <span className="text-xs px-2 py-1 rounded-md font-medium" style={{
                  backgroundColor: 'hsl(167, 59%, 95%)',
                  color: 'hsl(167, 59%, 22%)',
                  borderWidth: '1px',
                  borderColor: 'hsl(167, 59%, 70%)'
                }}>
                  Assistant: {assistantConfig.name}
                </span>
              </div>
            )}
          </div>

          {/* Scrollable Content */}
          <div className="flex overflow-auto p-6" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
            <div className="max-w-8xl mx-auto space-y-6">
              {/* Summary Section */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Summary</h3>
                </div>
                <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Dataset</div>
                      <div className="text-base font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.dataset_name}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Status</div>
                      <div
                        className="inline-block px-3 py-1 rounded text-sm font-semibold"
                        style={{
                          backgroundColor: statusColors.bg,
                          borderWidth: '1px',
                          borderColor: statusColors.border,
                          color: statusColors.text
                        }}
                      >
                        {job.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
                    <div>
                      <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Started At</div>
                      <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>{formatDate(job.inserted_at)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Last Updated At</div>
                      <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>{formatDate(job.updated_at)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Metrics Section */}
              {hasScore && isNewFormat ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(330, 3%, 49%)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Metrics Overview</h3>
                  </div>
                  <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
                    {summaryScores.length > 0 ? (
                      <div className={
                        summaryScores.length === 2
                        ? "flex justify-around items-start gap-6"
                        : "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                      }>
                        {summaryScores.filter(s => s.data_type === 'NUMERIC').map((summary) => (
                        <div key={summary.name} className="text-center">
                          <div className="text-xs uppercase font-semibold mb-3" style={{ color: 'hsl(330, 3%, 49%)' }}>{summary.name}</div>
                          <div className="text-3xl font-bold" style={{ color: 'hsl(167, 59%, 22%)' }}>
                            {summary.avg !== undefined ? summary.avg.toFixed(3) : 'N/A'}
                          </div>
                          {summary.std !== undefined && (
                            <div className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                              ±{summary.std.toFixed(3)}
                            </div>
                          )}
                          <div className="text-xs mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                            {summary.total_pairs} pairs
                          </div>
                        </div>
                        ))}
                        {summaryScores.filter(s => s.data_type === 'CATEGORICAL').map((summary) => (
                          <div key={summary.name} className="text-center">
                            <div className="text-xs uppercase font-semibold mb-3" style={{ color: 'hsl(330, 3%, 49%)' }}>{summary.name}</div>
                            <div className="text-left">
                              {summary.distribution && Object.entries(summary.distribution).map(([key, value]) => (
                                <div key={key} className="flex justify-between items-center px-3 py-1 mb-1 rounded" style={{ backgroundColor: 'hsl(0, 0%, 98%)' }}>
                                  <span className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{key}</span>
                                  <span className="text-sm font-bold" style={{ color: 'hsl(167, 59%, 22%)' }}>{value}</span>
                                </div>
                              ))}
                            </div>
                            <div className="text-xs mt-2" style={{ color: 'hsl(330, 3%, 49%)' }}>
                              {summary.total_pairs} pairs
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-4" style={{ color: 'hsl(330, 3%, 49%)' }}>
                        <p className="text-sm">No summary scores available</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-6 text-center" style={{ backgroundColor: 'hsl(8, 86%, 95%)', borderColor: 'hsl(8, 86%, 80%)' }}>
                  <p className="text-sm font-medium" style={{ color: 'hsl(8, 86%, 40%)' }}>
                    {job.error_message ? 'Evaluation Failed' : 'No results available yet'}
                  </p>
                  {job.error_message && (
                    <p className="text-xs mt-2" style={{ color: 'hsl(8, 86%, 40%)' }}>
                      {job.error_message}
                    </p>
                  )}
                </div>
              )}

              {/* Detailed Results Section */}
              {hasScore && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(330, 3%, 49%)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Detailed Results</h3>
                    {isNewFormat && (
                      <span className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                        ({normalizeToIndividualScores(scoreObject).length} items)
                      </span>
                    )}
                  </div>
                  <DetailedResultsTable job={job} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Config Modal */}
      <ConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        job={job}
        assistantConfig={assistantConfig}
      />
    </div>
  );
}
