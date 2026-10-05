import { StrictMode } from 'react';
import { prerender } from 'react-dom/static';
import { App, metaFor } from './App';
import { RouterProvider, href, parseRoute, staticRoutes, switchLang, type Route } from './router';

export { href, staticRoutes, switchLang, parseRoute, metaFor };
export type { Route };

/** Renders a route to HTML, waiting for lazy content (MDX pages) to load. */
export async function render(path: string): Promise<string> {
  const { prelude } = await prerender(
    <StrictMode>
      <RouterProvider initialPath={path}>
        <App />
      </RouterProvider>
    </StrictMode>,
  );
  return new Response(prelude).text();
}
