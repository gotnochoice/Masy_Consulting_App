"use client";

import { useState } from "react";

type Row = { label: string; hours: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 28;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const PLOT_W = WIDTH - PAD_LEFT - PAD_RIGHT;
const PLOT_H = HEIGHT - PAD_TOP - PAD_BOTTOM;
const MARK_COLOR = "#2F32D5";

export function AttendanceTrendChart({ rows }: { rows: Row[] }) {
  const [hover, setHover] = useState<number | null>(null);

  const maxHours = Math.max(...rows.map((r) => r.hours), 0);
  const yMax = Math.max(Math.ceil(maxHours / 10) * 10, 10);
  const yFor = (hours: number) => PAD_TOP + PLOT_H - (hours / yMax) * PLOT_H;

  const step = rows.length > 1 ? PLOT_W / (rows.length - 1) : 0;
  const xFor = (i: number) => PAD_LEFT + step * i;

  const linePath = rows.map((r, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(r.hours)}`).join(" ");

  const gridSteps = 4;
  const gridValues = Array.from({ length: gridSteps + 1 }, (_, i) => (yMax / gridSteps) * i);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Total hours logged by month">
        {gridValues.map((v) => (
          <line
            key={v}
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yFor(v)}
            y2={yFor(v)}
            stroke="var(--border)"
            strokeWidth={1}
          />
        ))}
        {gridValues.map((v) => (
          <text key={v} x={PAD_LEFT - 8} y={yFor(v) + 3} textAnchor="end" className="fill-slate-light text-[9px] font-mono">
            {Math.round(v)}
          </text>
        ))}

        <path d={linePath} fill="none" stroke={MARK_COLOR} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {rows.map((r, i) => (
          <circle
            key={i}
            cx={xFor(i)}
            cy={yFor(r.hours)}
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
        ))}

        {rows.map((r, i) => (
          <text
            key={i}
            x={xFor(i)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-slate-light text-[9px] font-mono uppercase"
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
            top: `${(yFor(rows[hover].hours) / HEIGHT) * 100}%`,
            marginTop: -10,
          }}
        >
          <p className="font-medium text-ink">
            {rows[hover].label}: {rows[hover].hours}h logged
          </p>
        </div>
      )}
    </div>
  );
}
