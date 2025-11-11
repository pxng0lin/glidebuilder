import type { ParsedReport } from './types';

/**
 * Parses vulnerability report markdown to extract metadata and artifacts.
 * Handles common formats like Sherlock audit reports, GitHub issues, etc.
 */
export async function parseVulnerabilityReport(markdown: string, source?: string): Promise<ParsedReport> {
  console.log('[parser] received markdown characters:', markdown.length);

  // Extract title from first heading or "Summary" section
  let title = 'Unknown Vulnerability';
  const titleMatch = markdown.match(/^#\s+(.+)$/m) || markdown.match(/##\s*Summary\s*\n+(.+)/i);
  if (titleMatch) {
    title = titleMatch[1].trim();
  }

  // Extract severity from common patterns (optional)
  let severity: string | undefined;
  const explicitSeverity = markdown.match(/##\s*(?:Severity|Impact)\s*\n+(\w+)/i);
  if (explicitSeverity) {
    severity = explicitSeverity[1].toLowerCase();
  } else {
    const severityMatch = markdown.match(/\b(critical|high|medium|low)\s+(?:severity|impact|risk)\b/i) ||
                          markdown.match(/(?:severity|impact|risk)[:\s]+\b(critical|high|medium|low)\b/i);
    if (severityMatch) {
      severity = severityMatch[1].toLowerCase();
    }
  }

  // Extract vulnerability type from title and content
  let vulnType = 'unknown';
  const titleLower = title.toLowerCase();
  
  // Common vulnerability type patterns (order matters - more specific first)
  const vulnTypePatterns = {
    'reentrancy': /reentrancy|re-entrancy/i,
    'access-control': /access[\s-]?control|unauthorized|permission|admin|upper[\s-]?bound|lower[\s-]?bound|bound.*lack|lack.*bound/i,
    'slippage': /slippage|sandwich.*attack|mev.*attack/i,
    'oracle': /oracle|price[\s-]?feed|chainlink|stale.*price|price.*stale/i,
    'unchecked-return': /unchecked[\s-]?return|return[\s-]?value.*unchecked/i,
    'validation': /validation|input.*check|parameter.*check|bound.*check|lacks.*validation|missing.*validation|lacks.*check|missing.*check/i,
    'calculation': /calculation|math|arithmetic|overflow|underflow/i,
    'dos': /denial[\s-]?of[\s-]?service|dos|grief|brick.*flow|brick.*user/i,
    'deadline': /deadline.*missing|missing.*deadline|timestamp.*check/i,
    'front-running': /front[\s-]?run|mev(?!.*attack)/i,
    'token-transfer': /token[\s-]?transfer|erc20|erc721/i,
    'liquidity': /liquidity|pool|amm/i,
    'bridge': /bridge|cross[\s-]?chain|layerzero/i,
  };
  
  for (const [type, pattern] of Object.entries(vulnTypePatterns)) {
    if (pattern.test(titleLower)) {
      vulnType = type;
      break;
    }
  }
  
  // If not found in title, check full markdown but be more conservative
  if (vulnType === 'unknown') {
    for (const [type, pattern] of Object.entries(vulnTypePatterns)) {
      if (pattern.test(markdown.substring(0, 500))) {  // Only check first 500 chars
        vulnType = type;
        break;
      }
    }
  }
  
  // Generate date (current date in YYYY-MM-DD format)
  const date = new Date().toISOString().split('T')[0];

  // Extract code snippets as artifacts
  const artifacts = [];
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  let match;
  let index = 0;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    artifacts.push({
      label: `Code Snippet ${++index}${match[1] ? ` (${match[1]})` : ''}`,
      content: match[2].trim(),
    });
  }

  return {
    raw: markdown,
    metadata: {
      title,
      severity,
      vulnType,
      source,
      date,
    },
    artifacts,
  };
}
