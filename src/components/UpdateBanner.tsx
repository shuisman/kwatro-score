import { RefreshCw } from 'lucide-react';
import { useT } from '../i18n';
import { applyUpdate, usePwa } from '../pwa';

export function UpdateBanner() {
  const { updateReady } = usePwa();
  const t = useT();
  if (!updateReady) return null;
  return (
    <div role="status" className="border-b border-border bg-primary-soft">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2 text-sm">
        <span>{t.update.text}</span>
        <button
          type="button"
          onClick={applyUpdate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 font-semibold text-primary-fg"
        >
          <RefreshCw size={14} />
          {t.update.reload}
        </button>
      </div>
    </div>
  );
}
