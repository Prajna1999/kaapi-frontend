/**
 * Shared TypeScript types for evaluation components
 */

// New score structure types
export interface TraceScore {
  name: string;
  value: number | string;
  data_type: 'NUMERIC' | 'CATEGORICAL';
  comment?: string;
}

export interface IndividualScore {
  trace_id: string;
  input?: {
    question: string;
  };
  output?: {
    answer: string;
  };
  metadata?: {
    ground_truth?: string;
    item_id?: string;
    response_id?: string;
  };
  trace_scores: TraceScore[];
}

export interface SummaryScore {
  name: string;
  avg?: number;
  std?: number;
  total_pairs: number;
  data_type: 'NUMERIC' | 'CATEGORICAL';
  distribution?: Record<string, number>; // For categorical data
}

export interface NewScoreObject {
  summary_scores: SummaryScore[];
  individual_scores: IndividualScore[];
}

// Legacy score structure (for backward compatibility)
export interface PerItemScore {
  trace_id: string;
  cosine_similarity: number;
}

export interface CosineSimilarity {
  avg: number;
  std: number;
  total_pairs: number;
  per_item_scores: PerItemScore[];
}

export interface LegacyScoreObject {
  cosine_similarity: CosineSimilarity;
}

// Union type to support both old and new structures
export type ScoreObject = NewScoreObject | LegacyScoreObject;

export interface AssistantConfig {
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

export interface EvalJob {
  id: number;
  run_name: string;
  dataset_name: string;
  dataset_id: number;
  batch_job_id: number;
  embedding_batch_job_id: number | null;
  status: string;
  object_store_url: string | null;
  total_items: number;
  score?: ScoreObject | null;
  scores?: ScoreObject | null; // Alternative field name
  error_message: string | null;
  config?: {
    model?: string;
    instructions?: string;
    tools?: any[];
    include?: string[];
    temperature?: number;
  };
  assistant_id?: string;
  organization_id: number;
  project_id: number;
  inserted_at: string;
  updated_at: string;
}

// Type guard functions
export function isNewScoreObject(score: ScoreObject | null | undefined): score is NewScoreObject {
  if (!score) return false;
  return 'summary_scores' in score && 'individual_scores' in score;
}

export function isLegacyScoreObject(score: ScoreObject | null | undefined): score is LegacyScoreObject {
  if (!score) return false;
  return 'cosine_similarity' in score;
}

// Helper to get score object from job
export function getScoreObject(job: EvalJob): ScoreObject | null {
  return job.scores || job.score || null;
}
