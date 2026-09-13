// src/components/charts/DonutChart.tsx
"use client";

import React from 'react';

export interface DonutSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  centerLabel?: string;
  centerValue: number | string;
  ariaLabel?: string;
  onSliceClick?: (slice: DonutSlice) => void;
  size?: number;
  /** Baris kecil opsional per slice di legend, mis. rincian status. */
  renderSliceExtra?: (slice: DonutSlice) => React.ReactNode;
}

export default function DonutChart({
  slices,
  centerLabel,
  centerValue,
  ariaLabel,
  onSliceClick,
  size = 200,
  renderSliceExtra,
}: DonutChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = 40;
  const strokeWidth = 16;
  const circumference = 2 * Math.PI * radius;

  let cumulativeLength = 0;
  const arcs = slices.map((s) => {
    const fraction = total > 0 ? s.value / total : 0;
    const length = fraction * circumference;
    const dashoffset = -cumulativeLength;
    cumulativeLength += length;
    return { ...s, fraction, dasharray: `${length} ${circumference - length}`, dashoffset };
  });

  const summary =
    ariaLabel ??
    `Distribusi: ${slices
      .map((s) => `${s.label} ${total > 0 ? Math.round((s.value / total) * 100) : 0}%`)
      .join(', ')}`;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90" role="img" aria-label={summary}>
          {total === 0 ? (
            <circle cx="50" cy="50" r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
          ) : (
            arcs.map((a) => (
              <circle
                key={a.key}
                cx="50"
                cy="50"
                r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth={strokeWidth}
                strokeDasharray={a.dasharray}
                strokeDashoffset={a.dashoffset}
                style={onSliceClick ? { cursor: 'pointer' } : undefined}
                onClick={onSliceClick ? () => onSliceClick(a) : undefined}
              />
            ))
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
          <span className="text-2xl font-black text-slate-800 leading-none tabular-nums">{centerValue}</span>
          {centerLabel && <span className="text-[10px] font-bold text-slate-500 mt-1">{centerLabel}</span>}
        </div>
      </div>

      <ul className="flex-1 w-full space-y-1.5">
        {slices.map((s) => {
          const pct = total > 0 ? Math.round((s.value / total) * 100) : 0;
          const row = (
            <>
              <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
              <span className="flex-1 text-sm font-semibold text-slate-700 truncate">{s.label}</span>
              <span className="text-xs font-bold text-slate-500 tabular-nums shrink-0">
                {s.value} ({pct}%)
              </span>
            </>
          );
          const extra = renderSliceExtra?.(s);
          return (
            <li key={s.key}>
              {onSliceClick ? (
                <button
                  type="button"
                  onClick={() => onSliceClick(s)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors text-left"
                >
                  {row}
                </button>
              ) : (
                <div className="flex items-center gap-2 px-2 py-1.5">{row}</div>
              )}
              {extra && <div className="pl-7 pr-2 -mt-0.5">{extra}</div>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
