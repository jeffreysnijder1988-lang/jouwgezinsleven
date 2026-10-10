// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';

const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

export default defineConfig({
  // Canonieke domeinnaam. Voor een testomgeving overschrijven via PUBLIC_SITE_URL.
  site: env.PUBLIC_SITE_URL || 'https://jouwgezinsleven.nl',
  output: 'static',
  outDir: env.OUT_DIR || './dist',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  prefetch: false,
});
