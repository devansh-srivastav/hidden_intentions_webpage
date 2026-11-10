// Loads content/*.yaml and derives everything that depends on it, so that filling the
// `anthology:` block in content/paper.yaml switches the whole site over in one rebuild.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const root = process.cwd();
const load = (p: string) => YAML.parse(fs.readFileSync(path.join(root, p), 'utf8'));

export const paper = load('content/paper.yaml');
export const authors: any[] = load('content/authors.yaml');

const i18nDir = path.join(root, 'content/i18n');
// Order of the summary pages in the language switcher; files not listed here come last.
const ORDER_LANGS = ['de', 'zh', 'hi', 'ko', 'fr', 'es', 'ru', 'ar', 'tr', 'ja'];
const langRank = (l: string) => (ORDER_LANGS.includes(l) ? ORDER_LANGS.indexOf(l) : ORDER_LANGS.length);
export const translations: any[] = fs
  .readdirSync(i18nDir)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => load(`content/i18n/${f}`))
  .sort((a, b) => langRank(a.lang) - langRank(b.lang));

// Draft translations are built (so they can be reviewed at /de/, /zh/, ...) but stay out of
// hreflang, the sitemap and the language switcher, and carry noindex, until `draft: false`.
// INCLUDE_DRAFTS=1 treats them as published, e.g. to test hreflang before review is done.
const includeDrafts = process.env.INCLUDE_DRAFTS === '1';
export const published = (t: any) => includeDrafts || !t.draft;

export const SITE = paper.site.url.replace(/\/$/, '');
export const abs = (p: string) => (p.startsWith('http') ? p : `${SITE}${p.startsWith('/') ? '' : '/'}${p}`);

// ---- Anthology switch-over -------------------------------------------------------------
const anth = paper.anthology ?? {};
export const hasAnthology = Boolean(anth.url);
export const doi: string = anth.doi || paper.arxiv.doi;
export const publicationDate: string = anth.date || paper.arxiv.v1_date; // YYYY/MM/DD
export const onlineDate: string = paper.arxiv.v1_date;
export const isoDate = (d: string) => d.replaceAll('/', '-');
export const year = publicationDate.slice(0, 4);
export const arxivUrl = `https://arxiv.org/abs/${paper.arxiv.id}`;
export const venueLine: string = paper.venue.short;

// ---- Authors ----------------------------------------------------------------------------
const ORDER = ['homepage', 'scholar', 'semantic-scholar', 'orcid', 'github', 'linkedin', 'x', 'bluesky'];
const rank = (type: string) => (ORDER.includes(type) ? ORDER.indexOf(type) : ORDER.length);
export const authorLinks = (a: any) =>
  [...(a.links ?? [])].filter((l) => l.url).sort((x, y) => rank(x.type) - rank(y.type));
export const authorUrl = (a: any) =>
  a.homepage || authorLinks(a).find((l) => l.type === 'scholar')?.url || authorLinks(a)[0]?.url || '';

// ---- Citations --------------------------------------------------------------------------
const bibName = (a: any) => `${a.family.replace('ö', '{\\"o}')}, ${a.given}`;
const generatedBibtex = [
  `@inproceedings{srivastav${year}unknown,`,
  `  title     = {Unknown Unknowns: Do Hidden Intentions in {LLM}s Evade Detection?},`,
  `  author    = {${authors.map(bibName).join(' and ')}},`,
  `  booktitle = {${paper.venue.formal.replace('EMNLP', '{EMNLP}')}},`,
  `  publisher = {${paper.venue.publisher}},`,
  `  year      = {${year}},`,
  `  doi       = {${doi}},`,
  `  url       = {${hasAnthology ? anth.url : arxivUrl}}`,
  `}`,
].join('\n');
export const bibtex: string = (anth.bibtex || generatedBibtex).trim();

const apaName = (a: any) => `${a.family}, ${a.given[0]}.`;
const apaAuthors = (() => {
  const n = authors.map(apaName);
  return n.length > 1 ? `${n.slice(0, -1).join(', ')}, & ${n[n.length - 1]}` : n[0];
})();
const pages = anth.first_page && anth.last_page ? ` (pp. ${anth.first_page}–${anth.last_page})` : '';
export const apaCitation = `${apaAuthors} (${year}). ${paper.title} In ${paper.venue.formal}${pages}. ${paper.venue.publisher}. https://doi.org/${doi}`;

// ---- Paper links (hero) -----------------------------------------------------------------
export const paperLinks = [
  { label: 'Paper', href: hasAnthology ? anth.url : arxivUrl },
  { label: 'GitHub', href: paper.links.code },
  { label: 'Poster', href: paper.links.poster },
].filter(Boolean) as { label: string; href: string }[];

// ---- Google Scholar / Highwire tags (empty values are dropped) ----------------------------
export const scholarTags = (pageUrl: string): [string, string][] => {
  const t: [string, string | undefined][] = [['citation_title', paper.title]];
  for (const a of authors) {
    t.push(['citation_author', `${a.family}, ${a.given}`]);
    t.push(['citation_author_institution', a.affiliation]);
  }
  t.push(
    ['citation_publication_date', publicationDate],
    ['citation_online_date', onlineDate],
    ['citation_conference_title', paper.venue.formal],
    ['citation_publisher', paper.venue.publisher],
    ['citation_pdf_url', abs(paper.links.pdf)],
    ['citation_arxiv_id', paper.arxiv.id],
    ['citation_doi', doi],
    ['citation_firstpage', anth.first_page],
    ['citation_lastpage', anth.last_page],
    ['citation_abstract_html_url', pageUrl],
    ['citation_keywords', paper.seo.keywords],
  );
  return t.filter((x): x is [string, string] => Boolean(x[1] && String(x[1]).trim()));
};

// ---- Languages ----------------------------------------------------------------------------
export const languages = [
  { lang: 'en', hreflang: 'en', label: 'English', path: '/' },
  ...translations.filter(published).map((t) => ({ lang: t.lang, hreflang: t.hreflang || t.lang, label: t.label, dir: t.dir || 'ltr', path: `/${t.lang}/` })),
];
// The language menu lists every built summary, drafts included (drafts stay out of hreflang and the sitemap).
export const menuLanguages = [
  languages[0],
  ...translations.map((t) => ({ lang: t.lang, hreflang: t.hreflang || t.lang, label: t.label, dir: t.dir || 'ltr', path: `/${t.lang}/` })),
];
