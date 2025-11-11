#!/usr/bin/env tsx

import { promises as fs } from 'node:fs';
import { resolve } from 'node:path';

import { generateFromMarkdown } from '../backend/glide-service';

async function main() {
  const [, , inputPathArg] = process.argv;

  if (!inputPathArg) {
    console.error('Usage: pnpm cli <path-to-report.md>');
    process.exit(1);
  }

  const resolvedInputPath = resolve(process.cwd(), inputPathArg);
  const markdown = await fs.readFile(resolvedInputPath, 'utf8');

  console.log('[cli] Generating glide script from', resolvedInputPath);

  const output = await generateFromMarkdown(markdown);
  const outputPath = resolve(process.cwd(), 'output.glide.py');
  await fs.writeFile(outputPath, output, 'utf8');

  console.log(`[cli] Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error('[cli] Failed to generate script');
  console.error(error);
  process.exit(1);
});
