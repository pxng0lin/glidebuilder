export interface ParsedReportMetadata {
  title: string;
  severity?: string;  // Optional: High, Medium, Low, Critical
  vulnType: string;   // Required: Type of vulnerability (e.g., "slippage", "reentrancy")
  source?: string;    // Optional: Source of the report
  date?: string;      // Optional: Date of the report or generation
}

export interface ParsedArtifact {
  label: string;
  content: string;
}

export interface ParsedReport {
  raw: string;
  metadata: ParsedReportMetadata;
  artifacts: ParsedArtifact[];
}

export interface GlideTemplate {
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  codeSnippet: string;
  fileName?: string;
  relativePath?: string;
}

export interface BreakdownReference {
  id: string;
  title: string;
  content: string;
}

export interface BreakdownGenerationContext {
  report: ParsedReport;
  referenceBreakdowns: BreakdownReference[];
  templates: GlideTemplate[];
}
