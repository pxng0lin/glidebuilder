import { generateText } from 'ai';

import { openai } from '@/lib/echo';

import type { BreakdownGenerationContext, GlideTemplate } from './types';

export interface GenerateBreakdownDocumentOptions {
  /** Override the default Echo model identifier. */
  modelId?: string;
}

const DEFAULT_MODEL_ID = 'gpt-5-mini';
const FALLBACK_MODEL_ID = 'gpt-5-nano';
const MAX_REPORT_LENGTH = 6000;
const MAX_REFERENCE_LENGTH = 2500;
const MAX_TOTAL_REFERENCE_LENGTH = 9000;
const MAX_TEMPLATE_SUMMARY_LENGTH = 420;
const LOCAL_LLM_ENABLED =
  process.env.LOCAL_LLM_ENABLED === 'true' && process.env.NODE_ENV !== 'production';
const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL ?? 'http://localhost:11434';
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL ?? 'qwen3:8b';
const FALLBACK_SUMMARY_LENGTH = 600;

function truncate(content: string, maxLength: number): string {
  if (content.length <= maxLength) {
    return content;
  }

  return `${content.slice(0, maxLength)}\n... (truncated)`;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function summarizeTemplate(text: string | undefined, maxLength: number): string | undefined {
  if (!text) {
    return undefined;
  }

  const normalized = normalizeWhitespace(text);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength)}…`;
}

function buildTemplateDigest(templates: GlideTemplate[]): string {
  if (!templates.length) {
    return 'No glider boilerplates were provided.';
  }

  return templates
    .map((template) => {
      const summary = summarizeTemplate(template.description, MAX_TEMPLATE_SUMMARY_LENGTH);
      return [
        `### ${template.title}`,
        summary ? `- Synopsis: ${summary}` : undefined,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}

function buildReferenceDigest(
  references: BreakdownGenerationContext['referenceBreakdowns']
): string {
  if (!references.length) {
    return 'No additional breakdown references available.';
  }

  let consumed = 0;
  const parts: string[] = [];

  for (const reference of references) {
    if (consumed >= MAX_TOTAL_REFERENCE_LENGTH) {
      break;
    }

    const remaining = MAX_TOTAL_REFERENCE_LENGTH - consumed;
    const clipped = truncate(reference.content, Math.min(MAX_REFERENCE_LENGTH, remaining));
    consumed += clipped.length;

    parts.push(
      `### ${reference.title}\n${clipped.trim()}`
    );
  }

  return parts.join('\n\n---\n\n');
}

function buildGliderSkeleton(): string {
  return [
    'from glider import *',
    '',
    'def query():',
    '    """',
    '    @title: <replace with concise detection title>',
    '    @description:',
    '      Detects <summarize the confirmed behaviour> by analysing:',
    '        - <bullet describing exploit path>',
    '        - <bullet describing impact or prerequisite>',
    '',
    '      This enables <note on business/technical impact>.',
    '',
    '      A hit requires:',
    '        - <criterion #1>',
    '        - <criterion #2>',
    '        - <add more criteria as needed>',
    '',
    '    @tags: tag-one, tag-two, tag-three',
    '    """',
    '',
    '    LIMIT_FUNCS = 1_000',
    '',
    '    def matches_primary_signal(fn):',
    '        """Outline the principal signal expected for a true positive."""',
    '        # TODO: Implement predicate using fn.instructions(), fn.callee_functions(), storage(), etc.',
    '        return False',
    '',
    '    def reinforces_context(fn):',
    '        """Capture secondary heuristics surfaced in the breakdown."""',
    '        # TODO: Implement context checks drawn from the report.',
    '        return False',
    '',
    '    def excludes_false_positives(fn):',
    '        """List guard rails that remove benign matches or admin-only flows."""',
    '        # TODO: Implement guard rail logic once defined.',
    '        return True',
    '',
    '    output = (',
    '        Functions()',
    '        .exec(LIMIT_FUNCS)',
    '        # .filter(<helper_name>)  # implement your filter based on breakdown criteria',
    '        # .filter(<helper_name>)  # implement your filter based on breakdown criteria',
    '        # .filter(<helper_name>)  # implement your filter based on breakdown criteria',
    '    )',
    '',
    '    return output',
    '',
    '# Add additional helper functions that cover every detection criterion identified in the breakdown.',
  ].join('\n').trimEnd();
}

export async function generateGlideScript(context: BreakdownGenerationContext) {
  return generateBreakdownDocument(context);
}

function buildPrompt(context: BreakdownGenerationContext): string {
  const { report, referenceBreakdowns, templates } = context;

  const metadataLines = [
    `Title: ${report.metadata.title}`,
    `Severity: ${report.metadata.severity ?? 'unknown'}`,
    `Vulnerability Type: ${report.metadata.vulnType}`,
  ];

  if (report.metadata.source) {
    metadataLines.push(`Source: ${report.metadata.source}`);
  }

  if (report.metadata.date) {
    metadataLines.push(`Date: ${report.metadata.date}`);
  }

  const artifacts = report.artifacts
    .map((artifact) => `- ${artifact.label}`)
    .join('\n') || 'None detected in the submitted report.';

  const referenceDigest = buildReferenceDigest(referenceBreakdowns);
  const templateDigest = buildTemplateDigest(templates);

  const truncatedReport = truncate(report.raw, MAX_REPORT_LENGTH);

  return `
You are a senior blockchain security analyst. Using the provided vulnerability report, reference breakdowns, and glider boilerplate templates, produce a concise Markdown breakdown for investigators.

Respect the following rules:
- Base your analysis on the supplied report; use reference breakdowns for style, structure, and heuristics.
- Maintain analytical tone, clearly attributing assumptions or missing data.
- Do not produce Glider or Python code. Detection guidance must remain descriptive and cite only official Glider documentation when referencing code samples.
- When discussing Glider implementation, refer to helper functions by name and note that \`query()\` is defined without a return type annotation while returning those helper pipelines.
- Describe the helper workflow exactly as in the official templates: \`LIMIT_FUNCS = 1_000\` inside \`query()\`, inline helper functions without type annotations (e.g., \`def has_bridge_context(fn):\`) that return booleans, and a final \`vulnerable_funcs = Functions().exec(LIMIT_FUNCS)\` chain referencing those helpers in order.
- Emphasise API-first helper names that mirror the Nomad/unchecked-transfer examples (e.g., \`has_unchecked_token_transfers\`, \`has_bridge_context\`, \`lacks_access_controls\`), and align each blueprint step to those concrete helper responsibilities.
- Include actionable insights that map back to evidence or heuristics from the report.
- Treat the INTERNAL TEMPLATE HINTS as private context; never mention file names, paths, tags, or template identifiers in the output.
- Do not include meta sections such as "Reasoning", "Thoughts", or any <think> tags in the final response.

--- METADATA ---
${metadataLines.join('\n')}

--- SUBMITTED REPORT (Markdown) ---
${truncatedReport}

--- AVAILABLE ARTIFACTS ---
${artifacts}

--- REFERENCE BREAKDOWNS (abbreviated) ---
${referenceDigest}

--- INTERNAL TEMPLATE HINTS (DO NOT CITE) ---
${templateDigest}

--- OUTPUT FORMAT REQUIREMENTS ---
Return Markdown with **exactly** the following sections, in order:
1. # [Vulnerability Title] Breakdown
2. ## Vulnerability Breakdown (summarize core flaw, root cause, and exploit flow)
3. ## Evidence & Code Snippets (quote pertinent report snippets or on-chain code; include brief context)
4. ## Glider Detection Blueprint (outline descriptive steps for Functions()/filters to confirm a true positive; cite only official Glider docs when referencing APIs)

In the Glider Detection Blueprint, anchor each step to the helper function(s) you would define (e.g., \`detect_unprotected_withdrawals\`, \`matches_unprotected_withdraw\`) and describe how \`query()\` delegates to them.

Use bullet lists where helpful, otherwise concise paragraphs. Tie each detection recommendation back to observed behavior or references. Avoid placeholder text.
`.trim();
}

function summarize(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text.trim();
  }

  const truncated = text.slice(0, maxLength);
  const lastExtent = Math.max(
    truncated.lastIndexOf('.'),
    truncated.lastIndexOf('\n\n'),
    truncated.lastIndexOf('\n')
  );

  const safeCut = lastExtent > 200 ? lastExtent : maxLength;
  return `${truncated.slice(0, safeCut).trim()}…`;
}

function buildFallbackDocument(context: BreakdownGenerationContext, error: unknown): string {
  const { report, referenceBreakdowns, templates } = context;
  const excerpt = summarize(report.raw, FALLBACK_SUMMARY_LENGTH);

  const referenceTitles =
    referenceBreakdowns.length > 0
      ? referenceBreakdowns.map((ref) => `- ${ref.title}`).join('\n')
      : '- None available';

  const artifactList =
    report.artifacts.length > 0
      ? report.artifacts.map((artifact) => `- ${artifact.label}`).join('\n')
      : '- No code snippets detected';

  const failureNote =
    error instanceof Error ? error.message : 'Unknown model failure while generating breakdown.';

  return [
    `# ${report.metadata.title} Breakdown`,
    '## Vulnerability Breakdown',
    excerpt || 'Report content was not provided.',
    '## Evidence & Code Snippets',
    artifactList,
    '## Glider Detection Blueprint',
    [
      'Start with Glider helper functions that map to the failure mode:',
      '1. Filter externally callable entry points touching the vulnerable state.',
      '2. Inspect arithmetic or state transitions highlighted in the report.',
      '3. Correlate on-chain events or storage transitions that confirm the exploit path.',
      '',
      'Reference breakdowns you can adapt:',
      referenceTitles,
      '',
      'Consult official Glider documentation for Functions(), Instructions(), and Contracts() usage patterns.',
    ].join('\n'),
    '',
    `> AI fallback notice: ${failureNote}`,
  ].join('\n\n');
}

function assembleDocument(markdown: string, skeleton: string): string {
  return [
    markdown.trim(),
    '## Boilerplate Glider Skeleton',
    'Use this scaffold as a starting point while following official Glider examples.',
    '```python',
    skeleton,
    '```',
  ].join('\n\n');
}

function sanitizeModelResponse(text: string): string {
  let cleaned = text;

  // Remove explicit reasoning blocks like <think>...</think>
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '');

  // Remove headings or paragraphs labelled as reasoning/thoughts
  cleaned = cleaned.replace(/^\s*(#+\s*)?(Reasoning|Thoughts|Analysis)\s*:?.*$/gim, '');

  // Collapse repeated blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

async function callLocalModel(prompt: string): Promise<string> {
  const endpoint = `${LOCAL_LLM_URL.replace(/\/$/, '')}/api/generate`;
  console.log('[generator] Using local model endpoint:', endpoint, 'model:', LOCAL_LLM_MODEL);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: LOCAL_LLM_MODEL,
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
      },
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Local model request failed (${response.status}): ${errorBody}`);
  }

  const payload = (await response.json()) as { response?: string; error?: string };
  if (payload.error) {
    throw new Error(`Local model error: ${payload.error}`);
  }

  const output = payload.response ?? '';
  if (!output.trim()) {
    throw new Error('Local model returned an empty response.');
  }

  return output;
}

async function tryGenerateMarkdown(
  context: BreakdownGenerationContext,
  modelId: string
): Promise<string> {
  const modelLabel = LOCAL_LLM_ENABLED ? `local:${LOCAL_LLM_MODEL}` : modelId;
  console.log('[generator] Calling AI with model:', modelLabel);

  const prompt = buildPrompt(context);
  console.log('[generator] Prompt preview:', prompt.slice(0, 400).replace(/\s+/g, ' ') + '...');

  let rawOutput: string;

  if (LOCAL_LLM_ENABLED) {
    rawOutput = await callLocalModel(prompt);
  } else {
    const { text } = await generateText({
      model: openai(modelId) as any,
      maxTokens: 2500,
      temperature: 0.35,
      prompt,
    });

    if (!text) {
      throw new Error('Model returned empty response.');
    }

    rawOutput = text;
  }

  const cleaned = sanitizeModelResponse(rawOutput);

  if (!cleaned) {
    throw new Error('Model returned empty response after sanitization.');
  }

  return cleaned;
}

export async function generateBreakdownDocument(
  context: BreakdownGenerationContext,
  options: GenerateBreakdownDocumentOptions = {}
): Promise<string> {
  const modelId = options.modelId ?? DEFAULT_MODEL_ID;
  const skeleton = buildGliderSkeleton();

  try {
    const markdown = await tryGenerateMarkdown(context, modelId);
    const finalDoc = assembleDocument(markdown, skeleton);
    console.log('[generator] ✅ Breakdown generation successful.');
    return `${finalDoc.trim()}\n`;
  } catch (primaryError) {
    console.error('[generator] Model generation failed on primary model:', primaryError);

    let failure = primaryError;

    if (!LOCAL_LLM_ENABLED && modelId !== FALLBACK_MODEL_ID) {
      console.log('[generator] Retrying with fallback model:', FALLBACK_MODEL_ID);
      try {
        const markdown = await tryGenerateMarkdown(context, FALLBACK_MODEL_ID);
        const fallbackDoc = assembleDocument(markdown, skeleton);

        console.log('[generator] ✅ Breakdown generation succeeded with fallback model.');
        return `${fallbackDoc.trim()}\n`;
      } catch (fallbackError) {
        console.error('[generator] ❌ Fallback model also failed:', fallbackError);
        failure = fallbackError;
      }
    }

    const fallbackMarkdown = buildFallbackDocument(context, failure);
    console.warn('[generator] Providing static fallback breakdown due to model failure.');
    return `${assembleDocument(fallbackMarkdown, skeleton).trim()}\n`;
  }
}
