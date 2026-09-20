export type RelationType = "sameAs" | "closeMatch" | "relatedMatch" | "sourceLink";

export interface ExternalMatch {
  source: string;
  external_id: string;
  title: string;
  description?: string;
  url?: string;
  rights?: string;
  provider?: string;
  raw: unknown;
  match_score: number;
  relation_type: RelationType;
}

export interface OpenDataConnector {
  name: string;
  searchExternalSource(query: string): Promise<ExternalMatch[]>;
  testConnection(): Promise<boolean>;
}
