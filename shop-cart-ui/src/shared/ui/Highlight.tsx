import React from 'react';

const fold = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function ranges(text: string, query: string): Array<[number, number]> {
  const tokens = fold(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const chars = Array.from(text);
  let folded = '';
  const map: number[] = [];
  chars.forEach((c, i) => {
    const f = fold(c);
    for (let k = 0; k < f.length; k++) map.push(i);
    folded += f;
  });
  const found: Array<[number, number]> = [];
  for (const t of tokens) {
    let at = folded.indexOf(t);
    while (at !== -1) {
      found.push([map[at], map[at + t.length - 1] + 1]);
      at = folded.indexOf(t, at + t.length);
    }
  }
  found.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const r of found) {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  }
  return merged;
}

export const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const parts = ranges(text, query);
  if (parts.length === 0) return <>{text}</>;
  const chars = Array.from(text);
  const out: React.ReactNode[] = [];
  let pos = 0;
  parts.forEach(([a, b], i) => {
    if (a > pos) out.push(chars.slice(pos, a).join(''));
    out.push(<mark key={i} className="bg-transparent font-extrabold text-brand">{chars.slice(a, b).join('')}</mark>);
    pos = b;
  });
  if (pos < chars.length) out.push(chars.slice(pos).join(''));
  return <>{out}</>;
};
