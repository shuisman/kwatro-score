import { Download, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { exportData, importData } from '../db/db';
import { fmt, storeLang, useT } from '../i18n';
import { href, switchLang, useLang, useRouter } from '../router';
import { useTheme, type ThemePref } from '../theme';
import { InstallHint } from './InstallHint';
import { Button, Card, useMounted } from './ui';

function DataSection() {
  const t = useT();
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');

  async function doExport() {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kwatro-score-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function doImport(file: File) {
    try {
      const n = await importData(JSON.parse(await file.text()));
      setMsg(fmt(t.data.imported, { n }));
    } catch {
      setMsg(t.data.importError);
    }
  }

  return (
    <Card>
      <h3 className="mt-0! mb-1 font-bold">{t.data.title}</h3>
      <p className="mb-3! text-sm text-muted">{t.data.text}</p>
      <div className="flex flex-wrap gap-2">
        <Button onClick={doExport}>
          <Download size={18} />
          {t.data.export}
        </Button>
        <Button onClick={() => fileRef.current?.click()}>
          <Upload size={18} />
          {t.data.import}
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void doImport(f);
            e.target.value = '';
          }}
        />
      </div>
      {msg && (
        <p role="status" className="mt-2 mb-0! text-sm">
          {msg}
        </p>
      )}
    </Card>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-semibold">{label}</div>
      <div className="inline-flex rounded-xl border border-border p-1" role="radiogroup" aria-label={label}>
        {options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={value === v}
            onClick={() => onChange(v)}
            className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${value === v ? 'bg-primary text-primary-fg' : 'text-muted'}`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function SettingsSection() {
  const t = useT();
  const lang = useLang();
  const { route, navigate } = useRouter();
  const { pref, setPref } = useTheme();
  const themes: ThemePref[] = ['system', 'light', 'dark'];
  return (
    <Card className="grid gap-4">
      <Segmented label={t.theme.label} value={pref} options={themes.map((o) => [o, t.theme[o]])} onChange={setPref} />
      <Segmented
        label={t.language}
        value={lang}
        options={[
          ['nl', 'Nederlands'],
          ['en', 'English'],
        ]}
        onChange={(l) => {
          storeLang(l);
          navigate(href(switchLang(route, l)), { replace: true });
        }}
      />
    </Card>
  );
}

/** Settings, install and backup tools. Browser-only, so they appear after hydration. */
export function AppTools() {
  const mounted = useMounted();
  if (!mounted) return null;
  return (
    <div className="not-prose grid gap-3">
      <SettingsSection />
      <InstallHint />
      <DataSection />
    </div>
  );
}
