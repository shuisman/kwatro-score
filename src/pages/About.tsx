import { ContentPage } from '../content/ContentPage';
import { useLang } from '../router';

export function About() {
  const lang = useLang();
  return (
    <article className="prose-k mx-auto max-w-2xl">
      <ContentPage key={lang} page="about" lang={lang} />
    </article>
  );
}
