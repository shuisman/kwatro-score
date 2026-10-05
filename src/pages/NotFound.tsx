import { buttonClass } from '../components/ui';
import { useT } from '../i18n';
import { Link, useLang } from '../router';

export function NotFound() {
  const t = useT();
  const lang = useLang();
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="mb-2 text-3xl font-extrabold">{t.notfound.title}</h1>
      <p className="mb-6 text-muted">{t.notfound.text}</p>
      <Link to={{ key: 'home', lang }} className={buttonClass('primary')}>
        {t.notfound.home}
      </Link>
    </div>
  );
}
