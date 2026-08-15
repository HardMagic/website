import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hardmagic.com',
  base: process.env.CI ? '/hardmagic' : '/',
  output: 'static',
  trailingSlash: 'always',
  compressHTML: 'jsx',
  build: {
    // GitHub Pages/Jekyll treats underscore-prefixed directories as private.
    // Keep the generated static assets directly servable on the gh-pages branch.
    assets: 'assets',
  },
  image: {
    responsiveStyles: true,
  },
  integrations: [sitemap({ filter: (page) => !page.includes('/thanks/') })],
});
