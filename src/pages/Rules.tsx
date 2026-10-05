import { Play } from 'lucide-react';
import { buttonClass } from '../components/ui';
import { ContentPage } from '../content/ContentPage';
import { useT } from '../i18n';
import { Link, useLang } from '../router';

export function Rules() {
  const lang = useLang();
  const t = useT();
  return (
    <article className="prose-k mx-auto max-w-2xl">
      <ContentPage key={lang} page="rules" lang={lang} />
      <div className="mt-10">
        <Link to={{ key: 'new', lang }} className={buttonClass('primary', 'w-full py-4 text-lg sm:w-auto')}>
          <Play size={20} />
          {t.home.start}
        </Link>
      </div>
    </article>
  );
}
