/**
 * DetailedResultsTable.tsx - Table view for evaluation results
 *
 * Displays Q&A pairs with scores in a tabular format
 */

import { IndividualScore, TraceScore, getScoreObject, normalizeToIndividualScores, isNewScoreObject, isNewScoreObjectV2 } from './types';
import { EvalJob } from './types';

interface DetailedResultsTableProps {
  job: EvalJob;
}

export default function DetailedResultsTable({ job }: DetailedResultsTableProps) {
  const scoreObject = getScoreObject(job);

  if (!scoreObject || (!isNewScoreObject(scoreObject) && !isNewScoreObjectV2(scoreObject))) {
    return (
      <div className="border rounded-lg p-6 text-center" style={{ backgroundColor: 'hsl(42, 63%, 94%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <p className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
          No detailed results available or using legacy format
        </p>
      </div>
    );
  }

  // Normalize to IndividualScore format for backward compatibility
  const individual_scores = normalizeToIndividualScores(scoreObject);

  if (!individual_scores || individual_scores.length === 0) {
    return (
      <div className="border rounded-lg p-6 text-center" style={{ backgroundColor: 'hsl(42, 63%, 94%)', borderColor: 'hsl(0, 0%, 85%)' }}>
        <p className="text-sm" style={{ color: 'hsl(330, 3%, 49%)' }}>
          No individual scores available
        </p>
      </div>
    );
  }

  // Get all unique score names from the first item
  const scoreNames = individual_scores[0]?.trace_scores?.map(s => s.name) || [];

  // Helper function to get score value by name
  const getScoreByName = (scores: TraceScore[], name: string): TraceScore | undefined => {
    if (!scores || !Array.isArray(scores)) return undefined;
    return scores.find(s => s?.name === name);
  };

  // Helper function to format score value with color
  const formatScoreValue = (score: TraceScore | undefined) => {
    if (!score) return { value: 'N/A', color: 'hsl(330, 3%, 49%)', bg: 'transparent' };

    if (score.data_type === 'CATEGORICAL') {
      const catValue = String(score.value);
      let color = 'hsl(330, 3%, 19%)';
      let bg = 'hsl(0, 0%, 95%)';

      if (catValue === 'CORRECT') {
        color = 'hsl(134, 61%, 25%)';
        bg = 'hsl(134, 61%, 95%)';
      } else if (catValue === 'PARTIAL') {
        color = 'hsl(45, 93%, 35%)';
        bg = 'hsl(45, 93%, 90%)';
      } else if (catValue === 'INCORRECT') {
        color = 'hsl(8, 86%, 40%)';
        bg = 'hsl(8, 86%, 95%)';
      }

      return { value: catValue, color, bg };
    }

    // NUMERIC
    const numValue = Number(score.value);
    const formattedValue = numValue.toFixed(2);
    let color = 'hsl(330, 3%, 19%)';
    let bg = 'transparent';

    // Color based on value
    if (numValue >= 0.7) {
      color = 'hsl(134, 61%, 25%)';
      bg = 'hsl(134, 61%, 95%)';
    } else if (numValue >= 0.5) {
      color = 'hsl(45, 93%, 35%)';
      bg = 'hsl(45, 93%, 90%)';
    } else {
      color = 'hsl(8, 86%, 40%)';
      bg = 'hsl(8, 86%, 95%)';
    }

    return { value: formattedValue, color, bg };
  };

  return (
    <div className="border rounded-lg overflow-hidden" style={{ backgroundColor: 'hsl(0, 0%, 100%)', borderColor: 'hsl(0, 0%, 85%)' }}>
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
          {/* Table Header */}
          <thead>
            <tr style={{ backgroundColor: 'hsl(0, 0%, 96.5%)', borderBottom: '2px solid hsl(0, 0%, 85%)' }}>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(330, 3%, 19%)', width: '5%' }}>
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(330, 3%, 19%)', width: '25%' }}>
                Question
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(330, 3%, 19%)', width: '25%' }}>
                Answer
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase" style={{ color: 'hsl(330, 3%, 19%)', width: '25%' }}>
                Ground Truth
              </th>
              {scoreNames.map((scoreName) => (
                <th key={scoreName} className="px-4 py-3 text-center text-xs font-semibold uppercase" style={{ color: 'hsl(330, 3%, 19%)', width: `${20 / scoreNames.length}%` }}>
                  {scoreName}
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody>
            {individual_scores.map((item, index) => {
              const question = item.input?.question || 'N/A';
              const answer = item.output?.answer || 'N/A';
              const groundTruth = item.metadata?.ground_truth || 'N/A';

              return (
                <tr
                  key={item.trace_id || index}
                  className="border-b transition-colors"
                  style={{ borderColor: 'hsl(0, 0%, 92%)' }}
                  onMouseEnter={(e) => {
                    const row = e.currentTarget;
                    row.style.backgroundColor = 'hsl(0, 0%, 98%)';
                  }}
                  onMouseLeave={(e) => {
                    const row = e.currentTarget;
                    row.style.backgroundColor = 'transparent';
                  }}
                >
                  {/* Row Number */}
                  <td className="px-4 py-3 text-sm font-medium" style={{ color: 'hsl(330, 3%, 49%)' }}>
                    {index + 1}
                  </td>

                  {/* Question */}
                  <td className="px-4 py-3">
                    <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)', lineHeight: '1.5' }}>
                      {question.length > 150 ? (
                        <details>
                          <summary className="cursor-pointer" style={{ color: 'hsl(167, 59%, 22%)' }}>
                            {question.substring(0, 150)}...
                          </summary>
                          <div className="mt-2">{question}</div>
                        </details>
                      ) : (
                        question
                      )}
                    </div>
                  </td>

                  {/* Answer */}
                  <td className="px-4 py-3">
                    <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)', lineHeight: '1.5' }}>
                      {answer.length > 150 ? (
                        <details>
                          <summary className="cursor-pointer" style={{ color: 'hsl(167, 59%, 22%)' }}>
                            {answer.substring(0, 150)}...
                          </summary>
                          <div className="mt-2">{answer}</div>
                        </details>
                      ) : (
                        answer
                      )}
                    </div>
                  </td>

                  {/* Ground Truth */}
                  <td className="px-4 py-3">
                    <div className="text-sm" style={{ color: 'hsl(330, 3%, 19%)', lineHeight: '1.5' }}>
                      {groundTruth.length > 150 ? (
                        <details>
                          <summary className="cursor-pointer" style={{ color: 'hsl(167, 59%, 22%)' }}>
                            {groundTruth.substring(0, 150)}...
                          </summary>
                          <div className="mt-2">{groundTruth}</div>
                        </details>
                      ) : (
                        groundTruth
                      )}
                    </div>
                  </td>

                  {/* Score Columns */}
                  {scoreNames.map((scoreName) => {
                    const score = getScoreByName(item.trace_scores, scoreName);
                    const { value, color, bg } = formatScoreValue(score);

                    return (
                      <td key={scoreName} className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div
                            className="inline-block px-3 py-1 rounded-md text-sm font-semibold"
                            style={{
                              color,
                              backgroundColor: bg,
                              borderWidth: bg === 'transparent' ? '1px' : '0',
                              borderColor: 'hsl(0, 0%, 85%)'
                            }}
                          >
                            {value}
                          </div>
                          {score?.comment && (
                            <div className="relative inline-block group">
                              <div
                                className="inline-flex items-center justify-center w-4 h-4 rounded-full cursor-help text-xs font-bold"
                                style={{
                                  backgroundColor: 'hsl(0, 0%, 90%)',
                                  color: 'hsl(330, 3%, 49%)',
                                  transition: 'all 0.1s ease-in-out'
                                }}
                                onMouseEnter={(e) => {
                                  const el = e.currentTarget;
                                  el.style.backgroundColor = 'hsl(167, 59%, 22%)';
                                  el.style.color = 'hsl(0, 0%, 100%)';
                                }}
                                onMouseLeave={(e) => {
                                  const el = e.currentTarget;
                                  el.style.backgroundColor = 'hsl(0, 0%, 90%)';
                                  el.style.color = 'hsl(330, 3%, 49%)';
                                }}
                              >
                                i
                              </div>
                              <div
                                className="absolute bottom-full left-1/2 mb-2 px-3 py-2 rounded-md text-xs whitespace-normal pointer-events-none opacity-0 group-hover:opacity-100 z-10"
                                style={{
                                  backgroundColor: 'hsl(330, 3%, 19%)',
                                  color: 'hsl(0, 0%, 100%)',
                                  transform: 'translateX(-50%)',
                                  minWidth: '200px',
                                  maxWidth: '300px',
                                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                                  transition: 'opacity 0.1s ease-in-out'
                                }}
                              >
                                {score.comment}
                                <div
                                  className="absolute top-full left-1/2"
                                  style={{
                                    transform: 'translateX(-50%)',
                                    width: 0,
                                    height: 0,
                                    borderLeft: '6px solid transparent',
                                    borderRight: '6px solid transparent',
                                    borderTop: '6px solid hsl(330, 3%, 19%)'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
