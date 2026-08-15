import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://hardmagic.com',
  base: process.env.CI ? '/hardmagic' : '/',
  output: 'static',
  trailingSlash: 'always',
  compressHTML: 'jsx',
  image: {
    responsiveStyles: true,
  },
  integrations: [sitemap({ filter: (page) => !page.includes('/thanks/') })],
});
