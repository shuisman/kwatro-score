/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import rehypeSlug from 'rehype-slug';

// Served from https://shuisman.github.io/kwatro-score/ (GitHub project page).
export const BASE = '/kwatro-score/';

/** `vite preview` like GitHub Pages: directories serve index.html, unknown paths get 404.html (the SPA fallback). */
function githubPagesPreview(): Plugin {
  return {
    name: 'github-pages-preview',
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = new URL(req.url ?? '/', 'http://x');
        if (url.pathname.startsWith(BASE) && !path.extname(url.pathname)) {
          const rel = url.pathname.slice(BASE.length);
          const file = path.join('dist', rel, 'index.html');
          if (!fs.existsSync(file)) req.url = `${BASE}404.html`;
        }
        next();
      });
    },
  };
}

export default defineConfig({
  base: BASE,
  plugins: [
    // Content pages (content/<lang>/*.mdx): Markdown + our components, headings get ids for the table of contents.
    { enforce: 'pre', ...mdx({ rehypePlugins: [rehypeSlug] }) },
    react({ include: /\.(jsx|tsx|mdx)$/ }),
    tailwindcss(),
    githubPagesPreview(),
  ],
  build: {
    target: 'es2022',
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
