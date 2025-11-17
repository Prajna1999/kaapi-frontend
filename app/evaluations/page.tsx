/**
 * SimplifiedEval.tsx - Simplified One-Click Evaluation Flow
 *
 * Two-tab structure:
 * 1. Upload Tab: Upload QnA dataset → Run evaluation
 * 2. Results Tab: View evaluation results with metrics and detailed logs
 */

"use client"
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'
import { APIKey } from '../keystore/page';
import { STORAGE_KEY } from '../keystore/page';
import { Dataset, DATASETS_STORAGE_KEY, UploadDatasetModal } from '../datasets/page';

type Tab = 'upload' | 'results';

export default function SimplifiedEval() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  // Dataset selection
  const [storedDatasets, setStoredDatasets] = useState<Dataset[]>([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState<string>('');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState<string>('');
  const [duplicationFactor, setDuplicationFactor] = useState<string>('1');
  const [isUploading, setIsUploading] = useState(false);

  // Evaluation fields
  const [experimentName, setExperimentName] = useState<string>('');
  const [modelName, setModelName] = useState<string>('gpt-4');
  const [instructions, setInstructions] = useState<string>('You are a helpful FAQ assistant.');
  const [vectorStoreIds, setVectorStoreIds] = useState<string>('');
  const [maxNumResults, setMaxNumResults] = useState<string>('3');
  const [assistantId, setAssistantId] = useState<string>('');
  const [useAssistantId, setUseAssistantId] = useState<boolean>(false);

  const router = useRouter();

  // Load API keys from localStorage and auto-select if only one exists
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
        // Auto-select the first (and only) API key
        if (keys.length > 0) {
          setSelectedKeyId(keys[0].id);
        }
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Fetch datasets from backend
  const loadStoredDatasets = async () => {
    if (!apiKeys.length) return;

    try {
      const response = await fetch('/api/evaluations/datasets', {
        method: 'GET',
        headers: {
          'X-API-KEY': apiKeys[0].key,
        },
      });

      if (!response.ok) {
        console.error('Failed to fetch datasets:', response.status);
        return;
      }

      const data = await response.json();
      const datasetList = Array.isArray(data) ? data : (data.data || []);
      setStoredDatasets(datasetList);
    } catch (e) {
      console.error('Failed to load datasets:', e);
    }
  };

  useEffect(() => {
    if (apiKeys.length > 0) {
      loadStoredDatasets();
    }
  }, [apiKeys]);

  const handleStoredDatasetSelect = (datasetId: string) => {
    setSelectedDatasetId(datasetId);
  };

  // Upload modal handlers
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      event.target.value = '';
      return;
    }

    setUploadedFile(file);
    const nameFromFile = file.name.replace(/\.csv$/i, '');
    setDatasetName(nameFromFile);
  };

  const handleUploadFromModal = async () => {
    if (!uploadedFile) {
      alert('Please select a file first');
      return;
    }

    if (!datasetName.trim()) {
      alert('Please enter a dataset name');
      return;
    }

    if (apiKeys.length === 0) {
      alert('No API key found');
      return;
    }

    setIsUploading(true);

    try {
      // Prepare FormData for upload
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('dataset_name', datasetName.trim());

      if (duplicationFactor && parseInt(duplicationFactor) > 1) {
        formData.append('duplication_factor', duplicationFactor);
      }

      // Upload to backend
      const response = await fetch('/api/evaluations/datasets', {
        method: 'POST',
        body: formData,
        headers: {
          'X-API-KEY': apiKeys[0].key,
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Dataset uploaded successfully:', data);

      // Refresh the datasets list
      await loadStoredDatasets();

      // Auto-select the newly uploaded dataset
      if (data.dataset_id) {
        setSelectedDatasetId(data.dataset_id.toString());
      }

      // Reset form and close modal
      setUploadedFile(null);
      setDatasetName('');
      setDuplicationFactor('1');
      setIsUploadModalOpen(false);

      alert('Dataset uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunEvaluation = async() => {
    if (!selectedKeyId) {
      alert('Please select an API key first');
      return;
    }

    if (!selectedDatasetId) {
      alert('Please select a dataset first');
      return;
    }

    if (!experimentName.trim()) {
      alert('Please enter an experiment name');
      return;
    }

    // Get the selected API key
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) {
      alert('Selected API key not found');
      return;
    }

    setIsEvaluating(true);

    // Create the evaluation job using the selected dataset_id
    try {
      // Build the request payload
      const payload: any = {
        dataset_id: parseInt(selectedDatasetId),
        experiment_name: experimentName.trim(),
      };

      // Add assistant_id if using assistant_id mode
      if (useAssistantId && assistantId) {
        payload.assistant_id = assistantId.trim();
        payload.config = {};
      } else {
        // Add optional config if fields are provided
        const hasConfig = modelName || instructions || vectorStoreIds;
        if (hasConfig) {
          payload.config = {};

          if (modelName) {
            payload.config.model = modelName;
          }

          if (instructions) {
            payload.config.instructions = instructions;
          }

          // Add tools if vector store IDs are provided
          if (vectorStoreIds) {
            const vectorStoreIdArray = vectorStoreIds.split(',').map(id => id.trim()).filter(id => id);
            if (vectorStoreIdArray.length > 0) {
              payload.config.tools = [
                {
                  type: 'file_search',
                  vector_store_ids: vectorStoreIdArray,
                  // max_num_results: parseInt(maxNumResults) || 3,
                }
              ];
              payload.config.include = ['file_search_call.results'];
            }
          }
        }
      }

      // Call evaluation endpoint via proxy
      const response = await fetch('/api/evaluations', {
        method: 'POST',
        headers: {
          'X-API-KEY': selectedKey.key,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Evaluation failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('Evaluation job created:', data);

      // Redirect to results tab to view evaluation status
      setIsEvaluating(false);
      setActiveTab('results');

      // Show success message
      alert(`Evaluation job created successfully! Job ID: ${data.id}`);
    } catch(error) {
      console.error('Error:', error);
      alert(`Failed to run evaluation: ${error.message}`);
      setIsEvaluating(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Full Height */}
        <aside
          className="border-r transition-all duration-300 ease-in-out h-full flex-shrink-0"
          style={{
            width: sidebarCollapsed ? '0px' : '240px',
            backgroundColor: 'hsl(0, 0%, 100%)',
            borderColor: 'hsl(0, 0%, 85%)',
            overflow: 'hidden',
          }}
        >
          <div className="px-6 py-4" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
            <h2 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Kaapi Konsole</h2>
            <p className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>A Tech4Dev Product</p>
          </div>
          <nav className="p-4 space-y-2 h-full" style={{ width: '240px' }}>
            <button
              onClick={() => router.push('/evaluations')}
              className="w-full text-left px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium flex items-center gap-3"
              style={{
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Evaluations
            </button>
            <button
              onClick={() => router.push('/datasets')}
              className="w-full text-left px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium flex items-center gap-3"
              style={{
                backgroundColor: 'transparent',
                color: 'hsl(330, 3%, 49%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 96.5%)';
                e.currentTarget.style.color = 'hsl(330, 3%, 19%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'hsl(330, 3%, 49%)';
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
              </svg>
              Datasets
            </button>
            <button
              onClick={() => router.push('/keystore')}
              className="w-full text-left px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium flex items-center gap-3"
              style={{
                backgroundColor: 'transparent',
                color: 'hsl(330, 3%, 49%)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 96.5%)';
                e.currentTarget.style.color = 'hsl(330, 3%, 19%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = 'hsl(330, 3%, 49%)';
              }}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Keystore
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title Section with Collapse Button */}
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
              <div>
                <h1 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Evaluations</h1>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('upload')}
                className="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderBottomColor: activeTab === 'upload' ? 'hsl(167, 59%, 22%)' : 'transparent',
                  color: activeTab === 'upload' ? 'hsl(167, 59%, 22%)' : 'hsl(330, 3%, 49%)'
                }}
              >
                1. Upload & Run
              </button>
              <button
                onClick={() => setActiveTab('results')}
                className="px-6 py-3 text-sm font-medium border-b-2 transition-colors"
                style={{
                  borderBottomColor: activeTab === 'results' ? 'hsl(167, 59%, 22%)' : 'transparent',
                  color: activeTab === 'results' ? 'hsl(167, 59%, 22%)' : 'hsl(330, 3%, 49%)'
                }}
              >
                2. Results
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
            <div className="max-w-7xl mx-auto page-transition">
              {activeTab === 'upload' ? (
                <UploadTab
                  isEvaluating={isEvaluating}
                  apiKeys={apiKeys}
                  selectedKeyId={selectedKeyId}
                  storedDatasets={storedDatasets}
                  selectedDatasetId={selectedDatasetId}
                  experimentName={experimentName}
                  modelName={modelName}
                  instructions={instructions}
                  vectorStoreIds={vectorStoreIds}
                  maxNumResults={maxNumResults}
                  assistantId={assistantId}
                  useAssistantId={useAssistantId}
                  onKeySelect={setSelectedKeyId}
                  onStoredDatasetSelect={handleStoredDatasetSelect}
                  onOpenUploadModal={() => setIsUploadModalOpen(true)}
                  onExperimentNameChange={setExperimentName}
                  onModelNameChange={setModelName}
                  onInstructionsChange={setInstructions}
                  onVectorStoreIdsChange={setVectorStoreIds}
                  onMaxNumResultsChange={setMaxNumResults}
                  onAssistantIdChange={setAssistantId}
                  onUseAssistantIdChange={setUseAssistantId}
                  onRunEvaluation={handleRunEvaluation}
                />
              ) : (
                <ResultsTab apiKeys={apiKeys} selectedKeyId={selectedKeyId} />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dataset Modal */}
      {isUploadModalOpen && (
        <UploadDatasetModal
          selectedFile={uploadedFile}
          datasetName={datasetName}
          duplicationFactor={duplicationFactor}
          isUploading={isUploading}
          onFileSelect={handleFileSelect}
          onDatasetNameChange={setDatasetName}
          onDuplicationFactorChange={setDuplicationFactor}
          onUpload={handleUploadFromModal}
          onClose={() => {
            setIsUploadModalOpen(false);
            setUploadedFile(null);
            setDatasetName('');
            setDuplicationFactor('1');
          }}
        />
      )}
    </div>
  );
}

// ============ UPLOAD TAB COMPONENT ============
interface UploadTabProps {
  isEvaluating: boolean;
  apiKeys: APIKey[];
  selectedKeyId: string;
  storedDatasets: Dataset[];
  selectedDatasetId: string;
  experimentName: string;
  modelName: string;
  instructions: string;
  vectorStoreIds: string;
  maxNumResults: string;
  assistantId: string;
  useAssistantId: boolean;
  onKeySelect: (keyId: string) => void;
  onStoredDatasetSelect: (datasetId: string) => void;
  onOpenUploadModal: () => void;
  onExperimentNameChange: (value: string) => void;
  onModelNameChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
  onVectorStoreIdsChange: (value: string) => void;
  onMaxNumResultsChange: (value: string) => void;
  onAssistantIdChange: (value: string) => void;
  onUseAssistantIdChange: (value: boolean) => void;
  onRunEvaluation: () => void;
}

function UploadTab({
  isEvaluating,
  apiKeys,
  selectedKeyId,
  storedDatasets,
  selectedDatasetId,
  experimentName,
  modelName,
  instructions,
  vectorStoreIds,
  maxNumResults,
  assistantId,
  useAssistantId,
  onKeySelect,
  onStoredDatasetSelect,
  onOpenUploadModal,
  onExperimentNameChange,
  onModelNameChange,
  onInstructionsChange,
  onVectorStoreIdsChange,
  onMaxNumResultsChange,
  onAssistantIdChange,
  onUseAssistantIdChange,
  onRunEvaluation,
}: UploadTabProps) {
  const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
  const selectedDataset = storedDatasets.find(d => d.dataset_id.toString() === selectedDatasetId);

  const [showHowItWorksTooltip, setShowHowItWorksTooltip] = useState(false);
  const [showCsvFormatTooltip, setShowCsvFormatTooltip] = useState(false);

  return (
    <div className="space-y-6">
      {/* API Key Selection Card */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Select API Key</h2>
          <div className="relative">
            <button
              onMouseEnter={() => setShowHowItWorksTooltip(true)}
              onMouseLeave={() => setShowHowItWorksTooltip(false)}
              className="p-1 rounded-full transition-colors"
              style={{
                color: 'hsl(330, 3%, 49%)',
                backgroundColor: showHowItWorksTooltip ? 'hsl(0, 0%, 95%)' : 'transparent'
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showHowItWorksTooltip && (
              <div
                className="absolute left-0 top-full mt-2 w-96 border rounded-lg p-4 shadow-lg z-50 animate-fadeIn"
                style={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  borderColor: 'hsl(0, 0%, 85%)'
                }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>How it works</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
                  <li>Select an API key from your keystore</li>
                  <li>Select a stored dataset or upload a new CSV file (format: question,answer columns)</li>
                  <li>Configure evaluation settings (experiment name required, other fields optional)</li>
                  <li>Click "Run Evaluation" to start the evaluation process</li>
                  <li>Wait for processing to complete (automatic redirect to results)</li>
                  <li>View detailed results and metrics in the Results tab</li>
                </ol>
              </div>
            )}
          </div>
        </div>

        {apiKeys.length === 0 ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
            <div style={{ color: 'hsl(330, 3%, 49%)' }}>
              <svg
                className="mx-auto h-12 w-12 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
              <p className="font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>No API key found</p>
              <p className="text-sm mb-4">You need to add an API key before running evaluations</p>
              <a
                href="/keystore"
                className="inline-block px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ backgroundColor: 'hsl(167, 59%, 22%)', color: 'hsl(0, 0%, 100%)' }}
              >
                Go to Keystore
              </a>
            </div>
          </div>
        ) : selectedKey ? (
          <div className="border rounded-lg p-4" style={{ backgroundColor: 'hsl(134, 61%, 95%)', borderColor: 'hsl(134, 61%, 70%)' }}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(134, 61%, 25%)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(134, 61%, 25%)' }}>
                    <span className="font-semibold">{selectedKey.provider} - {selectedKey.label}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(134, 61%, 30%)' }}>
                    Key: {selectedKey.key.substring(0, 8)}...{selectedKey.key.substring(selectedKey.key.length - 4)}
                  </p>
                </div>
              </div>
              <a
                href="/keystore"
                className="px-3 py-2 rounded-md text-xs font-medium transition-colors"
                style={{
                  borderWidth: '1px',
                  borderColor: 'hsl(134, 61%, 40%)',
                  backgroundColor: 'transparent',
                  color: 'hsl(134, 61%, 25%)'
                }}
              >
                Manage
              </a>
            </div>
          </div>
        ) : null}
      </div>

      {/* Dataset Selection Card */}
      <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <div className="flex items-center gap-2 mb-4">
          <h2 className="text-xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Select QnA Dataset</h2>
          <div className="relative">
            <button
              onMouseEnter={() => setShowCsvFormatTooltip(true)}
              onMouseLeave={() => setShowCsvFormatTooltip(false)}
              className="p-1 rounded-full transition-colors"
              style={{
                color: 'hsl(330, 3%, 49%)',
                backgroundColor: showCsvFormatTooltip ? 'hsl(0, 0%, 95%)' : 'transparent'
              }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            {showCsvFormatTooltip && (
              <div
                className="absolute left-0 top-full mt-2 w-80 border rounded-lg p-4 shadow-lg z-50 animate-fadeIn"
                style={{
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  borderColor: 'hsl(0, 0%, 85%)'
                }}
              >
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>Expected CSV Format</h3>
                <pre className="text-xs p-3 rounded-md border overflow-x-auto font-mono" style={{ backgroundColor: 'hsl(0, 0%, 96.5%)', borderColor: 'hsl(0, 0%, 85%)', color: 'hsl(330, 3%, 19%)' }}>
{`question,answer
"What is X?","Answer Y"
"Explain Z","Description of Z"`}
                </pre>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={selectedDatasetId}
              onChange={(e) => onStoredDatasetSelect(e.target.value)}
              className="flex-1 px-4 py-3 rounded-md border focus:outline-none focus:ring-2 text-sm"
              style={{
                borderColor: selectedDatasetId ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                backgroundColor: 'hsl(0, 0%, 100%)',
                color: 'hsl(330, 3%, 19%)'
              }}
            >
              <option value="">-- Select a Dataset --</option>
              {storedDatasets.map((dataset) => (
                <option key={dataset.dataset_id} value={dataset.dataset_id}>
                  {dataset.dataset_name} ({dataset.total_items} items)
                </option>
              ))}
            </select>
            <button
              onClick={onOpenUploadModal}
              className="px-4 py-3 rounded-md border text-sm font-medium transition-colors flex items-center gap-2"
              style={{
                borderColor: 'hsl(167, 59%, 22%)',
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
              title="Upload New Dataset"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {storedDatasets.length === 0 && (
            <div className="border-2 border-dashed rounded-lg p-6 text-center" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <div style={{ color: 'hsl(330, 3%, 49%)' }}>
                <svg
                  className="mx-auto h-8 w-8 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
                <p className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>No datasets found</p>
                <p className="text-xs mt-1">Click the + button above to upload your first dataset</p>
              </div>
            </div>
          )}

          {selectedDataset && (
            <div className="border rounded-lg p-4" style={{ backgroundColor: 'hsl(134, 61%, 95%)', borderColor: 'hsl(134, 61%, 70%)' }}>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(134, 61%, 25%)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium" style={{ color: 'hsl(134, 61%, 25%)' }}>
                    Selected: <span className="font-semibold">{selectedDataset.dataset_name}</span>
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'hsl(134, 61%, 30%)' }}>
                    Dataset ID: {selectedDataset.dataset_id} | Total Items: {selectedDataset.total_items} | Duplication: ×{selectedDataset.duplication_factor}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Evaluation Configuration Card */}
      {selectedDatasetId && (
        <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Evaluation Configuration</h2>

            {/* Play Button */}
            <button
              onClick={onRunEvaluation}
              disabled={!selectedDatasetId || !experimentName.trim() || isEvaluating || (!useAssistantId && (!modelName.trim() || !instructions.trim())) || (useAssistantId && !assistantId.trim())}
              className="rounded-full p-4 transition-all shadow-md hover:shadow-lg"
              style={{
                backgroundColor: !selectedDatasetId || !experimentName.trim() || isEvaluating || (!useAssistantId && (!modelName.trim() || !instructions.trim())) || (useAssistantId && !assistantId.trim()) ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
                color: !selectedDatasetId || !experimentName.trim() || isEvaluating || (!useAssistantId && (!modelName.trim() || !instructions.trim())) || (useAssistantId && !assistantId.trim()) ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
                cursor: !selectedDatasetId || !experimentName.trim() || isEvaluating || (!useAssistantId && (!modelName.trim() || !instructions.trim())) || (useAssistantId && !assistantId.trim()) ? 'not-allowed' : 'pointer',
                borderWidth: !selectedDatasetId || !experimentName.trim() || isEvaluating || (!useAssistantId && (!modelName.trim() || !instructions.trim())) || (useAssistantId && !assistantId.trim()) ? '1px' : '0',
                borderColor: !selectedDatasetId || !experimentName.trim() || isEvaluating || (!useAssistantId && (!modelName.trim() || !instructions.trim())) || (useAssistantId && !assistantId.trim()) ? 'hsl(0, 0%, 85%)' : 'transparent',
                transform: isEvaluating ? 'scale(0.95)' : 'scale(1)'
              }}
              onMouseEnter={(e) => {
                if (selectedDatasetId && experimentName.trim() && !isEvaluating && ((useAssistantId && assistantId.trim()) || (!useAssistantId && modelName.trim() && instructions.trim()))) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedDatasetId && experimentName.trim() && !isEvaluating && ((useAssistantId && assistantId.trim()) || (!useAssistantId && modelName.trim() && instructions.trim()))) {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)';
                }
              }}
              title={!selectedDatasetId ? 'Select a dataset first' : !experimentName.trim() ? 'Enter an experiment name' : useAssistantId && !assistantId.trim() ? 'Enter assistant ID' : !useAssistantId && !modelName.trim() ? 'Enter model name' : !useAssistantId && !instructions.trim() ? 'Enter instructions' : isEvaluating ? 'Creating evaluation job...' : 'Run Evaluation'}
            >
              {isEvaluating ? (
                <svg className="w-6 h-6 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
          </div>

          <div className="space-y-4">
            {/* Experiment Name - Required */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Experiment Name <span style={{ color: 'hsl(8, 86%, 40%)' }}>*</span>
              </label>
              <input
                type="text"
                value={experimentName}
                onChange={(e) => onExperimentNameChange(e.target.value)}
                placeholder="e.g., test_run_1"
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: experimentName ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                  backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>

            {/* Configuration Mode Toggle */}
            <div className="border-t border-b py-4" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Configuration Mode
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!useAssistantId}
                    onChange={() => onUseAssistantIdChange(false)}
                    disabled={isEvaluating}
                    className="w-4 h-4"
                    style={{ accentColor: 'hsl(167, 59%, 22%)' }}
                  />
                  <span className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Use Config (Model, Instructions, Tools)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={useAssistantId}
                    onChange={() => onUseAssistantIdChange(true)}
                    disabled={isEvaluating}
                    className="w-4 h-4"
                    style={{ accentColor: 'hsl(167, 59%, 22%)' }}
                  />
                  <span className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Use Assistant ID
                  </span>
                </label>
              </div>
            </div>

            {/* Assistant ID Field - Shown when useAssistantId is true */}
            {useAssistantId ? (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                  Assistant ID <span style={{ color: 'hsl(8, 86%, 40%)' }}>*</span>
                </label>
                <input
                  type="text"
                  value={assistantId}
                  onChange={(e) => onAssistantIdChange(e.target.value)}
                  placeholder="e.g., asst_xyz"
                  disabled={isEvaluating}
                  className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                  style={{
                    borderColor: assistantId ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                    backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                    color: 'hsl(330, 3%, 19%)'
                  }}
                />
                <p className="text-xs mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                  Configuration will be fetched from the assistant in the database
                </p>
              </div>
            ) : (
              <>
                {/* Model Name - Required */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Model <span style={{ color: 'hsl(8, 86%, 40%)' }}>*</span>
                  </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => onModelNameChange(e.target.value)}
                placeholder="e.g., gpt-4"
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: modelName ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                  backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>

            {/* Instructions - Required */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Instructions <span style={{ color: 'hsl(8, 86%, 40%)' }}>*</span>
              </label>
              <textarea
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder="System instructions for the model"
                rows={3}
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: instructions ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                  backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>

            {/* Vector Store Configuration */}
            <div className="border-t pt-4" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(330, 3%, 19%)' }}>
                File Search Configuration (Optional)
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Vector Store IDs
                  </label>
                  <input
                    type="text"
                    value={vectorStoreIds}
                    onChange={(e) => onVectorStoreIdsChange(e.target.value)}
                    placeholder="e.g., vs_12345, vs_67890"
                    disabled={isEvaluating}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    Comma-separated list of vector store IDs for file search
                  </p>
                </div>
{/* 
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Max Number of Results
                  </label>
                  <input
                    type="number"
                    value={maxNumResults}
                    onChange={(e) => onMaxNumResultsChange(e.target.value)}
                    placeholder="3"
                    min="1"
                    max="20"
                    disabled={isEvaluating}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                </div> */}
              </div>
            </div>
              </>
            )}
          </div>

          {/* Status Messages */}
          {isEvaluating && (
            <div className="mt-4 border rounded-lg p-3 animate-fadeIn" style={{ backgroundColor: 'hsl(202, 100%, 95%)', borderColor: 'hsl(202, 100%, 80%)' }}>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(202, 100%, 35%)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <p className="text-sm" style={{ color: 'hsl(202, 100%, 30%)' }}>
                  Uploading dataset and creating evaluation job...
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ TYPES ============
interface PerItemScore {
  trace_id: string;
  cosine_similarity: number;
}

interface CosineSimilarity {
  avg: number;
  std: number;
  total_pairs: number;
  per_item_scores: PerItemScore[];
}

interface ScoreObject {
  cosine_similarity: CosineSimilarity;
}

interface AssistantConfig {
  name: string;
  model: string;
  vector_store_ids: string[];
  project_id: number;
  organization_id: number;
  updated_at: string;
  deleted_at: string | null;
  instructions: string;
  assistant_id: string;
  temperature: number;
  max_num_results: number;
  id: number;
  inserted_at: string;
  is_deleted: boolean;
}

interface EvalJob {
  id: number;
  run_name: string;
  dataset_name: string;
  dataset_id: number;
  batch_job_id: number;
  embedding_batch_job_id: number | null;
  status: string;
  object_store_url: string | null;
  total_items: number;
  score: ScoreObject | null;
  error_message: string | null;
  config: {
    model?: string;
    instructions?: string;
    tools?: any[];
    include?: string[];
  };
  assistant_id?: string;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

// ============ RESULTS TAB COMPONENT ============
interface ResultsTabProps {
  apiKeys: APIKey[];
  selectedKeyId: string;
}

function ResultsTab({ apiKeys, selectedKeyId }: ResultsTabProps) {
  const [evalJobs, setEvalJobs] = useState<EvalJob[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assistantConfigs, setAssistantConfigs] = useState<Map<string, AssistantConfig>>(new Map());

  // Fetch evaluation jobs
  const fetchEvaluations = useCallback(async () => {
    if (!selectedKeyId) {
      setError('Please select an API key first');
      return;
    }

    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) {
      setError('Selected API key not found');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/evaluations', {
        method: 'GET',
        headers: {
          'X-API-KEY': selectedKey.key,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Failed to fetch evaluations: ${response.status}`);
      }

      const data = await response.json();

      // API may return an array or an object with data property
      const jobs = Array.isArray(data) ? data : (data.data || []);
      setEvalJobs(jobs);
    } catch (err: any) {
      console.error('Failed to fetch evaluations:', err);
      setError(err.message || 'Failed to fetch evaluation jobs');
    } finally {
      setIsLoading(false);
    }
  }, [apiKeys, selectedKeyId]);

  // Fetch assistant config for a given assistant_id
  const fetchAssistantConfig = useCallback(async (assistantId: string) => {
    if (!selectedKeyId) return;

    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) return;

    try {
      const response = await fetch(`/api/assistant/${assistantId}`, {
        method: 'GET',
        headers: {
          'X-API-KEY': selectedKey.key,
        },
      });

      if (!response.ok) {
        console.error(`Failed to fetch assistant config for ${assistantId}:`, response.status);
        return;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setAssistantConfigs(prev => new Map(prev).set(assistantId, result.data));
      }
    } catch (err: any) {
      console.error(`Failed to fetch assistant config for ${assistantId}:`, err);
    }
  }, [apiKeys, selectedKeyId]);

  // Fetch assistant configs for jobs with assistant_id
  useEffect(() => {
    const jobsWithAssistantId = evalJobs.filter(job => job.assistant_id);

    jobsWithAssistantId.forEach(job => {
      if (job.assistant_id && !assistantConfigs.has(job.assistant_id)) {
        fetchAssistantConfig(job.assistant_id);
      }
    });
  }, [evalJobs, assistantConfigs, fetchAssistantConfig]);

  // Fetch on mount and when API key changes
  useEffect(() => {
    if (selectedKeyId) {
      fetchEvaluations();
    }
  }, [selectedKeyId, fetchEvaluations]);

  // Auto-refresh every 10 seconds if there are processing jobs
  useEffect(() => {
    const hasProcessingJobs = evalJobs.some(job =>
      job.status === 'processing' || job.status === 'pending' || job.status === 'queued'
    );

    if (hasProcessingJobs) {
      const interval = setInterval(() => {
        fetchEvaluations();
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [evalJobs, fetchEvaluations]);

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
          Evaluation Jobs
        </h2>
        <button
          onClick={fetchEvaluations}
          disabled={isLoading}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: isLoading ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
            color: isLoading ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
            cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && evalJobs.length === 0 && (
        <div className="border rounded-lg p-8 text-center" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <p style={{ color: 'hsl(330, 3%, 49%)' }}>Loading evaluation jobs...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(8, 86%, 95%)', borderColor: 'hsl(8, 86%, 80%)' }}>
          <p className="text-sm font-medium" style={{ color: 'hsl(8, 86%, 40%)' }}>
            Error: {error}
          </p>
        </div>
      )}

      {/* No Jobs Yet */}
      {!isLoading && evalJobs.length === 0 && !error && (
        <div className="border rounded-lg p-8 text-center" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <p style={{ color: 'hsl(330, 3%, 49%)' }}>No evaluation jobs found. Create one from the Upload tab!</p>
        </div>
      )}

      {/* Evaluation Job Cards */}
      {evalJobs.length > 0 && (
        <div className="space-y-4">
          {evalJobs.map((job) => (
            <EvalJobCard
              key={job.id}
              job={job}
              assistantConfig={job.assistant_id ? assistantConfigs.get(job.assistant_id) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ SCORE DISPLAY COMPONENT ============
interface ScoreDisplayProps {
  score: ScoreObject | null;
  errorMessage: string | null;
}

function ScoreDisplay({ score, errorMessage }: ScoreDisplayProps) {
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
  const avgScore = cosine_similarity.avg.toFixed(2);
  const stdScore = cosine_similarity.std.toFixed(2);

  const getScoreColor = (similarity: number) => {
    if (similarity >= 0.7) {
      return { bg: 'hsl(134, 61%, 95%)', border: 'hsl(134, 61%, 70%)', text: 'hsl(134, 61%, 25%)' };
    } else if (similarity >= 0.5) {
      return { bg: 'hsl(46, 100%, 95%)', border: 'hsl(46, 100%, 80%)', text: 'hsl(46, 100%, 25%)' };
    } else {
      return { bg: 'hsl(8, 86%, 95%)', border: 'hsl(8, 86%, 80%)', text: 'hsl(8, 86%, 40%)' };
    }
  };

  const avgColors = getScoreColor(cosine_similarity.avg);

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
            {cosine_similarity.per_item_scores.map((item, index) => {
              const itemScore = item.cosine_similarity.toFixed(2);
              const itemColors = getScoreColor(item.cosine_similarity);

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

// ============ RESULTS MODAL COMPONENT ============
interface ResultsModalProps {
  job: EvalJob | null;
  assistantConfig?: AssistantConfig;
  onClose: () => void;
}

function ResultsModal({ job, assistantConfig, onClose }: ResultsModalProps) {
  if (!job) return null;

  // Handle ESC key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Export to CSV
  const handleExportCSV = () => {
    if (!job.score || !job.score.cosine_similarity) {
      alert('No data available to export');
      return;
    }

    const { cosine_similarity } = job.score;

    // Build CSV content
    let csvContent = 'data:text/csv;charset=utf-8,';

    // Header row
    csvContent += 'Job ID,Run Name,Dataset,Model,Assistant ID,Assistant Name,Temperature,Status,Total Items,';
    csvContent += 'Average Similarity,Standard Deviation,Total Pairs,';
    csvContent += 'Trace ID,Item Similarity Score\n';

    // Data rows - one row per item
    cosine_similarity.per_item_scores.forEach((item, index) => {
      const row = [
        job.id,
        `"${job.run_name}"`,
        `"${job.dataset_name}"`,
        assistantConfig?.model || job.config?.model || 'N/A',
        job.assistant_id || 'N/A',
        assistantConfig?.name ? `"${assistantConfig.name}"` : 'N/A',
        assistantConfig?.temperature !== undefined ? assistantConfig.temperature : 'N/A',
        job.status,
        job.total_items,
        cosine_similarity.avg.toFixed(2),
        cosine_similarity.std.toFixed(2),
        cosine_similarity.total_pairs,
        item.trace_id,
        item.cosine_similarity.toFixed(2)
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
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return { bg: 'hsl(134, 61%, 95%)', border: 'hsl(134, 61%, 70%)', text: 'hsl(134, 61%, 25%)' };
      case 'processing':
      case 'pending':
      case 'queued':
        return { bg: 'hsl(46, 100%, 95%)', border: 'hsl(46, 100%, 80%)', text: 'hsl(46, 100%, 25%)' };
      case 'failed':
      case 'error':
        return { bg: 'hsl(8, 86%, 95%)', border: 'hsl(8, 86%, 80%)', text: 'hsl(8, 86%, 40%)' };
      default:
        return { bg: 'hsl(0, 0%, 100%)', border: 'hsl(0, 0%, 85%)', text: 'hsl(330, 3%, 49%)' };
    }
  };

  const getScoreColor = (similarity: number) => {
    if (similarity >= 0.7) {
      return { bg: 'hsl(134, 61%, 95%)', border: 'hsl(134, 61%, 70%)', text: 'hsl(134, 61%, 25%)' };
    } else if (similarity >= 0.5) {
      return { bg: 'hsl(46, 100%, 95%)', border: 'hsl(46, 100%, 80%)', text: 'hsl(46, 100%, 25%)' };
    } else {
      return { bg: 'hsl(8, 86%, 95%)', border: 'hsl(8, 86%, 80%)', text: 'hsl(8, 86%, 40%)' };
    }
  };

  const statusColors = getStatusColor(job.status);
  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();

  const hasScore = job.score && job.score.cosine_similarity;
  const avgScore = hasScore ? job.score.cosine_similarity.avg.toFixed(2) : 'N/A';
  const stdScore = hasScore ? job.score.cosine_similarity.std.toFixed(2) : 'N/A';
  const totalPairs = hasScore ? job.score.cosine_similarity.total_pairs : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modalBackdrop"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      >
        {/* Modal Content */}
        <div
          className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-lg shadow-2xl animate-modalContent"
          style={{ backgroundColor: 'hsl(0, 0%, 100%)' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
            <div>
              <h2 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Evaluation Report
              </h2>
              <p className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                {job.run_name}
              </p>
              {assistantConfig && (
                <div className="flex items-center gap-2 mt-2">
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
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto p-6 space-y-6" style={{ maxHeight: 'calc(90vh - 200px)' }}>
            {/* Summary Section */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(330, 3%, 49%)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Summary</h3>
                {assistantConfig && (
                  <span className="text-xs px-2 py-1 rounded-md font-medium ml-auto" style={{
                    backgroundColor: 'hsl(167, 59%, 95%)',
                    color: 'hsl(167, 59%, 22%)',
                    borderWidth: '1px',
                    borderColor: 'hsl(167, 59%, 70%)'
                  }}>
                    Assistant: {assistantConfig.name}
                  </span>
                )}
              </div>
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'hsl(0, 0%, 98%)', borderColor: 'hsl(0, 0%, 85%)' }}>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Job ID</div>
                    <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.id}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Dataset</div>
                    <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.dataset_name}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Model</div>
                    <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{assistantConfig?.model || job.config?.model || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Status</div>
                    <div
                      className="inline-block px-2 py-1 rounded text-xs font-semibold"
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
                  <div>
                    <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Total Items</div>
                    <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.total_items}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Batch Job ID</div>
                    <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.batch_job_id}</div>
                  </div>
                  {job.assistant_id && (
                    <div>
                      <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Assistant ID</div>
                      <div className="text-sm font-medium font-mono" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.assistant_id}</div>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
                  <div>
                    <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Created</div>
                    <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>{formatDate(job.inserted_at)}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Last Updated</div>
                    <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>{formatDate(job.updated_at)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Section */}
            {hasScore ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Metrics Overview</h3>
                </div>
                <div className="border rounded-lg p-4" style={{ backgroundColor: 'hsl(0, 0%, 98%)', borderColor: 'hsl(0, 0%, 85%)' }}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Average Similarity</div>
                      <div className="text-3xl font-bold" style={{ color: 'hsl(167, 59%, 22%)' }}>{avgScore}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Standard Deviation</div>
                      <div className="text-3xl font-bold" style={{ color: 'hsl(330, 3%, 49%)' }}>±{stdScore}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Total Pairs</div>
                      <div className="text-3xl font-bold" style={{ color: 'hsl(330, 3%, 19%)' }}>{totalPairs}</div>
                    </div>
                  </div>
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
            {hasScore && job.score.cosine_similarity.per_item_scores.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Detailed Results</h3>
                  <span className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    ({job.score.cosine_similarity.per_item_scores.length} items)
                  </span>
                </div>
                <div className="border rounded-lg overflow-hidden" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
                  <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                    {job.score.cosine_similarity.per_item_scores.map((item, index) => {
                      const itemScore = item.cosine_similarity.toFixed(2);
                      const itemColors = getScoreColor(item.cosine_similarity);

                      return (
                        <div
                          key={item.trace_id}
                          className="px-4 py-3 border-b transition-colors"
                          style={{
                            borderColor: 'hsl(0, 0%, 92%)',
                            backgroundColor: 'hsl(0, 0%, 100%)'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 98%)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
                        >
                          <div className="flex items-center justify-between gap-4 mb-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold" style={{ color: 'hsl(330, 3%, 49%)' }}>
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
                            <div
                              className="px-3 py-1 rounded text-sm font-semibold whitespace-nowrap"
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
                          <div
                            className="h-2 rounded-full overflow-hidden"
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
                </div>
              </div>
            )}

            {/* Configuration Section */}
            {(assistantConfig || (job.config && (job.config.instructions || job.config.tools))) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Configuration</h3>
                </div>
                <div className="border rounded-lg p-4 space-y-3" style={{ backgroundColor: 'hsl(0, 0%, 98%)', borderColor: 'hsl(0, 0%, 85%)' }}>
                  {assistantConfig ? (
                    <>
                      {assistantConfig.instructions && (
                        <div>
                          <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Instructions</div>
                          <div className="text-sm p-3 rounded-md font-mono whitespace-pre-wrap" style={{
                            backgroundColor: 'hsl(0, 0%, 100%)',
                            color: 'hsl(330, 3%, 19%)',
                            maxHeight: '200px',
                            overflowY: 'auto'
                          }}>
                            {assistantConfig.instructions}
                          </div>
                        </div>
                      )}
                      {assistantConfig.temperature !== undefined && (
                        <div>
                          <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Temperature</div>
                          <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{assistantConfig.temperature}</div>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {job.config.instructions && (
                        <div>
                          <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Instructions</div>
                          <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.config.instructions}</div>
                        </div>
                      )}
                      {job.config.tools && job.config.tools.length > 0 && (
                        <div>
                          <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Tools</div>
                          <div className="flex flex-wrap gap-2">
                            {job.config.tools.map((tool, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-1 rounded text-xs font-medium"
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
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t flex items-center justify-between" style={{ borderColor: 'hsl(0, 0%, 85%)', backgroundColor: 'hsl(0, 0%, 98%)' }}>
            <button
              onClick={handleExportCSV}
              disabled={!hasScore}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                borderWidth: '1px',
                borderColor: hasScore ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                backgroundColor: hasScore ? 'hsl(167, 59%, 95%)' : 'hsl(0, 0%, 95%)',
                color: hasScore ? 'hsl(167, 59%, 22%)' : 'hsl(330, 3%, 49%)',
                cursor: hasScore ? 'pointer' : 'not-allowed'
              }}
              onMouseEnter={(e) => {
                if (hasScore) e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 90%)';
              }}
              onMouseLeave={(e) => {
                if (hasScore) e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 95%)';
              }}
            >
              Export CSV
            </button>
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
    </>
  );
}

// ============ EVAL JOB CARD COMPONENT ============
interface EvalJobCardProps {
  job: EvalJob;
  assistantConfig?: AssistantConfig;
}

function EvalJobCard({ job, assistantConfig }: EvalJobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return { bg: 'hsl(134, 61%, 95%)', border: 'hsl(134, 61%, 70%)', text: 'hsl(134, 61%, 25%)' };
      case 'processing':
      case 'pending':
      case 'queued':
        return { bg: 'hsl(46, 100%, 95%)', border: 'hsl(46, 100%, 80%)', text: 'hsl(46, 100%, 25%)' };
      case 'failed':
      case 'error':
        return { bg: 'hsl(8, 86%, 95%)', border: 'hsl(8, 86%, 80%)', text: 'hsl(8, 86%, 40%)' };
      default:
        return { bg: 'hsl(0, 0%, 100%)', border: 'hsl(0, 0%, 85%)', text: 'hsl(330, 3%, 49%)' };
    }
  };

  const statusColors = getStatusColor(job.status);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="border rounded-lg" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
      {/* Header - Always Visible (Clickable) */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between transition-colors"
        style={{
          backgroundColor: isExpanded ? 'hsl(0, 0%, 96.5%)' : 'transparent',
        }}
        onMouseEnter={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 98%)';
        }}
        onMouseLeave={(e) => {
          if (!isExpanded) e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <div className="flex items-center gap-4 flex-1">
          {/* Expand/Collapse Icon */}
          <svg
            className="w-5 h-5 flex-shrink-0 transition-transform"
            style={{
              color: 'hsl(330, 3%, 49%)',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)'
            }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>

          {/* Job Info */}
          <div className="flex-1 text-left">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
                {job.run_name}
              </h3>
              <span className="text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
                ID: {job.id}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
              <span>{job.dataset_name}</span>
              <span>•</span>
              <span>{job.total_items} items</span>
              <span>•</span>
              <ScoreDisplay score={job.score} errorMessage={job.error_message} />
            </div>
          </div>

          {/* Status Badge */}
          <div
            className="px-3 py-1 rounded-md text-sm font-medium"
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
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
          {/* Job Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 mb-4">
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Dataset</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.dataset_name}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Batch Job ID</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.batch_job_id}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Model</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>
                {assistantConfig?.model || job.config?.model || 'N/A'}
              </div>
            </div>
            {job.assistant_id && (
              <div>
                <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Assistant ID</div>
                <div className="text-sm font-medium font-mono" style={{ color: 'hsl(330, 3%, 19%)' }}>
                  {job.assistant_id}
                </div>
              </div>
            )}
          </div>

          {/* Assistant Config Details (if available) */}
          {assistantConfig && (
            <div className="border-t pt-4 mb-4" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Assistant Configuration</div>
              <div className="text-sm mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                <span className="font-medium">Name:</span> {assistantConfig.name}
              </div>
              {assistantConfig.instructions && (
                <div className="text-sm mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                  <span className="font-medium">Instructions:</span> {assistantConfig.instructions.substring(0, 100)}{assistantConfig.instructions.length > 100 ? '...' : ''}
                </div>
              )}
              {assistantConfig.temperature !== undefined && (
                <div className="text-sm mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                  <span className="font-medium">Temperature:</span> {assistantConfig.temperature}
                </div>
              )}
              {assistantConfig.vector_store_ids && assistantConfig.vector_store_ids.length > 0 && (
                <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>
                  <span className="font-medium">Vector Stores:</span> {assistantConfig.vector_store_ids.length} attached
                </div>
              )}
            </div>
          )}

          {/* Regular Config Details (if available and no assistant config) */}
          {!assistantConfig && job.config && (job.config.instructions || job.config.tools) && (
            <div className="border-t pt-4 mb-4" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(330, 3%, 49%)' }}>Configuration</div>
              {job.config.instructions && (
                <div className="text-sm mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                  <span className="font-medium">Instructions:</span> {job.config.instructions}
                </div>
              )}
              {job.config.tools && job.config.tools.length > 0 && (
                <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)' }}>
                  <span className="font-medium">Tools:</span> {job.config.tools.map(t => t.type).join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Error message (if failed) */}
          {job.error_message && (
            <div className="border-t pt-4 mb-4" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <div className="text-xs uppercase font-semibold mb-2" style={{ color: 'hsl(8, 86%, 40%)' }}>Error</div>
              <div className="text-sm" style={{ color: 'hsl(8, 86%, 40%)' }}>
                {job.error_message}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t pt-4 flex items-center justify-between text-xs" style={{ borderColor: 'hsl(0, 0%, 85%)', color: 'hsl(330, 3%, 49%)' }}>
            <div>
              <span className="font-medium">Created:</span> {formatDate(job.inserted_at)}
            </div>
            <div>
              <span className="font-medium">Updated:</span> {formatDate(job.updated_at)}
            </div>
          </div>

          {/* Actions */}
          <div className="border-t pt-4 mt-4" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
            <button
              onClick={() => setIsModalOpen(true)}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
            >
              View Results
            </button>
          </div>
        </div>
      )}

      {/* Results Modal */}
      {isModalOpen && (
        <ResultsModal job={job} assistantConfig={assistantConfig} onClose={() => setIsModalOpen(false)} />
      )}
    </div>
  );
}
