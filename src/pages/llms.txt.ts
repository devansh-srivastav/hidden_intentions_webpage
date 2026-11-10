// llms.txt: the full English page as Markdown, for AI assistants. Built from the same content
// files as the page, so it never drifts from it.
import { paper, authors, translations, published, SITE, arxivUrl, venueLine, apaCitation, bibtex, doi } from '../lib/data';

const pct = (v: number) => `${Math.round(v * 100)}%`;
const paras = (ps: string[]) => ps.join('\n\n');

// Each results chart, as the numbers behind it.
const chartText = (c: any): string => {
  if (!c) return '';
  if (c.kind === 'static')
    return `${c.title} (${c.a_label.toLowerCase()} → ${c.b_label.toLowerCase()}):\n\n` +
      c.rows.map((r: any) => `- ${r.label}: ${pct(r.a)} → ${pct(r.b)}`).join('\n') + `\n\n${c.caption}`;
  if (c.kind === 'judges')
    return `${c.title}. Benign outputs flagged (FPR) and hidden intentions missed (FNR), ${c.a_label.toLowerCase()} → ${c.b_label.toLowerCase()}:\n\n` +
      // same order as the chart: mostly flagging benign outputs first, mostly missing last
      [...c.rows].sort((p: any, q: any) => (q.agn_fpr - q.agn_fnr) - (p.agn_fpr - p.agn_fnr)).map((r: any) => `- ${r.label}: FPR ${pct(r.spec_fpr)} → ${pct(r.agn_fpr)}; FNR ${pct(r.spec_fnr)} → ${pct(r.agn_fnr)}`).join('\n') +
      `\n\n${c.caption}`;
  if (c.kind === 'prevalence') {
    const prec = (j: any, pi: number) => (j.tpr * pi) / (j.tpr * pi + j.fpr * (1 - pi));
    const h = c.highlight;
    const counts = c.counts
      ? `\n\n${c.counts.title}: ${c.counts.real} ${c.counts.real_label.toLowerCase()}, ${c.counts.false.toLocaleString('en')} ${c.counts.false_label.toLowerCase()}.`
      : '';
    return `${c.title}. ${h.label} (true positive rate ${pct(h.tpr)}, false positive rate ${pct(h.fpr)}) has precision ` +
      `${prec(h, 0.5).toFixed(2)} at 50% prevalence, ${prec(h, 0.1).toFixed(2)} at 10% and ${prec(h, 0.01).toFixed(2)} at 1%.` +
      counts + `\n\n${c.caption}`;
  }
  return '';
};

export function GET() {
  const anth = paper.anthology || {};
  const md = `# ${paper.title}

> ${paper.tldr}

- Authors: ${authors.map((a) => `${a.name} (${a.affiliation})`).join('; ')}
- Venue: ${paper.venue.formal} (${venueLine}), ${paper.venue.location}${anth.first_page ? `, pages ${anth.first_page}–${anth.last_page}` : ''}
- DOI: https://doi.org/${doi}
- Project page: ${SITE}/

## Links

- [Project page](${SITE}/)
- [Paper (ACL Anthology)](${anth.url || arxivUrl})
- [Paper (PDF)](${paper.links.pdf})
- [arXiv preprint](${arxivUrl})
- [Code and testbed (GitHub)](${paper.links.code})
- [Testbed data](${paper.links.dataset})
- [Poster (PDF)](${paper.links.poster})
${authors.flatMap((a) => a.links.map((l: any) => `- [${a.name}: ${l.label}](${l.url})`)).join('\n')}

## Abstract

${paper.abstract.trim()}

## ${paper.plain_language.heading}

${paras(paper.plain_language.paragraphs)}

## ${paper.categories.heading}

${paper.categories.intro}

${paper.categories.items.map((c: any) => `### ${c.id} ${c.name}\n\n${c.text}\n\nGrounded in: ${c.grounding}`).join('\n\n')}

## ${paper.case_study.heading}

${paras(paper.case_study.paragraphs)}

${paper.case_study.examples.map((e: any) => `### ${e.category} (${e.model})\n\nUser: ${e.prompt}\n\nModel: ${e.response}\n\n${e.note}`).join('\n\n')}

## ${paper.method.heading}

${paras(paper.method.paragraphs)}

${paper.method.diagram.caption}

## ${paper.story.heading}

${paper.story.intro}

${paper.story.steps.map((s: any, i: number) => [`### ${i + 1}. ${s.question}`, paras(s.paragraphs), chartText(s.chart)].filter(Boolean).join('\n\n')).join('\n\n')}

## ${paper.findings.heading}

${paper.findings.items.map((f: any, i: number) => `${i + 1}. ${f.lead} ${f.text}`).join('\n')}

## ${paper.implications.heading}

${paper.implications.subsections.map((s: any) => `### ${s.heading}\n\n${paras(s.paragraphs)}`).join('\n\n')}

## Citation

${apaCitation}

\`\`\`bibtex
${bibtex}
\`\`\`

## Acknowledgements

${paper.acknowledgements}

## Other languages

Short summaries of this page${translations.some((t) => !published(t)) ? ' (automatic translations, not yet reviewed)' : ''}:

${translations.map((t) => `- [${t.label}](${SITE}/${t.lang}/)`).join('\n')}
`;
  return new Response(md.replace(/\n{3,}/g, '\n\n'), { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
}
