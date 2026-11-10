// llms.txt: a short Markdown summary with links, for AI assistants.
import { paper, authors, SITE, arxivUrl, venueLine, apaCitation } from '../lib/data';

export function GET() {
  const md = `# ${paper.title}

> ${paper.tldr}

${authors.map((a) => a.name).join(', ')}. ${authors[0].affiliation}. ${venueLine}.

## Links

- [Project page](${SITE}/)
- [Paper (PDF, ACL Anthology)](${paper.links.pdf})
- [arXiv](${arxivUrl})
- [Code and testbed](${paper.links.code})
- [Poster (PDF)](${paper.links.poster})

## Key findings

${paper.findings.items.map((f: any) => `- ${f.lead} ${f.text}`).join('\n')}

## Citation

${apaCitation}
`;
  return new Response(md, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
