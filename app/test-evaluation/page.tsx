/**
 * Test page for viewing mock evaluation data
 * Navigate to /test-evaluation to see the mock data in action
 */

"use client"
import { useRouter } from 'next/navigation';

export default function TestEvaluationPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'hsl(42, 63%, 94%)' }}>
      <div className="max-w-2xl mx-auto p-8">
        <div className="border rounded-lg p-8" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
          <h1 className="text-3xl font-bold mb-4" style={{ color: 'hsl(330, 3%, 19%)' }}>
            Test Evaluation Reports
          </h1>
          <p className="mb-6" style={{ color: 'hsl(330, 3%, 49%)' }}>
            Click on any evaluation below to view the mock data with the new table structure.
          </p>

          <div className="space-y-4">
            {/* Sample 1 - Hindi FAQ */}
            <div
              className="border rounded-lg p-4 cursor-pointer transition-colors"
              style={{
                backgroundColor: 'hsl(0, 0%, 98%)',
                borderColor: 'hsl(0, 0%, 85%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 95%)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 98%)'}
              onClick={() => router.push('/evaluations/43')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Evaluation #43 - Hindi FAQ
                  </h2>
                  <p className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    4 Q&A pairs • Multiple score metrics • Hindi language
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'hsl(134, 61%, 95%)', color: 'hsl(134, 61%, 25%)' }}>
                      cosine_similarity
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'hsl(45, 93%, 90%)', color: 'hsl(45, 93%, 35%)' }}>
                      SNEHA correctness
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'hsl(167, 59%, 95%)', color: 'hsl(167, 59%, 22%)' }}>
                      llm_judge_relevance
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'hsl(0, 0%, 95%)', color: 'hsl(330, 3%, 49%)' }}>
                      response_category
                    </span>
                  </div>
                </div>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'hsl(167, 59%, 22%)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Sample 2 - English FAQ */}
            <div
              className="border rounded-lg p-4 cursor-pointer transition-colors"
              style={{
                backgroundColor: 'hsl(0, 0%, 98%)',
                borderColor: 'hsl(0, 0%, 85%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(167, 59%, 95%)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 98%)'}
              onClick={() => router.push('/evaluations/44')}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold mb-1" style={{ color: 'hsl(330, 3%, 19%)' }}>
                    Evaluation #44 - English FAQ
                  </h2>
                  <p className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    3 Q&A pairs • Multiple score metrics • English language
                  </p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'hsl(134, 61%, 95%)', color: 'hsl(134, 61%, 25%)' }}>
                      Higher avg score
                    </span>
                    <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'hsl(167, 59%, 95%)', color: 'hsl(167, 59%, 22%)' }}>
                      With assistant
                    </span>
                  </div>
                </div>
                <svg
                  className="w-6 h-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  style={{ color: 'hsl(167, 59%, 22%)' }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-lg" style={{ backgroundColor: 'hsl(45, 93%, 95%)', borderColor: 'hsl(45, 93%, 75%)', borderWidth: '1px' }}>
            <p className="text-sm" style={{ color: 'hsl(45, 93%, 25%)' }}>
              <strong>Note:</strong> Mock mode is currently enabled. To switch back to real backend data, set <code className="px-1 py-0.5 rounded" style={{ backgroundColor: 'hsl(45, 93%, 90%)' }}>USE_MOCK_DATA = false</code> in <code>/app/api/evaluations/[id]/route.ts</code>
            </p>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => router.push('/evaluations')}
              className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                backgroundColor: 'hsl(0, 0%, 100%)',
                borderWidth: '1px',
                borderColor: 'hsl(0, 0%, 85%)',
                color: 'hsl(330, 3%, 19%)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 95%)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'hsl(0, 0%, 100%)'}
            >
              Go to Evaluations Page
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
