export type RelationType = "sameAs" | "closeMatch" | "relatedMatch" | "sourceLink" | "exactMatch";

export interface ExternalMatch {
  /** Nome da fonte cultural (ex: "Wikidata", "Europeana", "Tainacan") */
  source: string;
  /** Identificador externo que preserva a origem */
  external_id: string;
  title: string;
  description?: string;
  url?: string;
  rights?: string;
  provider?: string;
  /** Dados brutos da fonte — preservação completa da origem */
  raw?: unknown;
  match_score: number;
  relation_type: RelationType;
  /** Nome do conector/adaptador que produziu este resultado */
  connector?: string;
}

export interface OpenDataConnector {
  name: string;
  searchExternalSource(query: string): Promise<ExternalMatch[]>;
  testConnection?(): Promise<boolean>;
}

