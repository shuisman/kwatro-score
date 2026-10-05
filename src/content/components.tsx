// Components available inside content/<lang>/*.mdx (passed in via the `components` prop).
import { Check, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppTools } from '../components/AppTools';
import { KwatroCard, type CardColor, type CardShape } from '../components/KwatroCard';

/** A card: [colour, shape, number] or 'wild'. */
export type C = [CardColor, CardShape, 1 | 2 | 3 | 4] | 'wild';

/** A row of cards with an optional ✓/✗ verdict and a caption. */
export function CardRow({ cards, ok, children, size = 52 }: { cards: C[]; ok?: boolean; children?: ReactNode; size?: number }) {
  return (
    <figure className="my-4 rounded-2xl border border-border bg-surface p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {cards.map((c, i) =>
          c === 'wild' ? (
            <KwatroCard key={i} wild size={size} label="joker" />
          ) : (
            <KwatroCard key={i} color={c[0]} shape={c[1]} number={c[2]} size={size} label={`${c[0]} ${c[1]} ${c[2]}`} />
          ),
        )}
        {ok !== undefined && (
          <span
            className={`ml-2 inline-flex size-8 items-center justify-center rounded-full ${ok ? 'bg-[#30a46c]' : 'bg-danger'} text-white`}
            aria-label={ok ? 'OK' : 'Not allowed'}
          >
            {ok ? <Check size={18} /> : <X size={18} />}
          </span>
        )}
      </div>
      {children && <figcaption className="mt-2 text-sm text-muted [&>p]:m-0">{children}</figcaption>}
    </figure>
  );
}

/** A worked calculation. Write one step per line. */
export function Calc({ children }: { children: ReactNode }) {
  return <div className="tnum my-3 rounded-xl bg-surface-2 px-4 py-3 font-mono text-sm [&>p]:m-0">{children}</div>;
}

/** Table of contents. `items` are [heading id, label]; ids come from the heading text (rehype-slug). */
export function Toc({ items, label }: { items: [string, string][]; label: string }) {
  return (
    <nav className="my-6 rounded-2xl border border-border bg-surface p-4 text-sm" aria-label={label}>
      <ol className="m-0! grid gap-x-10 gap-y-1 pl-6 sm:grid-cols-2">
        {items.map(([id, text]) => (
          <li key={id} className="m-0!">
            <a href={`#${id}`}>{text}</a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Collapsible question/answer. */
export function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group border-b border-border py-3">
      <summary className="cursor-pointer list-none font-semibold">
        <span className="mr-2 inline-block text-primary transition group-open:rotate-90">›</span>
        {q}
      </summary>
      <div className="mt-2 pl-5 text-muted [&>p:last-child]:mb-0">{children}</div>
    </details>
  );
}

export const mdxComponents = { CardRow, Calc, Toc, Faq, AppTools };
