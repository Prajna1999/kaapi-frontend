/**
 * SimplifiedEval.tsx - Simplified One-Click Evaluation Flow
 *
 * Two-tab structure:
 * 1. Upload Tab: Upload QnA dataset → Run evaluation
 * 2. Results Tab: View evaluation results with metrics and detailed logs
 */

"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'
import { APIKey } from '../keystore/page';
import { STORAGE_KEY } from '../keystore/page';

type Tab = 'upload' | 'results';

export default function SimplifiedEval() {
  const [activeTab, setActiveTab] = useState<Tab>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [datasetId, setDatasetId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [selectedKeyId, setSelectedKeyId] = useState<string>('');

  // Upload fields
  const [datasetName, setDatasetName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [duplicationFactor, setDuplicationFactor] = useState<string>('1');

  // Evaluation fields
  const [experimentName, setExperimentName] = useState<string>('');
  const [modelName, setModelName] = useState<string>('gpt-4');
  const [instructions, setInstructions] = useState<string>('You are a helpful FAQ assistant.');
  const [vectorStoreIds, setVectorStoreIds] = useState<string>('');
  const [maxNumResults, setMaxNumResults] = useState<string>('3');

  const router = useRouter();

  // Load API keys from localStorage
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const keys = JSON.parse(stored);
        setApiKeys(keys);
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedKeyId) {
      alert('Please select an API key first');
      event.target.value = '';
      return;
    }

    // Set the file and extract dataset name from filename
    setUploadedFile(file);
    const extractedName = file.name.replace(/\.(csv|CSV)$/, '');
    setDatasetName(extractedName);

    // Reset previous upload state
    setDatasetId(null);
  };

  const handleUploadDataset = async () => {
    if (!uploadedFile) {
      alert('Please select a file first');
      return;
    }

    if (!selectedKeyId) {
      alert('Please select an API key first');
      return;
    }

    if (!datasetName.trim()) {
      alert('Please enter a dataset name');
      return;
    }

    // Get the selected API key
    const selectedKey = apiKeys.find(k => k.id === selectedKeyId);
    if (!selectedKey) {
      alert('Selected API key not found');
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', uploadedFile);
      formData.append('dataset_name', datasetName.trim());

      // Optional fields
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (duplicationFactor) {
        formData.append('duplication_factor', duplicationFactor);
      }

      // Upload via Next.js API proxy (to avoid CORS issues)
      const response = await fetch('/api/evaluations/datasets', {
        method: 'POST',
        body: formData,
        headers: {
          'X-API-KEY': selectedKey.key,
          // Note: Do NOT set Content-Type for multipart/form-data
          // Browser automatically sets it with the correct boundary
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      // Store the dataset_id returned from the upload
      if (data.dataset_id) {
        setDatasetId(data.dataset_id);
        alert('File uploaded successfully! You can now run the evaluation.');
      } else {
        throw new Error('No dataset_id returned from upload');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload file: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRunEvaluation = async() => {
    if (!selectedKeyId) {
      alert('Please select an API key first');
      return;
    }
    if (!datasetId) {
      alert('Please upload a dataset first');
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

    try {
      // Build the request payload
      const payload: any = {
        dataset_id: parseInt(datasetId),
        experiment_name: experimentName.trim(),
      };

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
                max_num_results: parseInt(maxNumResults) || 3,
              }
            ];
            payload.config.include = ['file_search_call.results'];
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
            <div className="max-w-7xl mx-auto">
              {activeTab === 'upload' ? (
                <UploadTab
                  uploadedFile={uploadedFile}
                  datasetId={datasetId}
                  isUploading={isUploading}
                  isEvaluating={isEvaluating}
                  apiKeys={apiKeys}
                  selectedKeyId={selectedKeyId}
                  datasetName={datasetName}
                  description={description}
                  duplicationFactor={duplicationFactor}
                  experimentName={experimentName}
                  modelName={modelName}
                  instructions={instructions}
                  vectorStoreIds={vectorStoreIds}
                  maxNumResults={maxNumResults}
                  onKeySelect={setSelectedKeyId}
                  onDatasetNameChange={setDatasetName}
                  onDescriptionChange={setDescription}
                  onDuplicationFactorChange={setDuplicationFactor}
                  onExperimentNameChange={setExperimentName}
                  onModelNameChange={setModelName}
                  onInstructionsChange={setInstructions}
                  onVectorStoreIdsChange={setVectorStoreIds}
                  onMaxNumResultsChange={setMaxNumResults}
                  onFileSelect={handleFileSelect}
                  onUploadDataset={handleUploadDataset}
                  onRunEvaluation={handleRunEvaluation}
                />
              ) : (
                <ResultsTab apiKeys={apiKeys} selectedKeyId={selectedKeyId} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ UPLOAD TAB COMPONENT ============
interface UploadTabProps {
  uploadedFile: File | null;
  datasetId: string | null;
  isUploading: boolean;
  isEvaluating: boolean;
  apiKeys: APIKey[];
  selectedKeyId: string;
  datasetName: string;
  description: string;
  duplicationFactor: string;
  experimentName: string;
  modelName: string;
  instructions: string;
  vectorStoreIds: string;
  maxNumResults: string;
  onKeySelect: (keyId: string) => void;
  onDatasetNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onDuplicationFactorChange: (value: string) => void;
  onExperimentNameChange: (value: string) => void;
  onModelNameChange: (value: string) => void;
  onInstructionsChange: (value: string) => void;
  onVectorStoreIdsChange: (value: string) => void;
  onMaxNumResultsChange: (value: string) => void;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onUploadDataset: () => void;
  onRunEvaluation: () => void;
}

function UploadTab({
  uploadedFile,
  datasetId,
  isUploading,
  isEvaluating,
  apiKeys,
  selectedKeyId,
  datasetName,
  description,
  duplicationFactor,
  experimentName,
  modelName,
  instructions,
  vectorStoreIds,
  maxNumResults,
  onKeySelect,
  onDatasetNameChange,
  onDescriptionChange,
  onDuplicationFactorChange,
  onExperimentNameChange,
  onModelNameChange,
  onInstructionsChange,
  onVectorStoreIdsChange,
  onMaxNumResultsChange,
  onFileSelect,
  onUploadDataset,
  onRunEvaluation,
}: UploadTabProps) {
  const selectedKey = apiKeys.find(k => k.id === selectedKeyId);

  return (
    <div className="space-y-6">
      {/* Instructions Card */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-lg font-semibold mb-3" style={{ color: 'hsl(330, 3%, 19%)' }}>How it works</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
          <li>Select an API key from your keystore</li>
          <li>Choose your QnA dataset CSV file (format: question, expected_answer columns)</li>
          <li>Edit dataset name, add description and set duplication factor (optional)</li>
          <li>Click "Upload Dataset" - file will be uploaded to S3 and a dataset ID will be generated</li>
          <li>Configure evaluation settings (experiment name required, other fields optional)</li>
          <li>Click "Run Evaluation" to start the evaluation process</li>
          <li>Wait for processing to complete (automatic redirect to results)</li>
          <li>View detailed results and metrics in the Results tab</li>
        </ol>
      </div>

      {/* API Key Selection Card */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Select API Key</h2>

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
              <p className="font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>No API keys found</p>
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
        ) : (
          <div className="space-y-3">
            <select
              value={selectedKeyId}
              onChange={(e) => onKeySelect(e.target.value)}
              className="w-full px-4 py-3 rounded-md border focus:outline-none focus:ring-2 text-sm"
              style={{
                borderColor: selectedKeyId ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                backgroundColor: 'hsl(0, 0%, 100%)',
                color: 'hsl(330, 3%, 19%)'
              }}
            >
              <option value="">-- Select an API Key --</option>
              {apiKeys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.provider} - {key.label}
                </option>
              ))}
            </select>

            {selectedKey && (
              <div className="border rounded-lg p-4" style={{ backgroundColor: 'hsl(134, 61%, 95%)', borderColor: 'hsl(134, 61%, 70%)' }}>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(134, 61%, 25%)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'hsl(134, 61%, 25%)' }}>
                      Selected: <span className="font-semibold">{selectedKey.provider} - {selectedKey.label}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'hsl(134, 61%, 30%)' }}>
                      Key: {selectedKey.key.substring(0, 8)}...{selectedKey.key.substring(selectedKey.key.length - 4)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Card */}
      <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Upload QnA Dataset</h2>

        {/* File Selection Area */}
        {!datasetId && (
          <>
            <div
              className="border-2 border-dashed rounded-lg p-12 text-center transition-colors"
              style={{
                borderColor: 'hsl(0, 0%, 85%)',
              }}
            >
              <div className="space-y-4">
                <div style={{ color: 'hsl(330, 3%, 49%)' }}>
                  <svg
                    className="mx-auto h-12 w-12"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                </div>
                <div>
                  <label
                    htmlFor="file-upload"
                    className="px-6 py-2 rounded-md transition-colors inline-block text-sm font-medium"
                    style={{
                      backgroundColor: (isUploading || !!datasetId) ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
                      color: (isUploading || !!datasetId) ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
                      cursor: (isUploading || !!datasetId) ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Choose CSV File
                  </label>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={onFileSelect}
                    disabled={isUploading || !!datasetId}
                    className="hidden"
                  />
                </div>
                {uploadedFile && (
                  <div className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    Selected: <span className="font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{uploadedFile.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dataset Metadata Fields - Show after file selection */}
            {uploadedFile && !datasetId && (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Dataset Name <span style={{ color: 'hsl(8, 86%, 40%)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={datasetName}
                    onChange={(e) => onDatasetNameChange(e.target.value)}
                    placeholder="Enter dataset name"
                    disabled={isUploading}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: datasetName ? 'hsl(167, 59%, 22%)' : 'hsl(0, 0%, 85%)',
                      backgroundColor: isUploading ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => onDescriptionChange(e.target.value)}
                    placeholder="Enter dataset description"
                    disabled={isUploading}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: isUploading ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Duplication Factor (Optional)
                  </label>
                  <input
                    type="number"
                    value={duplicationFactor}
                    onChange={(e) => onDuplicationFactorChange(e.target.value)}
                    placeholder="1"
                    min="1"
                    disabled={isUploading}
                    className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                    style={{
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: isUploading ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    Number of times to duplicate the dataset rows
                  </p>
                </div>

                {/* Upload Button */}
                <div className="mt-6">
                  <button
                    onClick={onUploadDataset}
                    disabled={!datasetName.trim() || isUploading}
                    className="w-full py-3 rounded-md font-medium text-sm transition-all"
                    style={{
                      backgroundColor: (!datasetName.trim() || isUploading) ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
                      color: (!datasetName.trim() || isUploading) ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
                      cursor: (!datasetName.trim() || isUploading) ? 'not-allowed' : 'pointer',
                      borderWidth: (!datasetName.trim() || isUploading) ? '1px' : '0',
                      borderColor: (!datasetName.trim() || isUploading) ? 'hsl(0, 0%, 85%)' : 'transparent'
                    }}
                  >
                    {isUploading ? 'Uploading...' : 'Upload Dataset'}
                  </button>
                  {!datasetName.trim() && (
                    <p className="text-xs mt-2 text-center" style={{ color: 'hsl(8, 86%, 40%)' }}>
                      Please enter a dataset name
                    </p>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Upload Success Message */}
        {datasetId && (
          <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(134, 61%, 95%)', borderColor: 'hsl(134, 61%, 70%)' }}>
            <div className="flex items-center gap-3 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(134, 61%, 25%)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'hsl(134, 61%, 25%)' }}>
                  Dataset uploaded successfully!
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm" style={{ color: 'hsl(134, 61%, 30%)' }}>
              <p><span className="font-medium">Dataset ID:</span> <span className="font-mono">{datasetId}</span></p>
              <p><span className="font-medium">Dataset Name:</span> {datasetName}</p>
              {uploadedFile && <p><span className="font-medium">File:</span> {uploadedFile.name}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Evaluation Configuration Card */}
      {datasetId && (
        <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Evaluation Configuration</h2>

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

            {/* Model Name - Optional */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Model (Optional)
              </label>
              <input
                type="text"
                value={modelName}
                onChange={(e) => onModelNameChange(e.target.value)}
                placeholder="e.g., gpt-4"
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: isEvaluating ? 'hsl(0, 0%, 97%)' : 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>

            {/* Instructions - Optional */}
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Instructions (Optional)
              </label>
              <textarea
                value={instructions}
                onChange={(e) => onInstructionsChange(e.target.value)}
                placeholder="System instructions for the model"
                rows={3}
                disabled={isEvaluating}
                className="w-full px-4 py-2 rounded-md border text-sm focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'hsl(0, 0%, 85%)',
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
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Run Evaluation Section */}
      <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h2 className="text-xl font-semibold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>Run Evaluation</h2>

        {/* Run Button */}
        <div className="mt-6">
          <button
            onClick={onRunEvaluation}
            disabled={!datasetId || !experimentName.trim() || isEvaluating || isUploading}
            className="w-full py-3 rounded-md font-medium text-sm transition-all"
            style={{
              backgroundColor: !datasetId || !experimentName.trim() || isEvaluating || isUploading ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
              color: !datasetId || !experimentName.trim() || isEvaluating || isUploading ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
              cursor: !datasetId || !experimentName.trim() || isEvaluating || isUploading ? 'not-allowed' : 'pointer',
              borderWidth: !datasetId || !experimentName.trim() || isEvaluating || isUploading ? '1px' : '0',
              borderColor: !datasetId || !experimentName.trim() || isEvaluating || isUploading ? 'hsl(0, 0%, 85%)' : 'transparent'
            }}
          >
            {isEvaluating ? 'Creating Evaluation Job...' : 'Run Evaluation'}
          </button>
          {!datasetId && !isUploading && (
            <p className="text-xs mt-2 text-center" style={{ color: 'hsl(8, 86%, 40%)' }}>
              Please upload a dataset file first
            </p>
          )}
          {datasetId && !experimentName.trim() && (
            <p className="text-xs mt-2 text-center" style={{ color: 'hsl(8, 86%, 40%)' }}>
              Please enter an experiment name
            </p>
          )}
          {isEvaluating && (
            <p className="text-xs mt-2 text-center" style={{ color: 'hsl(330, 3%, 49%)' }}>
              Creating evaluation job and redirecting to results...
            </p>
          )}
        </div>
      </div>

      {/* Sample CSV Format */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'hsl(330, 3%, 19%)' }}>Expected CSV Format:</h3>
        <pre className="text-xs p-4 rounded-md border overflow-x-auto font-mono" style={{ backgroundColor: 'hsl(0, 0%, 96.5%)', borderColor: 'hsl(0, 0%, 85%)', color: 'hsl(330, 3%, 19%)' }}>
{`question,expected_answer
"What is the capital of France?","Paris"
"Explain photosynthesis","Process by which plants convert light into energy"`}
        </pre>
      </div>
    </div>
  );
}

// ============ TYPES ============
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
  score: number | null;
  error_message: string | null;
  config: {
    model?: string;
    instructions?: string;
    tools?: any[];
    include?: string[];
  };
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

  // Fetch evaluation jobs
  const fetchEvaluations = async () => {
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
  };

  // Fetch on mount and when API key changes
  useEffect(() => {
    if (selectedKeyId) {
      fetchEvaluations();
    }
  }, [selectedKeyId]);

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
  }, [evalJobs, selectedKeyId]);

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
          Evaluation Jobs
        </h2>
        <button
          onClick={fetchEvaluations}
          disabled={isLoading || !selectedKeyId}
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: isLoading || !selectedKeyId ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
            color: isLoading || !selectedKeyId ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
            cursor: isLoading || !selectedKeyId ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* No API Key Selected */}
      {!selectedKeyId && (
        <div className="border rounded-lg p-8 text-center" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <p style={{ color: 'hsl(330, 3%, 49%)' }}>Please select an API key from the Upload tab to view evaluation jobs.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoading && selectedKeyId && evalJobs.length === 0 && (
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
      {!isLoading && selectedKeyId && evalJobs.length === 0 && !error && (
        <div className="border rounded-lg p-8 text-center" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <p style={{ color: 'hsl(330, 3%, 49%)' }}>No evaluation jobs found. Create one from the Upload tab!</p>
        </div>
      )}

      {/* Evaluation Job Cards */}
      {evalJobs.length > 0 && (
        <div className="space-y-4">
          {evalJobs.map((job) => (
            <EvalJobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ EVAL JOB CARD COMPONENT ============
interface EvalJobCardProps {
  job: EvalJob;
}

function EvalJobCard({ job }: EvalJobCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
            <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
              <span>{job.dataset_name}</span>
              <span>•</span>
              <span>{job.total_items} items</span>
              {job.score !== null && (
                <>
                  <span>•</span>
                  <span className="font-medium">{(job.score * 100).toFixed(1)}% score</span>
                </>
              )}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-4">
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Dataset ID</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.dataset_id}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Batch Job ID</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.batch_job_id}</div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Model</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>
                {job.config?.model || 'N/A'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Organization ID</div>
              <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{job.organization_id}</div>
            </div>
          </div>

          {/* Config Details (if available) */}
          {job.config && (job.config.instructions || job.config.tools) && (
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
          {job.object_store_url && (
            <div className="border-t pt-4 mt-4" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
              <a
                href={job.object_store_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-md text-sm font-medium inline-block transition-colors"
                style={{
                  backgroundColor: 'hsl(167, 59%, 22%)',
                  color: 'hsl(0, 0%, 100%)'
                }}
              >
                View Results
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
