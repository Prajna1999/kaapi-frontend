/**
 * SimplifiedEval.tsx - Simplified One-Click Evaluation Flow
 *
 * Two-tab structure:
 * 1. Upload Tab: Upload QnA dataset → Run evaluation
 * 2. Results Tab: View evaluation results with metrics and detailed logs
 */

"use client"
import { useState, useEffect, useCallback, Suspense } from 'react';
import {format, toZonedTime} from "date-fns-tz"
import { useRouter, useSearchParams } from 'next/navigation'
import { APIKey } from '../keystore/page';
import { STORAGE_KEY } from '../keystore/page';
import { Dataset, DATASETS_STORAGE_KEY, UploadDatasetModal } from '../datasets/page';
import { EvalJob, AssistantConfig, ScoreObject } from '../components/types';
import { formatDate, getStatusColor } from '../components/utils';
import ConfigModal from '../components/ConfigModal';
import StatusBadge from '../components/StatusBadge';
import ScoreDisplay from '../components/ScoreDisplay';
import Sidebar from '../components/Sidebar';
import TabNavigation from '../components/TabNavigation';

type Tab = 'upload' | 'results';

function SimplifiedEvalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Initialize activeTab from URL query parameter, default to 'upload'
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab');
    return (tabParam === 'results' || tabParam === 'upload') ? tabParam as Tab : 'upload';
  });

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
  // const [temperature, setTemperature] = useState<string>('0.000001'); // TODO: Implement temperature feature later
  const [vectorStoreIds, setVectorStoreIds] = useState<string>('');
  const [maxNumResults, setMaxNumResults] = useState<string>('3');
  const [assistantId, setAssistantId] = useState<string>('');
  const [useAssistantId, setUseAssistantId] = useState<boolean>(false);

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

          // TODO: Implement temperature feature later
          // if (temperature) {
          //   payload.config.temperature = parseFloat(temperature);
          // }

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
        <Sidebar collapsed={sidebarCollapsed} activeRoute="/evaluations" />

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
          <TabNavigation
            tabs={[
              { id: 'upload', label: '1. Upload & Run' },
              { id: 'results', label: '2. Results' }
            ]}
            activeTab={activeTab}
            onTabChange={(tabId) => setActiveTab(tabId as Tab)}
          />

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
                  // temperature={temperature} // TODO: Implement temperature feature later
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
                  // onTemperatureChange={setTemperature} // TODO: Implement temperature feature later
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
  // temperature: string; // TODO: Implement temperature feature later
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
  // onTemperatureChange: (value: string) => void; // TODO: Implement temperature feature later
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
  // temperature, // TODO: Implement temperature feature later
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

            {/* TODO: Implement temperature feature later */}
            {/* Temperature */}
            {/* <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Temperature
              </label>
              <input
                type="number"
                value={temperature}
                onChange={(e) => onTemperatureChange(e.target.value)}
                placeholder="0.000001"
                step="0.000001"
                min="0"
                max="2"
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: temperature ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                  backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div> */}

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
// Types are now imported from '../components/types'

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

// ============ EVAL JOB CARD COMPONENT ============
interface EvalJobCardProps {
  job: EvalJob;
  assistantConfig?: AssistantConfig;
}

function EvalJobCard({ job, assistantConfig }: EvalJobCardProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(true);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Using imported utility functions
  const statusColors = getStatusColor(job.status);
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
              {/* <span className="text-xs" style={{ color: 'hsl(330, 3%, 49%)' }}>
                ID: {job.id}
              </span> */}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
              {/* <span>{job.dataset_name}</span>
              <span>•</span>
              <span>{job.total_items} items</span>
              <span>•</span> */}
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
          {/* Timestamps */}
          <div className="flex items-center justify-between text-xs mt-4 mb-4" style={{ color: 'hsl(330, 3%, 49%)' }}>
            <div>
              <span className="font-medium">Started At:</span> {formatDate(job.inserted_at)}
            </div>
            <div>
              <span className="font-medium">Last Updated At:</span> {formatDate(job.updated_at)}
            </div>
          </div>

          {/* Error message (if failed) */}
          {job.error_message && (
            <div className="border rounded-lg p-3 mb-4" style={{ backgroundColor: 'hsl(8, 86%, 95%)', borderColor: 'hsl(8, 86%, 80%)' }}>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(8, 86%, 40%)' }}>Error</div>
              <div className="text-sm" style={{ color: 'hsl(8, 86%, 40%)' }}>
                {job.error_message}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsConfigModalOpen(true);
              }}
              className="px-3 py-2 rounded-md text-sm font-medium transition-colors"
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
              onClick={() => router.push(`/evaluations/${job.id}`)}
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

// Wrapper component with Suspense
export default function SimplifiedEval() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
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
              Loading...
            </p>
          </div>
        </div>
      </div>
    }>
      <SimplifiedEvalContent />
    </Suspense>
  );
}
