/**
 * Shared utility functions for evaluation components
 */

/**
 * Converts a date string to IST timezone and formats it
 * @param dateString - Date string from backend (in IST format but without timezone info)
 * @returns Formatted date string in en-GB locale with 12-hour format
 */
export const formatDate = (dateString: string): string => {
  // Parse the date string and treat it as IST time
  const date = new Date(dateString);
  // Add 5.5 hours (IST offset) since the input is already in IST but parsed as UTC
  const istDate = new Date(date.getTime() + (5.5 * 60 * 60 * 1000));
  return istDate.toLocaleString('en-GB', { hour12: true });
};

/**
 * Returns color scheme based on job/evaluation status
 * @param status - Status string (completed, processing, failed, etc.)
 * @returns Object with bg, border, and text HSL color values
 */
export const getStatusColor = (status: string): { bg: string; border: string; text: string } => {
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

/**
 * Calculates dynamic thresholds for color coding based on score distribution
 * @param scores - Array of similarity scores
 * @returns Object with high and medium threshold values (percentile-based)
 */
export const calculateDynamicThresholds = (scores: number[]): { highThreshold: number; mediumThreshold: number } => {
  if (scores.length === 0) {
    return { highThreshold: 0.7, mediumThreshold: 0.5 };
  }

  // Sort scores in ascending order
  const sortedScores = [...scores].sort((a, b) => a - b);

  // Calculate 33rd and 67th percentiles
  const lowPercentileIndex = Math.floor(sortedScores.length * 0.33);
  const highPercentileIndex = Math.floor(sortedScores.length * 0.67);

  const mediumThreshold = sortedScores[lowPercentileIndex];
  const highThreshold = sortedScores[highPercentileIndex];

  return { highThreshold, mediumThreshold };
};

/**
 * Returns color scheme based on similarity score with dynamic or fixed thresholds
 * @param similarity - Cosine similarity score (0-1)
 * @param thresholds - Optional dynamic thresholds { highThreshold, mediumThreshold }
 * @returns Object with bg, border, and text HSL color values
 */
export const getScoreColor = (
  similarity: number,
  thresholds?: { highThreshold: number; mediumThreshold: number }
): { bg: string; border: string; text: string } => {
  // Use dynamic thresholds if provided, otherwise use fixed thresholds
  const highThreshold = thresholds?.highThreshold ?? 0.7;
  const mediumThreshold = thresholds?.mediumThreshold ?? 0.5;

  if (similarity >= highThreshold) {
    return { bg: 'hsl(134, 61%, 95%)', border: 'hsl(134, 61%, 70%)', text: 'hsl(134, 61%, 25%)' };
  } else if (similarity >= mediumThreshold) {
    return { bg: 'hsl(46, 100%, 97%)', border: 'hsl(46, 100%, 85%)', text: 'hsla(50, 84%, 58%, 1.00)' };
  } else {
    return { bg: 'hsl(8, 86%, 95%)', border: 'hsl(8, 86%, 80%)', text: 'hsl(8, 86%, 40%)' };
  }
};
