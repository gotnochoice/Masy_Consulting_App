"use client";

import { useState } from "react";

type Row = { label: string; avg: string | null; count: number; enough: boolean };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 28;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const MARK_COLOR = "#7A4FA9";

function yFor(score: number) {
  const clamped = Math.min(5, Math.max(1, score));
  return PAD_TOP + PLOT_H - ((clamped - 1) / 4) * PLOT_H;
}

export function PulseTrendChart({ rows }: { rows: Row[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const step = rows.length > 1 ? PLOT_W / (rows.length - 1) : 0;
  const xFor = (i: number) => PAD_LEFT + step * i;

  const linePoints = rows
    .map((r, i) => (r.avg ? { i, x: xFor(i), y: yFor(parseFloat(r.avg)) } : null))
    .filter((p): p is { i: number; x: number; y: number } => p !== null);

  const segments: { i: number; x: number; y: number }[][] = [];
  let current: { i: number; x: number; y: number }[] = [];
  for (const p of linePoints) {
    if (current.length > 0 && p.i !== current[current.length - 1].i + 1) {
      segments.push(current);
      current = [];
    }
    current.push(p);
  }
  if (current.length > 0) segments.push(current);

  const gridScores = [1, 2, 3, 4, 5];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Team pulse average score by month">
        {gridScores.map((score) => (
          <line
            key={score}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yFor(score)}
            y2={yFor(score)}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}
        {gridScores.map((score) => (
          <text key={score} x={PAD_LEFT - 8} y={yFor(score) + 3} textAnchor="end" className="fill-slate-light text-[9px]">
            {score}
          </text>
        ))}

        {segments.map((seg, si) => (
          <path
            key={si}
            d={seg.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ")}
            fill="none"
            stroke={MARK_COLOR}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}

        {rows.map((r, i) => {
          const x = xFor(i);
          if (r.avg) {
            const y = yFor(parseFloat(r.avg));
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r={hover === i ? 6 : 4.5}
                fill={MARK_COLOR}
                stroke="var(--paper)"
                strokeWidth={2}
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                style={{ cursor: "pointer" }}
              />
            );
          }
          const y = PAD_TOP + PLOT_H + 12;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={hover === i ? 5 : 3.5}
              fill="var(--paper)"
              stroke="var(--slate-light)"
              strokeWidth={1.5}
              tabIndex={0}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(i)}
              onBlur={() => setHover(null)}
              style={{ cursor: "pointer" }}
            />
          );
        })}

        {rows.map((r, i) => (
          <text
            key={i}
            x={xFor(i)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-slate-light text-[9px] uppercase"
          >
            {r.label.split(" ")[0]}
          </text>
        ))}
      </svg>

      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-btn border border-border bg-paper px-3 py-2 text-xs shadow-sm"
          style={{
            left: `${(xFor(hover) / WIDTH) * 100}%`,
            top: `${((rows[hover].avg ? yFor(parseFloat(rows[hover].avg!)) : PAD_TOP + PLOT_H + 12) / HEIGHT) * 100}%`,
            marginTop: -10,
          }}
        >
          <p className="font-medium text-ink">{rows[hover].label}</p>
          <p className="text-slate">
            {rows[hover].avg
              ? `${rows[hover].avg} / 5`
              : rows[hover].count > 0
                ? "Not enough responses yet"
                : "No check-ins"}
          </p>
        </div>
      )}
    </div>
  );
}
