/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { StationCode } from '../types';
import { STATIONS } from '../data';
import { LogOut, ArrowLeft, RefreshCw, Radio, Sun, Moon } from 'lucide-react';

interface AppHeaderProps {
  currentStation: StationCode;
  currentRole: string | null;
  onStationChange: (station: StationCode) => void;
  onEndSession: () => void;
  onBackToRadar?: () => void;
  disableNavigation?: boolean;
  theme?: 'light' | 'dark';
  onThemeToggle?: () => void;
  onOpenDiagnostics?: () => void;
  lastUpdated?: string;
  nextRefreshSeconds?: number;
  syncStatus?: string;
  onResetDemo?: () => void;
  contingencyState?: 'LIVE' | 'CACHE_AVAILABLE' | 'NO_CACHE' | 'RECONCILING';
}

export default function AppHeader({
  currentStation,
  currentRole,
  onStationChange,
  onEndSession,
  onBackToRadar,
  disableNavigation = false,
  theme = 'dark',
  onThemeToggle,
  onOpenDiagnostics,
  lastUpdated,
  nextRefreshSeconds,
  syncStatus,
  onResetDemo,
  contingencyState = 'LIVE',
}: AppHeaderProps) {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  let statusText = 'SYNCHRONIZED';
  let statusColorClass = '';
  let dotColorClass = '';

  if (contingencyState === 'CACHE_AVAILABLE') {
    statusText = 'CACHED MODE';
    statusColorClass = theme === 'light' ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' : 'bg-amber-500/15 border-amber-500/30 text-amber-400';
    dotColorClass = 'bg-amber-500 animate-pulse';
  } else if (contingencyState === 'NO_CACHE') {
    statusText = 'CONTINGENCY MODE';
    statusColorClass = theme === 'light' ? 'bg-rose-100 border-rose-400 text-rose-950 font-black' : 'bg-rose-500/15 border-rose-500/30 text-rose-400';
    dotColorClass = 'bg-rose-500 animate-pulse';
  } else if (contingencyState === 'RECONCILING') {
    statusText = 'RECONCILING';
    statusColorClass = theme === 'light' ? 'bg-sky-100 border-sky-400 text-sky-950 font-black' : 'bg-sky-500/15 border-sky-500/30 text-sky-400';
    dotColorClass = 'bg-sky-400 animate-spin';
  } else {
    statusText = syncStatus === 'SYNCHRONIZING' ? 'SYNCHRONIZING' : 'SYNCHRONIZED';
    statusColorClass = theme === 'light'
      ? 'bg-emerald-100 border-emerald-400 text-emerald-950 font-black'
      : 'bg-emerald-500/10 border border-[#c4e830]/30 text-[#c4e830]';
    dotColorClass = syncStatus === 'SYNCHRONIZING' ? 'bg-amber-400 animate-ping' : (theme === 'light' ? 'bg-emerald-700' : 'bg-[#c4e830] animate-pulse');
  }

  const stationInfo = STATIONS[currentStation];

  // Formatting strings
  const utcStr = time.toUTCString().split(' ')[4] || '--:--:--';
  const localStr = time.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone: stationInfo?.timezone || 'Asia/Jakarta',
  });

  const dateStr = time.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: stationInfo?.timezone || 'Asia/Jakarta',
  });

  return (
    <header className={`main-header sticky top-0 z-50 border-b px-2 sm:px-4 py-1.5 shadow-md flex items-center justify-between transition-colors duration-300 flex-shrink-0 h-[48px] sm:h-[52px] max-w-full overflow-hidden ${
      theme === 'light'
        ? 'border-slate-300 bg-white text-slate-900 shadow-sm'
        : 'border-white/10 bg-[#0F1117] text-slate-200 shadow-md'
    }`}>
      {/* LEFT: Branding & Demo Badge */}
      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-shrink">
        <div className="flex flex-col min-w-0">
          <span className={`hidden sm:inline text-[11px] sm:text-[13px] font-extrabold tracking-wider uppercase leading-none opacity-90 truncate max-w-[240px] md:max-w-none ${
            theme === 'light' ? 'text-sky-800' : 'text-sky-400'
          }`}>
            cuka-cuka club proudly present for Elevate 2026 project
          </span>
          <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
            <span
              className={`text-[16px] sm:text-[18px] font-black tracking-widest leading-none ${
                theme === 'light' ? 'text-slate-900' : 'text-white'
              }`}
              style={{ textShadow: theme === 'light' ? 'none' : '0 0 10px rgba(56, 189, 248, 0.4)' }}
            >
              MAVIS
            </span>
            <span className={`animate-pulse rounded px-1 py-0.5 text-[10px] sm:text-[12px] font-bold text-white leading-none ${
              theme === 'light' ? 'bg-sky-700 shadow-none' : 'bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.3)]'
            }`}>
              DEMO
            </span>
            {onResetDemo && (
              <button
                onClick={onResetDemo}
                className={`p-1 rounded border transition duration-150 cursor-pointer flex items-center justify-center ${
                  theme === 'light'
                    ? 'bg-slate-100 border-slate-300 text-slate-700 hover:text-red-700 hover:bg-red-50 hover:border-red-600 hover:text-white'
                    : 'bg-white/5 border border-white/10 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20'
                }`}
                title="Reset Simulation Database"
              >
                <RefreshCw className="h-3 w-3" />
              </button>
            )}
            <span className={`hidden xl:inline text-[12px] font-medium tracking-wider uppercase leading-none ${
              theme === 'light' ? 'text-slate-600' : 'text-slate-400'
            }`}>
              | Manifest Aviation Integrated System
            </span>
          </div>
        </div>
      </div>

      {/* CENTER / RIGHT: Context Info and Time */}
      <div className="flex items-center justify-end gap-1.5 sm:gap-2.5 px-0.5 sm:px-1 text-[11px] sm:text-[12px] flex-shrink-0">
        {/* Station Selector - locked if navigation is disabled */}
        <div className={`flex items-center gap-1 rounded px-1.5 sm:px-2 py-0.5 sm:py-1 border text-[11px] sm:text-[12px] ${
          theme === 'light' ? 'bg-slate-100 border-slate-300' : 'bg-white/5 border-white/10'
        }`}>
          <span className={`hidden sm:inline font-bold uppercase ${theme === 'light' ? 'text-slate-700' : 'text-slate-400'}`}>STATION:</span>
          {disableNavigation || currentRole ? (
            <span className={`font-bold ${theme === 'light' ? 'text-sky-800' : 'text-sky-400'}`}>{currentStation}</span>
          ) : (
            <select
              value={currentStation}
              onChange={(e) => onStationChange(e.target.value as StationCode)}
              className={`bg-transparent font-bold outline-none cursor-pointer text-[11px] sm:text-[12px] ${
                theme === 'light' ? 'text-slate-900 bg-white' : 'text-white'
              }`}
            >
              <option value="CGK" className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0F1117]'}>CGK — Jakarta</option>
              <option value="DPS" className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0F1117]'}>DPS — Bali</option>
              <option value="KUL" className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0F1117]'}>KUL — Kuala Lumpur</option>
              <option value="SUB" className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0F1117]'}>SUB — Surabaya</option>
              <option value="KNO" className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0F1117]'}>KNO — Medan</option>
              <option value="UPG" className={theme === 'light' ? 'bg-white text-slate-900' : 'bg-[#0F1117]'}>UPG — Makassar</option>
            </select>
          )}
        </div>

        {/* Combined TIME Box */}
        <div className={`hidden md:flex flex-col justify-center rounded px-2 py-0.5 border text-[10px] leading-none ${
          theme === 'light' ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white/5 border-white/10 text-slate-200'
        }`}>
          <div className="flex items-center justify-between gap-3 mb-0.5">
            <span className={`text-[9px] font-black uppercase tracking-wider ${
              theme === 'light' ? 'text-slate-700' : 'text-slate-400'
            }`}>TIME</span>
            <span className={`text-[9px] font-bold ${
              theme === 'light' ? 'text-slate-600' : 'text-slate-400'
            }`}>{dateStr}</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <div className="flex items-center gap-1">
              <span className={`text-[9px] font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>UTC</span>
              <span className={`font-bold ${theme === 'light' ? 'text-slate-950 font-black' : 'text-white'}`}>{utcStr}</span>
            </div>
            <span className={theme === 'light' ? 'text-slate-300' : 'text-white/20'}>|</span>
            <div className="flex items-center gap-1">
              <span className={`text-[9px] font-bold ${theme === 'light' ? 'text-sky-800' : 'text-sky-400'}`}>{currentStation}</span>
              <span className={`font-bold ${theme === 'light' ? 'text-sky-950 font-black' : 'text-sky-400'}`}>{localStr}</span>
            </div>
          </div>
        </div>

        {/* Combined SYNC Box */}
        <div className={`hidden lg:flex items-center gap-2 rounded px-2.5 py-0.5 border text-[10px] leading-none ${
          theme === 'light' ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white/5 border-white/10 text-slate-200'
        }`}>
          <div className="flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[9px] font-black uppercase tracking-wider ${
                theme === 'light' ? 'text-slate-700' : 'text-slate-400'
              }`}>SYNC</span>
              <div className={`flex items-center gap-1 rounded-full border px-1.5 py-0.2 text-[8px] font-extrabold uppercase tracking-wider ${statusColorClass}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${dotColorClass}`} />
                <span>{statusText}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-[10.5px]">
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Last</span>
                <span className={`font-bold ${theme === 'light' ? 'text-slate-950 font-black' : 'text-white'}`}>{lastUpdated || 'JUST NOW'}</span>
              </div>
              <span className={theme === 'light' ? 'text-slate-300' : 'text-white/20'}>|</span>
              <div className="flex items-center gap-1">
                <span className={`text-[9px] font-bold ${theme === 'light' ? 'text-slate-600' : 'text-slate-400'}`}>Refresh</span>
                <span className={`font-bold ${theme === 'light' ? 'text-sky-900 font-black' : 'text-sky-400'}`}>
                  {nextRefreshSeconds !== undefined ? `${Math.floor(nextRefreshSeconds / 60)}m ${nextRefreshSeconds % 60}s` : '5m 0s'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* BREAKER diagnostic toggle */}
        {onOpenDiagnostics && (
          <button
            onClick={onOpenDiagnostics}
            className={`flex items-center gap-1 rounded border px-2 sm:px-2.5 py-1 text-[10px] sm:text-[11px] font-extrabold leading-none transition duration-150 uppercase h-[26px] sm:h-[28px] ${
              theme === 'light'
                ? 'bg-amber-100 border-amber-400 text-amber-950 hover:bg-amber-200'
                : 'bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 shadow-[0_0_8px_rgba(245,158,11,0.15)]'
            }`}
            title="Open Developer & Operational Diagnostics Drawer"
          >
            <span className="hidden sm:inline">⚡ BREAKER</span>
            <span className="sm:hidden">⚡</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        {onThemeToggle && (
          <button
            onClick={onThemeToggle}
            className={`flex items-center justify-center p-1 sm:p-1.5 rounded-full border transition duration-150 cursor-pointer h-[28px] w-[28px] sm:h-[32px] sm:w-[32px] ${
              theme === 'light'
                ? 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200 hover:text-indigo-600'
                : 'bg-white/5 border border-white/10 text-slate-300 hover:text-sky-400 hover:bg-white/10'
            }`}
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? (
              <Moon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600 fill-indigo-600" />
            ) : (
              <Sun className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
            )}
          </button>
        )}

        {/* Role Access / Actions */}
        {currentRole && !disableNavigation && (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className={`hidden md:inline rounded border px-2 py-1 text-[11px] sm:text-[12px] font-extrabold tracking-wider uppercase leading-none ${
              theme === 'light'
                ? 'bg-slate-200 border-slate-400 text-slate-900 font-black'
                : 'bg-white/10 border border-white/10 text-white'
            }`}>
              {currentRole.replace(/_/g, ' ')}
            </span>
            {onBackToRadar && (
              <button
                onClick={onBackToRadar}
                className={`flex items-center gap-1 rounded border px-2 sm:px-2.5 py-1 text-[11px] sm:text-[12px] font-bold transition duration-150 h-[28px] sm:h-[32px] ${
                  theme === 'light'
                    ? 'border-slate-300 bg-white hover:border-sky-600 hover:bg-slate-50 text-slate-800 font-extrabold hover:text-sky-800'
                    : 'border-white/10 bg-transparent hover:border-sky-500/50 hover:text-sky-400 text-slate-300'
                }`}
              >
                <ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">RADAR</span>
              </button>
            )}
            <button
              onClick={onEndSession}
              className={`flex items-center gap-1 rounded px-2 sm:px-2.5 py-1 text-[11px] sm:text-[12px] font-bold transition duration-150 h-[28px] sm:h-[32px] ${
                theme === 'light'
                  ? 'bg-sky-700 hover:bg-sky-800 text-white shadow-none'
                  : 'bg-sky-500 hover:bg-sky-600 text-white shadow-[0_0_8px_rgba(56,189,248,0.25)]'
              }`}
            >
              <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span className="hidden sm:inline">LOGOUT</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
