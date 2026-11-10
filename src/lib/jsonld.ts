// schema.org JSON-LD, generated from the same data as the visible page.
import { paper, authors, doi, publicationDate, isoDate, arxivUrl, hasAnthology, abs, SITE, authorLinks } from './data';

const org = { '@type': 'Organization', name: 'CISPA Helmholtz Center for Information Security', url: 'https://cispa.de/' };

const person = (a: any) => {
  const sameAs = authorLinks(a)
    .filter((l: any) => ['homepage', 'scholar', 'orcid', 'semantic-scholar', 'github', 'linkedin', 'x', 'bluesky'].includes(l.type))
    .map((l: any) => l.url);
  const p: any = { '@type': 'Person', name: a.name, givenName: a.given, familyName: a.family, affiliation: { ...org, name: a.affiliation } };
  if (a.alternateNames?.length) p.alternateName = a.alternateNames.length === 1 ? a.alternateNames[0] : a.alternateNames;
  if (a.homepage) p.url = a.homepage;
  if (sameAs.length) p.sameAs = sameAs;
  return p;
};

const clean = (o: any): any => {
  if (Array.isArray(o)) return o.map(clean);
  if (o && typeof o === 'object') {
    return Object.fromEntries(
      Object.entries(o)
        .filter(([, v]) => v !== '' && v !== undefined && v !== null && !(Array.isArray(v) && v.length === 0))
        .map(([k, v]) => [k, clean(v)]),
    );
  }
  return o;
};

export const articleLd = () =>
  clean({
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    '@id': `${SITE}/#article`,
    headline: paper.title,
    name: paper.title,
    alternativeHeadline: paper.title_v1,
    abstract: paper.abstract,
    description: paper.seo.description,
    datePublished: isoDate(publicationDate),
    dateModified: isoDate(paper.arxiv.v2_date),
    url: `${SITE}/`,
    mainEntityOfPage: `${SITE}/`,
    sameAs: [arxivUrl, hasAnthology ? paper.anthology.url : ''].filter(Boolean),
    identifier: [
      { '@type': 'PropertyValue', propertyID: 'DOI', value: doi, url: `https://doi.org/${doi}` },
      { '@type': 'PropertyValue', propertyID: 'arXiv', value: paper.arxiv.id, url: arxivUrl },
    ],
    author: authors.map(person),
    isPartOf: { '@type': 'Book', name: paper.venue.formal, publisher: { '@type': 'Organization', name: paper.venue.publisher } },
    publisher: { '@type': 'Organization', name: paper.venue.publisher },
    keywords: paper.seo.keywords.split(';').map((s: string) => s.trim()),
    about: [
      { '@type': 'DefinedTerm', name: 'Hidden intentions', description: 'Covert, goal-directed behaviours in LLM outputs that can manipulate users\' beliefs and actions.' },
      { '@type': 'DefinedTerm', name: 'Large language models' },
      { '@type': 'DefinedTerm', name: 'AI manipulation' },
      { '@type': 'DefinedTerm', name: 'LLM-as-a-judge' },
      { '@type': 'DefinedTerm', name: 'AI auditing' },
    ],
    image: abs('/og-image.png'),
    encoding: { '@type': 'MediaObject', contentUrl: abs(paper.links.pdf), encodingFormat: 'application/pdf' },
    license: paper.license.paper,
    isAccessibleForFree: true,
    inLanguage: 'en',
  });

export const codeLd = () =>
  clean({
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'Hidden intentions in LLMs: code and testbed',
    description: 'Lab models that induce ten categories of hidden intentions, static classifiers and LLM-judge prompts for the paper "Unknown Unknowns: Do Hidden Intentions in LLMs Evade Detection?".',
    codeRepository: paper.links.code,
    url: paper.links.code,
    programmingLanguage: 'Python',
    author: authors.map(person),
    license: paper.license.code,
    isBasedOn: { '@id': `${SITE}/#article` },
  });

// Only emitted once the testbed has a released URL and a licence (Dataset Search needs both).
export const datasetLd = () =>
  paper.links.dataset_is_release && paper.license.data
    ? clean({
        '@context': 'https://schema.org',
        '@type': 'Dataset',
        name: 'Hidden intentions testbed',
        description: '4,000 prompt–response pairs across ten categories of hidden intentions in LLM outputs, balanced between manipulative and normal responses, with ground-truth labels.',
        creator: authors.map(person),
        license: paper.license.data,
        url: paper.links.dataset,
        isBasedOn: { '@id': `${SITE}/#article` },
        distribution: [{ '@type': 'DataDownload', contentUrl: paper.links.dataset, encodingFormat: 'text/csv' }],
      })
    : null;
