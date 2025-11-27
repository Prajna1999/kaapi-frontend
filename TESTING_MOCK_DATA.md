# Testing with Mock Evaluation Data

This guide explains how to test the new evaluation report UI with mock data.

## Quick Start

### Option 1: Using the Test Page (Easiest)

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: **http://localhost:3000/test-evaluation**

3. Click on either evaluation card to view the mock data

### Option 2: Direct URL Access

Navigate directly to the evaluation detail pages:
- **Evaluation #43 (Hindi)**: http://localhost:3000/evaluations/43
- **Evaluation #44 (English)**: http://localhost:3000/evaluations/44

## Mock Data Files

Located in `/public/mock-data/`:

### `evaluation-sample-1.json` (ID: 43)
- **Language**: Hindi
- **Items**: 4 Q&A pairs
- **Scores**:
  - cosine_similarity (NUMERIC)
  - SNEHA correctness (NUMERIC)
  - llm_judge_relevance (NUMERIC)
  - response_category (CATEGORICAL)
- **Features**: Mix of CORRECT, PARTIAL, and INCORRECT responses

### `evaluation-sample-2.json` (ID: 44)
- **Language**: English
- **Items**: 3 Q&A pairs
- **Scores**: Same as above
- **Features**: Higher average scores, includes assistant config
- **Special**: 2 CORRECT, 1 PARTIAL (no INCORRECT)

## What to Test

### 1. Table View
- ✅ Question, Answer, Ground Truth columns display properly
- ✅ All score columns appear dynamically
- ✅ Long text truncates with expand/collapse (details/summary)
- ✅ Score values are color-coded (green/yellow/red)
- ✅ Comments appear below scores
- ✅ No trace IDs visible (as requested)
- ✅ Row hover effects work

### 2. Metrics Overview
- ✅ All NUMERIC metrics show avg ± std
- ✅ CATEGORICAL metrics show distribution
- ✅ Responsive grid layout
- ✅ Proper formatting (3 decimal places for scores)

### 3. CSV Export
- ✅ Click "Export CSV" button
- ✅ File downloads with all columns
- ✅ Q&A pairs and scores included
- ✅ Proper CSV escaping

### 4. Navigation
- ✅ Back button returns to /evaluations?tab=results
- ✅ View Config button opens modal
- ✅ Sidebar navigation works

### 5. Assistant Info
- ✅ Evaluation #44 shows assistant badge
- ✅ Evaluation #43 shows no assistant

## Switching Between Mock and Real Data

### Enable Mock Data (Default)
In `/app/api/evaluations/[id]/route.ts`:
```typescript
const USE_MOCK_DATA = true;
```

### Disable Mock Data (Use Real Backend)
```typescript
const USE_MOCK_DATA = false;
```

**Note**: After changing this, restart your dev server.

## ID Mapping

The mock API maps IDs to files:
- **ID 43, 1, or any other number** → `evaluation-sample-1.json`
- **ID 44 or 2** → `evaluation-sample-2.json`

You can modify this mapping in `/app/api/evaluations/[id]/route.ts`

## Adding More Mock Data

1. Create a new JSON file in `/public/mock-data/`
2. Follow the structure in existing samples
3. Update the ID mapping in the API route:

```typescript
let mockFileName = 'evaluation-sample-1.json';
if (id === '44' || id === '2') {
  mockFileName = 'evaluation-sample-2.json';
} else if (id === '45') {
  mockFileName = 'your-new-file.json'; // Add your mapping
}
```

## Expected Response Structure

The mock data follows this structure:

```json
{
  "id": 43,
  "run_name": "...",
  "dataset_name": "...",
  "status": "completed",
  "total_items": 4,
  "scores": {
    "summary_scores": [
      {
        "name": "cosine_similarity",
        "avg": 0.453,
        "std": 0.060,
        "total_pairs": 4,
        "data_type": "NUMERIC"
      },
      {
        "name": "response_category",
        "distribution": { "CORRECT": 1, "PARTIAL": 2, "INCORRECT": 1 },
        "total_pairs": 4,
        "data_type": "CATEGORICAL"
      }
    ],
    "individual_scores": [
      {
        "trace_id": "...",
        "input": { "question": "..." },
        "output": { "answer": "..." },
        "metadata": { "ground_truth": "..." },
        "trace_scores": [
          {
            "name": "cosine_similarity",
            "value": 0.452,
            "data_type": "NUMERIC"
          },
          {
            "name": "response_category",
            "value": "INCORRECT",
            "data_type": "CATEGORICAL"
          }
        ]
      }
    ]
  }
}
```

## Troubleshooting

### Mock data not loading
- Check console for `[MOCK MODE]` logs
- Verify files exist in `/public/mock-data/`
- Ensure `USE_MOCK_DATA = true`

### Table not showing
- Check browser console for errors
- Verify `scores.individual_scores` exists in JSON
- Check that all required fields are present

### Scores not color-coded
- Verify `data_type` is set correctly
- Check that NUMERIC values are numbers, not strings
- Ensure CATEGORICAL values match expected values

## Production Deployment

**IMPORTANT**: Before deploying to production:

1. Set `USE_MOCK_DATA = false` in `/app/api/evaluations/[id]/route.ts`
2. Delete or hide `/app/test-evaluation/page.tsx` (optional)
3. Test with real backend to ensure everything works

## Next Steps

After testing with mock data and confirming the UI works:

1. Update the backend API to return the new structure
2. Set `USE_MOCK_DATA = false`
3. Test with real evaluation data
4. Deploy to production

---

**Need Help?** Check the implementation files:
- Type definitions: `/app/components/types.ts`
- Table component: `/app/components/DetailedResultsTable.tsx`
- Detail page: `/app/evaluations/[id]/page.tsx`
