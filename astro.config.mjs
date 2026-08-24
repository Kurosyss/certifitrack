// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';

import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://certifitrack.com',
  integrations: [
    react(), 
    sitemap({
      i18n: {
        defaultLocale: 'en',
        locales: {
          en: 'en',
          es: 'es'
        }
      }
    })
  ],
  redirects: {
    '/': '/en/',
    '/how-it-works': '/en/how-it-works',
    '/what-we-do': '/en/what-we-do',
    '/faq': '/en/faq',
    '/contact': '/en/contact',
    '/about': '/en/about',
    '/templates/coi-tracking-spreadsheet': '/en/templates/coi-tracking-spreadsheet',
    '/privacy': '/en/privacy',
    '/terms': '/en/terms',
    '/upload': '/en/upload'
  },
  vite: {
    plugins: [tailwindcss()],
    server: {
      proxy: {
        '/v1': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        }
      }
    },
    preview: {
      proxy: {
        '/v1': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
        }
      }
    }
  }
});