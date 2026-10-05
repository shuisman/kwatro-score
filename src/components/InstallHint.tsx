import { Download, Share } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '../i18n';
import { isIOS, isStandalone, promptInstall, usePwa } from '../pwa';
import { Button, Card } from './ui';

/** Install instructions: a real button where the browser supports it, steps for iOS, generic text otherwise. */
export function InstallHint({ onDismiss }: { onDismiss?: () => void }) {
  const t = useT();
  const { installEvent, installed } = usePwa();
  const [env, setEnv] = useState<{ standalone: boolean; ios: boolean } | null>(null);
  useEffect(() => setEnv({ standalone: isStandalone(), ios: isIOS() }), []);

  if (!env) return null;
  if (env.standalone || installed) {
    return <Card className="text-sm">{t.install.installed}</Card>;
  }
  return (
    <Card>
      <h3 className="mb-1 flex items-center gap-2 font-bold">
        <Download size={18} />
        {t.install.title}
      </h3>
      <p className="mb-3 text-sm text-muted">{t.install.text}</p>
      {installEvent ? (
        <Button variant="primary" onClick={() => promptInstall()}>
          {t.install.button}
        </Button>
      ) : (
        <p className="flex items-start gap-2 text-sm">
          {env.ios && <Share size={16} className="mt-0.5 shrink-0" />}
          {env.ios ? t.install.ios : t.install.other}
        </p>
      )}
      {onDismiss && (
        <Button variant="ghost" className="mt-2 -ml-2 text-sm" onClick={onDismiss}>
          {t.install.dismiss}
        </Button>
      )}
    </Card>
  );
}
