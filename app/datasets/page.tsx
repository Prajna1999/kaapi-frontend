/**
 * Datasets.tsx - Dataset Management Interface
 *
 * Allows users to upload CSV datasets and manage them in local storage
 */

"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'

export interface Dataset {
  id: string;
  name: string;
  fileName: string;
  fileSize: number;
  rowCount: number;
  uploadedAt: string;
  csvContent: string; // Store the actual CSV content
  duplicationFactor?: number; // Optional duplication factor
}

export const DATASETS_STORAGE_KEY = 'kaapi_datasets';

export default function Datasets() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [datasetName, setDatasetName] = useState('');
  const [duplicationFactor, setDuplicationFactor] = useState('1');
  const [isUploading, setIsUploading] = useState(false);

  // Load datasets from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(DATASETS_STORAGE_KEY);
    if (stored) {
      try {
        const parsedDatasets = JSON.parse(stored);
        setDatasets(parsedDatasets);
      } catch (e) {
        console.error('Failed to load datasets:', e);
      }
    }
  }, []);

  // Save datasets to localStorage whenever they change
  useEffect(() => {
    if (datasets.length > 0) {
      localStorage.setItem(DATASETS_STORAGE_KEY, JSON.stringify(datasets));
    } else {
      localStorage.removeItem(DATASETS_STORAGE_KEY);
    }
  }, [datasets]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      event.target.value = '';
      return;
    }

    setSelectedFile(file);
    // Auto-fill dataset name from filename (without extension)
    const nameFromFile = file.name.replace(/\.csv$/i, '');
    setDatasetName(nameFromFile);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    if (!datasetName.trim()) {
      alert('Please enter a dataset name');
      return;
    }

    setIsUploading(true);

    try {
      // Read the CSV file content
      const fileContent = await selectedFile.text();

      // Parse CSV to count rows (simple count of newlines)
      const lines = fileContent.trim().split('\n');
      const rowCount = Math.max(0, lines.length - 1); // Subtract header row

      // Create dataset object
      const newDataset: Dataset = {
        id: Date.now().toString(),
        name: datasetName.trim(),
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        rowCount: rowCount,
        uploadedAt: new Date().toISOString(),
        csvContent: fileContent,
        duplicationFactor: duplicationFactor && parseInt(duplicationFactor) > 1 ? parseInt(duplicationFactor) : undefined,
      };

      // Add to datasets list
      setDatasets([newDataset, ...datasets]);

      // Reset form
      setSelectedFile(null);
      setDatasetName('');
      setDuplicationFactor('1');

      // Close modal
      setIsModalOpen(false);

      alert('Dataset uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload dataset: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDataset = (id: string) => {
    if (confirm('Are you sure you want to delete this dataset?')) {
      setDatasets(datasets.filter(ds => ds.id !== id));
    }
  };

  const handleDownloadDataset = (dataset: Dataset) => {
    // Create a blob from the CSV content
    const blob = new Blob([dataset.csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);

    // Create a temporary link and click it to download
    const link = document.createElement('a');
    link.href = url;
    link.download = dataset.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Evaluations
            </button>
            <button
              className="w-full text-left px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium flex items-center gap-3"
              style={{
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
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
                <h1 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Datasets</h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Manage your evaluation datasets</p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
            <div className="max-w-6xl mx-auto space-y-6 page-transition">
              <DatasetListing
                datasets={datasets}
                onDelete={handleDeleteDataset}
                onDownload={handleDownloadDataset}
                onUploadNew={() => setIsModalOpen(true)}
                formatFileSize={formatFileSize}
                formatDate={formatDate}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload Dataset Modal */}
      {isModalOpen && (
        <UploadDatasetModal
          selectedFile={selectedFile}
          datasetName={datasetName}
          duplicationFactor={duplicationFactor}
          isUploading={isUploading}
          onFileSelect={handleFileSelect}
          onDatasetNameChange={setDatasetName}
          onDuplicationFactorChange={setDuplicationFactor}
          onUpload={handleUpload}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedFile(null);
            setDatasetName('');
            setDuplicationFactor('1');
          }}
        />
      )}
    </div>
  );
}

// ============ DATASET LISTING COMPONENT ============
interface DatasetListingProps {
  datasets: Dataset[];
  onDelete: (id: string) => void;
  onDownload: (dataset: Dataset) => void;
  onUploadNew: () => void;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString: string) => string;
}

function DatasetListing({
  datasets,
  onDelete,
  onDownload,
  onUploadNew,
  formatFileSize,
  formatDate,
}: DatasetListingProps) {
  return (
    <>
      {/* Datasets List Card */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        {/* Header with Upload Button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
            Your Datasets
          </h2>
          <button
            onClick={onUploadNew}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'hsl(167, 59%, 22%)',
              color: 'hsl(0, 0%, 100%)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
          >
            + Upload New Dataset
          </button>
        </div>

        {/* Datasets List */}
        {datasets.length === 0 ? (
          <div className="text-center py-12" style={{ color: 'hsl(330, 3%, 49%)' }}>
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              />
            </svg>
            <p className="font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>No datasets stored yet</p>
            <p className="text-sm mb-4">Upload your first CSV dataset to get started with evaluations</p>
            <button
              onClick={onUploadNew}
              className="px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
            >
              Upload Your First Dataset
            </button>
          </div>
        ) : (
          <div className="space-y-3">
          {datasets.map((dataset) => (
            <div
              key={dataset.id}
              className="border rounded-lg p-4"
              style={{
                backgroundColor: 'hsl(0, 0%, 96.5%)',
                borderColor: 'hsl(0, 0%, 85%)'
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <svg className="w-6 h-6 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(167, 59%, 22%)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
                      {dataset.name}
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>File Name</div>
                      <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{dataset.fileName}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>File Size</div>
                      <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{formatFileSize(dataset.fileSize)}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Rows</div>
                      <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{dataset.rowCount}</div>
                    </div>
                    <div>
                      <div className="text-xs uppercase font-semibold mb-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Uploaded</div>
                      <div className="text-sm font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{formatDate(dataset.uploadedAt)}</div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => onDownload(dataset)}
                    className="p-2 rounded-md transition-colors"
                    style={{
                      borderWidth: '1px',
                      borderColor: 'hsl(0, 0%, 85%)',
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      color: 'hsl(330, 3%, 19%)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
                    title="Download CSV"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(dataset.id)}
                    className="p-2 rounded-md transition-colors"
                    style={{
                      borderWidth: '1px',
                      borderColor: 'hsl(8, 86%, 80%)',
                      backgroundColor: 'hsl(0, 0%, 100%)',
                      color: 'hsl(8, 86%, 40%)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(8, 86%, 95%)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)';
                    }}
                    title="Delete Dataset"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}
      </div>

      {/* Info Card */}
      <div className="border rounded-lg p-4" style={{ backgroundColor: 'hsl(202, 100%, 95%)', borderColor: 'hsl(202, 100%, 80%)' }}>
        <div className="flex gap-3">
          <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(202, 100%, 35%)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium" style={{ color: 'hsl(202, 100%, 25%)' }}>
              Storage Note
            </p>
            <p className="text-sm mt-1" style={{ color: 'hsl(202, 100%, 30%)' }}>
              Datasets are stored in your browser's local storage. For production use, consider implementing server-side storage with a database.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ============ UPLOAD DATASET MODAL ============
export interface UploadDatasetModalProps {
  selectedFile: File | null;
  datasetName: string;
  duplicationFactor: string;
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDatasetNameChange: (value: string) => void;
  onDuplicationFactorChange: (value: string) => void;
  onUpload: () => void;
  onClose: () => void;
}

export function UploadDatasetModal({
  selectedFile,
  datasetName,
  duplicationFactor,
  isUploading,
  onFileSelect,
  onDatasetNameChange,
  onDuplicationFactorChange,
  onUpload,
  onClose,
}: UploadDatasetModalProps) {
  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-modalBackdrop"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="border rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modalContent"
        style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Upload New Dataset</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md transition-colors"
            style={{ color: 'hsl(330, 3%, 49%)' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          <p className="text-sm mb-6" style={{ color: 'hsl(330, 3%, 49%)' }}>
            Upload a CSV file containing your QnA dataset. The file will be stored in your browser's local storage.
          </p>

        {/* File Selection Area */}
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
                htmlFor="dataset-file-upload"
                className="px-6 py-2 rounded-md transition-colors inline-block text-sm font-medium"
                style={{
                  backgroundColor: isUploading ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
                  color: isUploading ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
                  cursor: isUploading ? 'not-allowed' : 'pointer'
                }}
              >
                Choose CSV File
              </label>
              <input
                id="dataset-file-upload"
                type="file"
                accept=".csv"
                onChange={onFileSelect}
                disabled={isUploading}
                className="hidden"
              />
            </div>
            {selectedFile && (
              <div className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                Selected: <span className="font-medium" style={{ color: 'hsl(330, 3%, 19%)' }}>{selectedFile.name}</span>
                <span className="ml-2">({Math.round(selectedFile.size / 1024)} KB)</span>
              </div>
            )}
          </div>
        </div>

        {/* Dataset Name Field */}
        {selectedFile && (
          <>
            <div className="mt-6">
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

            <div className="mt-4">
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
                Number of times to duplicate the dataset rows (leave empty or 1 for no duplication)
              </p>
            </div>
          </>
        )}

          {/* Sample CSV Format */}
          <div className="mt-6 border rounded-lg p-3" style={{ backgroundColor: 'hsl(202, 100%, 95%)', borderColor: 'hsl(202, 100%, 80%)' }}>
            <div className="flex gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(202, 100%, 35%)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium mb-1" style={{ color: 'hsl(202, 100%, 25%)' }}>Expected CSV Format:</p>
                <pre className="text-xs font-mono" style={{ color: 'hsl(202, 100%, 30%)' }}>
{`question,expected_answer
"What is X?","Answer Y"`}
                </pre>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-end gap-3" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              borderWidth: '1px',
              borderColor: 'hsl(0, 0%, 85%)',
              backgroundColor: 'hsl(0, 0%, 100%)',
              color: 'hsl(330, 3%, 19%)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
          >
            Cancel
          </button>
          <button
            onClick={onUpload}
            disabled={!selectedFile || !datasetName.trim() || isUploading}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: (!selectedFile || !datasetName.trim() || isUploading) ? 'hsl(0, 0%, 95%)' : 'hsl(167, 59%, 22%)',
              color: (!selectedFile || !datasetName.trim() || isUploading) ? 'hsl(330, 3%, 49%)' : 'hsl(0, 0%, 100%)',
              cursor: (!selectedFile || !datasetName.trim() || isUploading) ? 'not-allowed' : 'pointer'
            }}
            onMouseEnter={(e) => {
              if (selectedFile && datasetName.trim() && !isUploading) {
                e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedFile && datasetName.trim() && !isUploading) {
                e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)';
              }
            }}
          >
            {isUploading ? 'Uploading...' : 'Upload Dataset'}
          </button>
        </div>
      </div>
    </div>
  );
}
