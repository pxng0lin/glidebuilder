import { NextResponse } from 'next/server';

import { generateBreakdownDocument } from '@/backend/generator';
import { loadBreakdownReferences, loadGliderTemplates } from '@/backend/template-loader';
import { parseVulnerabilityReport } from '@/backend/parser';

export async function POST(request: Request) {
  try {
    const { markdown, source } = (await request.json()) as { markdown?: string; source?: string };

    if (!markdown) {
      return NextResponse.json(
        { error: 'Missing markdown payload' },
        { status: 400 }
      );
    }

    const parsedReport = await parseVulnerabilityReport(markdown, source);
    const [templates, breakdownReferences] = await Promise.all([
      loadGliderTemplates(),
      loadBreakdownReferences(),
    ]);

    const document = await generateBreakdownDocument({
      report: parsedReport,
      referenceBreakdowns: breakdownReferences,
      templates,
    });

    return NextResponse.json({
      document,
      fileName: 'vulnerability-breakdown.md',
    });
  } catch (error) {
    console.error('[api/generate] failed', error);
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Generation failed. Please try again.';
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: 'The AI was unable to generate a breakdown document. Please try again with a more detailed vulnerability report or review the server logs for more information.'
      }, 
      { status: 500 }
    );
  }
}
