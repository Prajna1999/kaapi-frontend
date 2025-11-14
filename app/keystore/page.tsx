/**
 * KaapiKeystore.tsx - API Key Management Interface
 *
 * Allows users to securely store and manage API keys for various LLM providers
 */

"use client"
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'

export interface APIKey {
  id: string;
  label: string;
  key: string;
  provider: string;
  createdAt?: string;
}

export const STORAGE_KEY = 'kaapi_api_keys';

export default function KaapiKeystore() {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyValue, setNewKeyValue] = useState('');
  const [newKeyProvider, setNewKeyProvider] = useState('Kaapi');
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Load API keys from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setApiKeys(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to load API keys:', e);
      }
    }
  }, []);

  // Save API keys to localStorage whenever they change
  useEffect(() => {
    if (apiKeys.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(apiKeys));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [apiKeys]);

  const providers = ['Kaapi','OpenAI', 'Anthropic', 'Google', 'Cohere', 'Other'];

  const handleAddKey = () => {
    if (!newKeyLabel.trim() || !newKeyValue.trim()) {
      alert('Please provide both label and API key');
      return;
    }

    const newKey: APIKey = {
      id: Date.now().toString(),
      label: newKeyLabel,
      key: newKeyValue,
      provider: newKeyProvider,
      createdAt: new Date().toISOString(),
    };

    setApiKeys([...apiKeys, newKey]);
    setNewKeyLabel('');
    setNewKeyValue('');
    setNewKeyProvider('Kaapi');

    // Close modal after adding
    setIsModalOpen(false);
  };

  const handleDeleteKey = (id: string) => {
    setApiKeys(apiKeys.filter(key => key.id !== id));
    setVisibleKeys(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const toggleKeyVisibility = (id: string) => {
    setVisibleKeys(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('API key copied to clipboard!');
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
              className="w-full text-left px-4 py-3 rounded-md transition-all duration-200 text-sm font-medium flex items-center gap-3"
              style={{
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
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
                <h1 className="text-2xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Keystore</h1>
                <p className="text-sm mt-1" style={{ color: 'hsl(330, 3%, 49%)' }}>Manage your API keys securely</p>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
            <div className="max-w-4xl mx-auto space-y-6 page-transition">
              <StoredKeysTab
                apiKeys={apiKeys}
                visibleKeys={visibleKeys}
                onToggleVisibility={toggleKeyVisibility}
                onCopy={copyToClipboard}
                onDelete={handleDeleteKey}
                onAddNew={() => setIsModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Add Key Modal */}
      {isModalOpen && (
        <AddKeyModal
          newKeyLabel={newKeyLabel}
          newKeyValue={newKeyValue}
          newKeyProvider={newKeyProvider}
          providers={providers}
          onLabelChange={setNewKeyLabel}
          onValueChange={setNewKeyValue}
          onProviderChange={setNewKeyProvider}
          onAddKey={handleAddKey}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}

// ============ STORED KEYS TAB ============
interface StoredKeysTabProps {
  apiKeys: APIKey[];
  visibleKeys: Set<string>;
  onToggleVisibility: (id: string) => void;
  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
  onAddNew: () => void;
}

function StoredKeysTab({
  apiKeys,
  visibleKeys,
  onToggleVisibility,
  onCopy,
  onDelete,
  onAddNew,
}: StoredKeysTabProps) {
  return (
    <>
      {/* Stored Keys List */}
      <div className="border rounded-lg p-6" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
            Your API Key
          </h2>
          {apiKeys.length === 0 && (
            <button
              onClick={onAddNew}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
            >
              + Add New Key
            </button>
          )}
        </div>

        {apiKeys.length === 0 ? (
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
                d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
              />
            </svg>
            <p className="font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>No API key stored yet</p>
            <p className="text-sm mb-4">Add your API key to get started with evaluations</p>
            <button
              onClick={onAddNew}
              className="px-6 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(167, 59%, 22%)',
                color: 'hsl(0, 0%, 100%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
            >
              Add API Key
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Info Message */}
            <div className="border rounded-lg p-3" style={{ backgroundColor: 'hsl(202, 100%, 95%)', borderColor: 'hsl(202, 100%, 80%)' }}>
              <div className="flex gap-2">
                <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(202, 100%, 35%)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs" style={{ color: 'hsl(202, 100%, 30%)' }}>
                  Only one API key can be stored at a time. Delete this key to add a different one.
                </p>
              </div>
            </div>

            {apiKeys.map((apiKey) => (
              <div
                key={apiKey.id}
                className="border rounded-lg p-4"
                style={{
                  backgroundColor: 'hsl(0, 0%, 96.5%)',
                  borderColor: 'hsl(0, 0%, 85%)'
                }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor: 'hsl(167, 59%, 22%)',
                          color: 'hsl(0, 0%, 100%)'
                        }}
                      >
                        {apiKey.provider}
                      </span>
                      <h3 className="font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>
                        {apiKey.label}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <code
                        className="text-sm px-3 py-1 rounded font-mono"
                        style={{
                          backgroundColor: 'hsl(0, 0%, 100%)',
                          color: 'hsl(330, 3%, 19%)'
                        }}
                      >
                        {visibleKeys.has(apiKey.id)
                          ? apiKey.key
                          : '•'.repeat(32)}
                      </code>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'hsl(330, 3%, 49%)' }}>
                      Added {new Date(apiKey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => onToggleVisibility(apiKey.id)}
                      className="p-2 rounded-md transition-colors"
                      style={{
                        borderWidth: '1px',
                        borderColor: 'hsl(0, 0%, 85%)',
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        color: 'hsl(330, 3%, 19%)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
                      title={visibleKeys.has(apiKey.id) ? 'Hide' : 'Show'}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        {visibleKeys.has(apiKey.id) ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        )}
                      </svg>
                    </button>
                    <button
                      onClick={() => onCopy(apiKey.key)}
                      className="p-2 rounded-md transition-colors"
                      style={{
                        borderWidth: '1px',
                        borderColor: 'hsl(0, 0%, 85%)',
                        backgroundColor: 'hsl(0, 0%, 100%)',
                        color: 'hsl(330, 3%, 19%)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
                      title="Copy"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => onDelete(apiKey.id)}
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
                      title="Delete"
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
              Security Note
            </p>
            <p className="text-sm mt-1" style={{ color: 'hsl(202, 100%, 30%)' }}>
              API keys are stored in your browser's local storage. For production use, consider implementing secure server-side storage.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ============ ADD KEY MODAL ============
interface AddKeyModalProps {
  newKeyLabel: string;
  newKeyValue: string;
  newKeyProvider: string;
  providers: string[];
  onLabelChange: (value: string) => void;
  onValueChange: (value: string) => void;
  onProviderChange: (value: string) => void;
  onAddKey: () => void;
  onClose: () => void;
}

function AddKeyModal({
  newKeyLabel,
  newKeyValue,
  newKeyProvider,
  providers,
  onLabelChange,
  onValueChange,
  onProviderChange,
  onAddKey,
  onClose,
}: AddKeyModalProps) {
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
        className="border rounded-lg shadow-lg max-w-lg w-full max-h-[90vh] overflow-y-auto animate-modalContent"
        style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between" style={{ borderColor: 'hsl(0, 0%, 85%)' }}>
          <h2 className="text-xl font-semibold" style={{ color: 'hsl(330, 3%, 19%)' }}>Add New API Key</h2>
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
            Add a new API key to use in your evaluation workflows. All keys are stored securely in your browser.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Provider
              </label>
              <select
                value={newKeyProvider}
                onChange={(e) => onProviderChange(e.target.value)}
                className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              >
                {providers.map(provider => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                Label
              </label>
              <input
                type="text"
                value={newKeyLabel}
                onChange={(e) => onLabelChange(e.target.value)}
                placeholder="e.g., Production Key"
                className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2"
                style={{
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'hsl(330, 3%, 19%)' }}>
                API Key
              </label>
              <input
                type="password"
                value={newKeyValue}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder="Paste your API key here"
                className="w-full px-4 py-2 rounded-md border focus:outline-none focus:ring-2 font-mono text-sm"
                style={{
                  borderColor: 'hsl(0, 0%, 85%)',
                  backgroundColor: 'hsl(0, 0%, 100%)',
                  color: 'hsl(330, 3%, 19%)'
                }}
              />
            </div>
          </div>

          {/* Info Card */}
          <div className="mt-6 border rounded-lg p-3" style={{ backgroundColor: 'hsl(202, 100%, 95%)', borderColor: 'hsl(202, 100%, 80%)' }}>
            <div className="flex gap-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" style={{ color: 'hsl(202, 100%, 35%)' }}>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs" style={{ color: 'hsl(202, 100%, 30%)' }}>
                API keys are stored in your browser's local storage.
              </p>
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
            onClick={onAddKey}
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'hsl(167, 59%, 22%)',
              color: 'hsl(0, 0%, 100%)'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 28%)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 22%)'}
          >
            Add API Key
          </button>
        </div>
      </div>
    </div>
  );
}
