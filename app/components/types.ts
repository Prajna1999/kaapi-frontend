/**
 * Shared TypeScript types for evaluation components
 */

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

export interface ScoreObject {
  cosine_similarity: CosineSimilarity;
}

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
  score: ScoreObject | null;
  error_message: string | null;
  config: {
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
