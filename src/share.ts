import { SITE_URL } from './config';
import { highlights, playerColor, ranking } from './engine/kwatro';
import type { Game, Turn } from './engine/types';
import { fmt, formatDate, formatDuration, dicts } from './i18n';
import type { Lang } from './router';

export const SHARE_URL = `${SITE_URL}?ref=share`;
const DISPLAY_URL = SITE_URL.replace(/^https?:\/\//, '').replace(/\/$/, '');

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

/** Draws a 1080×1080 result card: podium, highlights, date and the link back to the app. */
export async function renderShareImage(game: Game, turns: Turn[], lang: Lang): Promise<Blob> {
  const t = dicts[lang];
  const S = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const font = (weight: number, size: number) => `${weight} ${size}px system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`;

  // Background
  ctx.fillStyle = '#16130f';
  ctx.fillRect(0, 0, S, S);
  const tiles: [string, number, number][] = [
    ['#e5484d', 80, 80],
    ['#3e8ed0', 136, 80],
    ['#30a46c', 80, 136],
    ['#f5b400', 136, 136],
  ];
  for (const [c, x, y] of tiles) {
    ctx.fillStyle = c;
    roundRect(ctx, x, y, 48, 48, 10);
    ctx.fill();
  }
  ctx.fillStyle = '#f3eee6';
  ctx.font = font(800, 54);
  ctx.textBaseline = 'middle';
  ctx.fillText('Kwatro Score', 214, 132);
  ctx.fillStyle = '#a89f93';
  ctx.font = font(500, 32);
  ctx.textAlign = 'right';
  ctx.fillText(formatDate(game.endedAt ?? game.createdAt, lang), S - 80, 132);
  ctx.textAlign = 'left';

  // Podium: 2nd – 1st – 3rd
  const ranked = ranking(game.players, turns);
  const top = ranked.slice(0, 3);
  const slots = [
    { entry: top[1], x: 120, h: 210 },
    { entry: top[0], x: 400, h: 290 },
    { entry: top[2], x: 680, h: 160 },
  ];
  const baseY = 700;
  const w = 280;
  for (const { entry, x, h } of slots) {
    if (!entry) continue;
    const color = playerColor(entry.player);
    ctx.fillStyle = color;
    roundRect(ctx, x + 10, baseY - h, w - 20, h, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.font = font(900, 120);
    ctx.textAlign = 'center';
    ctx.fillText(String(entry.place), x + w / 2, baseY - h / 2 + 8);
    ctx.fillStyle = '#f3eee6';
    ctx.font = font(800, 40);
    ctx.fillText(fitText(ctx, entry.player.name, w - 20), x + w / 2, baseY - h - 92);
    ctx.fillStyle = '#a89f93';
    ctx.font = font(700, 38);
    ctx.fillText(`${entry.total}`, x + w / 2, baseY - h - 40);
    if (entry.place === 1) {
      ctx.font = font(400, 64);
      ctx.fillText('🏆', x + w / 2, baseY - h - 160);
    }
  }
  ctx.textAlign = 'left';

  // Highlights
  const h = highlights(game, turns);
  const items: [string, string][] = [];
  if (h.highestTurn) items.push([t.summary.highestTurn, fmt(t.summary.highestTurnValue, { name: h.highestTurn.player.name, points: h.highestTurn.points })]);
  items.push([t.summary.duration, formatDuration(h.durationMs, t)]);
  items.push([t.summary.rounds, String(h.rounds)]);
  let y = 790;
  for (const [label, val] of items) {
    ctx.fillStyle = '#a89f93';
    ctx.font = font(500, 32);
    ctx.fillText(label, 80, y);
    ctx.fillStyle = '#f3eee6';
    ctx.font = font(700, 32);
    ctx.textAlign = 'right';
    ctx.fillText(fitText(ctx, val, 560), S - 80, y);
    ctx.textAlign = 'left';
    y += 56;
  }

  // Footer with the referral link
  ctx.fillStyle = '#2c2721';
  ctx.fillRect(0, S - 90, S, 90);
  ctx.fillStyle = '#9dbbe6';
  ctx.font = font(700, 34);
  ctx.textAlign = 'center';
  ctx.fillText(DISPLAY_URL, S / 2, S - 45);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'),
  );
}

export function shareText(game: Game, turns: Turn[], lang: Lang): string {
  const t = dicts[lang];
  const ranked = ranking(game.players, turns);
  const winners = ranked.filter((e) => e.place === 1);
  const pts = ranked[0]?.total ?? 0;
  return winners.length > 1
    ? fmt(t.summary.shareTextShared, { points: pts })
    : fmt(t.summary.shareText, { winner: winners[0]?.player.name ?? '', points: pts });
}

/** Shares image + text + link via the share sheet; falls back to downloading the image. */
export async function shareResult(game: Game, turns: Turn[], lang: Lang): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await renderShareImage(game, turns, lang);
  const file = new File([blob], 'kwatro-score.png', { type: 'image/png' });
  const text = shareText(game, turns, lang);
  const data: ShareData = { files: [file], text: `${text} ${SHARE_URL}`, title: 'Kwatro Score' };
  if (navigator.canShare?.(data)) {
    try {
      await navigator.share(data);
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'kwatro-score.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  try {
    await navigator.clipboard?.writeText(`${text} ${SHARE_URL}`);
  } catch {
    // Clipboard not available: the image alone still carries the link.
  }
  return 'downloaded';
}
