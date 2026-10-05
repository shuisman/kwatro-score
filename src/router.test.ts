import { describe, expect, it } from 'vitest';
import { BASE, href, parseRoute, staticRoutes, switchLang, type Route } from './router';

describe('router', () => {
  it('round-trips every route shape', () => {
    const routes: Route[] = [
      ...staticRoutes(),
      { key: 'game', lang: 'nl', id: 'abc-123' },
      { key: 'summary', lang: 'en', id: 'abc-123' },
    ];
    for (const r of routes) expect(parseRoute(href(r))).toEqual(r);
  });

  it('uses Dutch slugs for Dutch routes', () => {
    expect(href({ key: 'summary', lang: 'nl', id: 'x' })).toBe(`${BASE}nl/spelen/spel/x/uitslag/`);
    expect(href({ key: 'about', lang: 'en' })).toBe(`${BASE}en/about/`);
  });

  it('accepts missing trailing slash and index.html', () => {
    expect(parseRoute(`${BASE}nl/over`)).toEqual({ key: 'about', lang: 'nl' });
    expect(parseRoute(`${BASE}en/index.html`)).toEqual({ key: 'home', lang: 'en' });
    expect(parseRoute(BASE)).toEqual({ key: 'root' });
  });

  it('flags unknown paths', () => {
    expect(parseRoute(`${BASE}nl/bestaat-niet/`).key).toBe('notfound');
    expect(parseRoute(`${BASE}de/`).key).toBe('notfound');
  });

  it('switches language on the same page', () => {
    expect(href(switchLang({ key: 'rules', lang: 'nl' }, 'en'))).toBe(`${BASE}en/kwatro/`);
  });
});
