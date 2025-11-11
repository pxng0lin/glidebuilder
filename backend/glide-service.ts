import { generateGlideScript } from './generator';
import { loadReferenceTemplates } from './template-loader';
import { parseVulnerabilityReport } from './parser';
import type { GlideGenerationContext } from './types';

export async function buildGenerationContext(markdown: string): Promise<GlideGenerationContext> {
  const report = await parseVulnerabilityReport(markdown);
  const { strictTemplate, broadTemplate } = await loadReferenceTemplates();

  return {
    report,
    strictTemplate,
    broadTemplate,
  };
}

export async function generateFromMarkdown(markdown: string) {
  const context = await buildGenerationContext(markdown);
  return generateGlideScript(context);
}
