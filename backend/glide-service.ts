import { generateBreakdownDocument } from './generator';
import { loadBreakdownReferences, loadGliderTemplates } from './template-loader';
import { parseVulnerabilityReport } from './parser';
import type { BreakdownGenerationContext } from './types';

export async function buildGenerationContext(markdown: string): Promise<BreakdownGenerationContext> {
  const report = await parseVulnerabilityReport(markdown);
  const [templates, referenceBreakdowns] = await Promise.all([
    loadGliderTemplates(),
    loadBreakdownReferences(),
  ]);

  return {
    report,
    templates,
    referenceBreakdowns,
  };
}

export async function generateFromMarkdown(markdown: string) {
  const context = await buildGenerationContext(markdown);
  return generateBreakdownDocument(context);
}
