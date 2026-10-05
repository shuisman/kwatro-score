import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from 'react';
import type { MDXProps } from 'mdx/types';
import type { Lang } from '../router';
import { mdxComponents } from './components';

// Long-form pages live in content/<lang>/<page>.mdx. Each file is its own chunk, loaded only when visited.
const files = import.meta.glob<{ default: ComponentType<MDXProps> }>('../../content/*/*.mdx');

export type ContentKey = 'rules' | 'about';

const FILE: Record<ContentKey, Record<Lang, string>> = {
  rules: { nl: 'nl/kwatro', en: 'en/kwatro' },
  about: { nl: 'nl/over', en: 'en/about' },
};

const cache = new Map<string, LazyExoticComponent<ComponentType<MDXProps>>>();

function load(path: string) {
  let c = cache.get(path);
  if (!c) {
    const loader = files[`../../content/${path}.mdx`];
    if (!loader) throw new Error(`Missing content file content/${path}.mdx`);
    c = lazy(loader);
    cache.set(path, c);
  }
  return c;
}

export function ContentPage({ page, lang }: { page: ContentKey; lang: Lang }) {
  const Content = load(FILE[page][lang]);
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <Content components={mdxComponents} />
    </Suspense>
  );
}
