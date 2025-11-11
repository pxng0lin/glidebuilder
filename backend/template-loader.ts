import { promises as fs } from 'node:fs';
import { join } from 'node:path';

import type { BreakdownReference, GlideTemplate } from './types';

const TEMPLATE_DIRECTORY = join(process.cwd(), 'templates');
const BREAKDOWN_DIRECTORY = join(TEMPLATE_DIRECTORY, 'breakdowns');
const GLIDER_DIRECTORY = join(TEMPLATE_DIRECTORY, 'gliders');

const TRIPLE_QUOTE_REGEX = /"""([\s\S]*?)"""/m;

function extractMetadataFromDocstring(docstring: string | undefined) {
  if (!docstring) {
    return {};
  }

  const titleMatch = docstring.match(/@title:\s*(.+)/i);
  const descriptionMatch = docstring.match(/@description:\s*([\s\S]*?)(?:\n\s*@|$)/i);
  const tagsMatch = docstring.match(/@tags:\s*(.+)/i);

  const title = titleMatch ? titleMatch[1].trim() : undefined;
  const description = descriptionMatch ? descriptionMatch[1].trim() : undefined;
  const tags = tagsMatch ? tagsMatch[1].split(',').map((tag) => tag.trim()).filter(Boolean) : undefined;

  return { title, description, tags };
}

export async function loadGliderTemplates(): Promise<GlideTemplate[]> {
  try {
    const entries = await fs.readdir(GLIDER_DIRECTORY);
    const pythonFiles = entries.filter((entry) => entry.endsWith('.py'));

    const templates = await Promise.all(
      pythonFiles.map(async (fileName) => {
        const filePath = join(GLIDER_DIRECTORY, fileName);
        const content = await fs.readFile(filePath, 'utf8');

        const docstringMatch = content.match(TRIPLE_QUOTE_REGEX);
        const docstring = docstringMatch ? docstringMatch[1] : undefined;
        const metadata = extractMetadataFromDocstring(docstring);

        return {
          id: fileName.replace(/\.py$/i, ''),
          title: metadata.title ?? fileName.replace(/\.py$/i, ''),
          description: metadata.description,
          tags: metadata.tags,
          codeSnippet: content,
          fileName,
          relativePath: `templates/gliders/${fileName}`,
        } satisfies GlideTemplate;
      })
    );

    return templates;
  } catch (error) {
    console.warn('[template-loader] Failed to load glider templates:', error);
    return [];
  }
}

/**
 * Load reference breakdown documents that should inform the generated analysis.
 * These files provide style, structure, and domain heuristics for the AI model.
 */
export async function loadBreakdownReferences(): Promise<BreakdownReference[]> {
  try {
    const entries = await fs.readdir(BREAKDOWN_DIRECTORY, { withFileTypes: true });
    const markdownFiles = entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort();

    const references = await Promise.all(
      markdownFiles.map(async (fileName) => {
        const filePath = join(BREAKDOWN_DIRECTORY, fileName);
        const content = await fs.readFile(filePath, 'utf8');

        const headingMatch = content.match(/^#\s+(.+)$/m);
        const title = headingMatch ? headingMatch[1].trim() : fileName.replace(/\.md$/i, '');

        return {
          id: fileName.replace(/\.md$/i, ''),
          title,
          content,
        } satisfies BreakdownReference;
      })
    );

    return references;
  } catch (error) {
    console.warn('[template-loader] Failed to load breakdown references:', error);
    return [];
  }
}
