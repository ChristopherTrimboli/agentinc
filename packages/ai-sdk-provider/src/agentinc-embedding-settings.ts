export type AgentIncEmbeddingModelId =
  | "openai/text-embedding-3-large"
  | "openai/text-embedding-3-small"
  | (string & {});

export interface AgentIncEmbeddingSettings {
  /**
   * The number of dimensions the resulting output embeddings should have.
   * Only supported by certain models.
   */
  dimensions?: number;

  /**
   * A unique identifier representing the end-user for rate-limiting
   * and abuse monitoring.
   */
  user?: string;
}
