import { useEffect } from 'react';
import { trackPage } from './analytics';
import { Layout } from './components/Layout';
import { useMounted } from './components/ui';
import { dicts, preferredLang } from './i18n';
import { About } from './pages/About';
import { GameScreen } from './pages/GameScreen';
import { Home } from './pages/Home';
import { NewGame } from './pages/NewGame';
import { NotFound } from './pages/NotFound';
import { PlayList } from './pages/PlayList';
import { Rules } from './pages/Rules';
import { Summary } from './pages/Summary';
import { href, useRouter, type Route } from './router';

export function metaFor(route: Route) {
  if (route.key === 'root') return dicts.nl.meta.home;
  const m = dicts[route.lang].meta;
  return m[route.key];
}

function Loading() {
  return <div className="py-16 text-center text-muted" aria-busy="true" />;
}

function Page({ route }: { route: Route }) {
  // Play screens read IndexedDB, which only exists in the browser. They render a placeholder
  // on the server and on the first (hydrating) client render, then the real content.
  const mounted = useMounted();
  switch (route.key) {
    case 'root':
      return <Loading />;
    case 'home':
      return <Home />;
    case 'rules':
      return <Rules />;
    case 'about':
      return <About />;
    case 'notfound':
      return <NotFound />;
    case 'play':
      return mounted ? <PlayList /> : <Loading />;
    case 'new':
      return mounted ? <NewGame /> : <Loading />;
    case 'game':
      return mounted ? <GameScreen id={route.id} /> : <Loading />;
    case 'summary':
      return mounted ? <Summary id={route.id} /> : <Loading />;
  }
}

export function App() {
  const { route, navigate } = useRouter();

  useEffect(() => {
    if (route.key === 'root') {
      navigate(href({ key: 'home', lang: preferredLang() }), { replace: true });
      return;
    }
    document.title = metaFor(route).title;
    document.documentElement.lang = route.lang;
    trackPage(window.location.pathname);
  }, [route, navigate]);

  return (
    <Layout immersive={route.key === 'game'}>
      <Page route={route} />
    </Layout>
  );
}
