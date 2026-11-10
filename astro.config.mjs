import { defineConfig } from 'astro/config';
import fs from 'node:fs';
import YAML from 'yaml';

// The canonical origin lives in content/paper.yaml (site.url), so it is set in one place.
const { site } = YAML.parse(fs.readFileSync('./content/paper.yaml', 'utf8'));

export default defineConfig({
  site: site.url,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'always' },
  image: { responsiveStyles: false },
  compressHTML: true,
});
