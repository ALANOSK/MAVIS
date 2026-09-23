/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Minus, Plus, Users, AlertCircle } from 'lucide-react';

interface PassengerCounterProps {
  label: string;
  value: number;
  max: number;
  description: string;
  onChange: (val: number) => void;
  theme?: 'dark' | 'light';
}

export default function PassengerCounter({
  label,
  value,
  max,
  description,
  onChange,
  theme = 'dark',
}: PassengerCounterProps) {
  const isLight = theme === 'light';

  const handleDecrement = () => {
    if (value > 0) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsed = parseInt(e.target.value, 10);
    if (isNaN(parsed) || parsed < 0) {
      onChange(0);
    } else if (parsed > max) {
      onChange(max);
    } else {
      onChange(parsed);
    }
  };

  return (
    <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border p-4 transition-all duration-150 ${
      isLight ? 'bg-white border-slate-200 hover:border-sky-500/50' : 'bg-[#1A1D23] border-white/10 hover:border-sky-500/30'
    }`}>
      <div className="flex flex-col">
        <span className={`text-sm font-black tracking-wider uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>{label}</span>
        <span className="text-[11px] text-slate-500">{description}</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 self-end sm:self-auto flex-shrink-0">
        <button
          onClick={handleDecrement}
          disabled={value <= 0}
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-red-500/50 hover:bg-red-500/10 text-red-600 font-bold text-xl transition-all duration-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <Minus className="h-5 w-5" />
        </button>

        <div className="relative">
          <input
            type="number"
            value={value}
            onChange={handleInputChange}
            className={`w-20 rounded border py-1 text-center font-mono text-xl font-black outline-none focus:border-sky-500/50 focus:ring-1 focus:ring-sky-500/30 ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#0F1117] border-white/10 text-white'
            }`}
            min="0"
            max={max}
          />
        </div>

        <button
          onClick={handleIncrement}
          disabled={value >= max}
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-600 font-bold text-xl transition-all duration-100 disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
