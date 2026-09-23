/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { StationCode } from '../types';
import { STATIONS } from '../data';
import { 
  ShieldAlert, 
  Layers, 
  Users, 
  Globe, 
  Plane, 
  ExternalLink, 
  HelpCircle,
  Lock,
  RotateCcw
} from 'lucide-react';

interface QuickAccessPanelProps {
  currentStation: StationCode;
  onLogin: (role: 'FLIGHT_OPERATIONS' | 'MANIFEST_STATION' | 'MANIFEST_HQ') => void;
  theme?: 'light' | 'dark';
}

export default function QuickAccessPanel({ 
  currentStation, 
  onLogin, 
  theme = 'dark'
}: QuickAccessPanelProps) {
  const stationInfo = STATIONS[currentStation];
  const isLight = theme === 'light';

  return (
    <div className={`quick-access-panel flex flex-col h-full overflow-hidden transition-colors duration-300 ${
      isLight 
        ? 'border-l border-slate-300 bg-white text-slate-900' 
        : 'border-l border-white/10 bg-[#0F1117]'
    }`}>
      {/* Title Header */}
      <div className={`quick-access-header flex items-center gap-2 pb-2 mb-1.5 border-b ${
        isLight ? 'border-slate-300' : 'border-white/10'
      }`}>
        <ShieldAlert className={`h-4.5 w-4.5 flex-shrink-0 ${isLight ? 'text-sky-800' : 'text-sky-400'}`} />
        <h3 className={`text-[12px] font-black tracking-widest uppercase ${isLight ? 'text-sky-900' : 'text-sky-400'}`}>
          🔐 QUICK ACCESS ROLES
        </h3>
      </div>

      <div className="quick-access-grid grid grid-cols-1 md:grid-cols-2 w-full min-w-0">
        {/* ROLE 1: FLIGHT OPERATIONS */}
        <div className={`role-card group rounded-lg border transition-all duration-150 ${
          isLight
            ? 'border-slate-400 bg-slate-100/90 shadow-md hover:border-sky-700 hover:shadow-lg'
            : 'border-white/10 bg-[#1A1D23] shadow-sm hover:border-sky-500/50 hover:shadow-[0_0_12px_rgba(56,189,248,0.06)]'
        }`}>
          <div className="role-card-top">
            <span className={`role-category text-[12px] font-extrabold tracking-widest uppercase ${isLight ? 'text-sky-800 font-black' : 'text-sky-400'}`}>
              FLIGHT OPERATIONS
            </span>
            <span className={`role-status-badge rounded border px-1.5 py-0.5 text-[12px] font-bold uppercase ${
              isLight ? 'bg-sky-100 border-sky-400 text-sky-950 font-black' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
            }`}>
              ACTIVE
            </span>
          </div>
          <div className="role-card-title">
            <Layers className={`h-4 w-4 flex-shrink-0 ${isLight ? 'text-sky-800' : 'text-sky-400'}`} />
            <h4 className={`role-card-title-text font-black tracking-wider uppercase ${isLight ? 'text-slate-950' : 'text-white'}`}>
              FLIGHT OPERATIONS
            </h4>
          </div>
          <p className={`role-card-description text-[12px] ${isLight ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
            Prepare, select, and verify active flights for station <strong className={isLight ? 'text-sky-950 font-extrabold' : 'text-white'}>{currentStation}</strong>. Pull manifest reference data, compile the Digital APB, and initiate cabin crew device handover.
          </p>
          <div className="role-card-action">
            <button
              onClick={() => onLogin('FLIGHT_OPERATIONS')}
              className={`flex w-full items-center justify-center gap-2 rounded px-3 py-2 text-[12px] font-extrabold text-white transition duration-150 cursor-pointer ${
                isLight ? 'bg-sky-800 hover:bg-sky-900 shadow-md' : 'bg-sky-500 hover:bg-sky-600 shadow-[0_3px_8px_rgba(56,189,248,0.15)]'
              }`}
            >
              <span>LOGIN AS FLIGHT OPERATIONS</span>
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* ROLE 2: FLIGHT ATTENDANT */}
        <div className={`role-card rounded-lg border shadow-sm ${
          isLight
            ? 'border-slate-300 bg-slate-200/50 opacity-80 text-slate-800'
            : 'border-white/5 bg-[#1a1d23]/50 opacity-75'
        }`}>
          <div className="role-card-top">
            <span className={`role-category text-[12px] font-extrabold tracking-widest uppercase ${isLight ? 'text-slate-700 font-extrabold' : 'text-slate-500'}`}>
              FLIGHT ATTENDANT
            </span>
            <span className={`role-status-badge flex items-center gap-1 rounded border px-1.5 py-0.5 text-[12px] font-bold uppercase ${
              isLight ? 'bg-amber-100 border-amber-400 text-amber-950 font-black' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <Lock className="h-2.5 w-2.5 flex-shrink-0" />
              LOCKED
            </span>
          </div>
          <div className="role-card-title">
            <Plane className={`h-4 w-4 flex-shrink-0 ${isLight ? 'text-slate-700' : 'text-slate-500'}`} />
            <h4 className={`role-card-title-text font-black tracking-wider uppercase ${isLight ? 'text-slate-700' : 'text-slate-400'}`}>
              FLIGHT ATTENDANT
            </h4>
          </div>
          <p className={`role-card-description text-[12px] ${isLight ? 'text-slate-700 font-medium' : 'text-slate-500'}`}>
            Review cockpit flight briefings, execute real-time digital headcount audits on active passengers, verify safety rules, and transmit the verified Digital APB.
          </p>
          <div className="role-card-action">
            <div className={`flex w-full items-center justify-center gap-2 rounded border px-3 py-2 text-[12px] font-bold ${
              isLight ? 'border-slate-300 bg-slate-300/40 text-slate-600' : 'border-white/5 bg-white/5 text-slate-500'
            }`}>
              <span>HANDOVER TO FLIGHT ATTENDANT</span>
            </div>
          </div>
        </div>

        {/* ROLE 3: MANIFEST STATION */}
        <div className={`role-card group rounded-lg border transition-all duration-150 shadow-sm ${
          isLight
            ? 'border-slate-400 bg-slate-100/90 hover:border-sky-700'
            : 'border-white/10 bg-[#1A1D23] hover:border-sky-500/40'
        }`}>
          <div className="role-card-top">
            <span className={`role-category text-[12px] font-extrabold tracking-widest uppercase ${isLight ? 'text-sky-800 font-black' : 'text-sky-400'}`}>
              MANIFEST STATION
            </span>
            <span className={`role-status-badge rounded border px-1.5 py-0.5 text-[12px] font-bold uppercase ${
              isLight ? 'bg-sky-100 border-sky-400 text-sky-950 font-black' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
            }`}>
              ACTIVE
            </span>
          </div>
          <div className="role-card-title">
            <Users className={`h-4 w-4 flex-shrink-0 ${isLight ? 'text-sky-800' : 'text-sky-400'}`} />
            <h4 className={`role-card-title-text font-black tracking-wider uppercase ${isLight ? 'text-slate-950' : 'text-white'}`}>
              MANIFEST STATION
            </h4>
          </div>
          <p className={`role-card-description text-[12px] ${isLight ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
            Access, review, and double-check received Digital APBs once transmitted to the local server. Verify seat counts, passenger details, and confirm gate release protocols.
          </p>
          <div className="role-card-action">
            <button
              onClick={() => onLogin('MANIFEST_STATION')}
              className={`flex w-full items-center justify-center gap-2 rounded border transition duration-150 cursor-pointer px-3 py-2 text-[12px] font-extrabold ${
                isLight
                  ? 'border-slate-400 hover:border-sky-800 text-slate-900 hover:text-white hover:bg-sky-800 bg-white shadow-sm'
                  : 'border-white/10 hover:border-sky-500/50 text-slate-300 hover:text-sky-400 bg-transparent'
              }`}
            >
              <span>LOGIN AS MANIFEST STATION</span>
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            </button>
          </div>
        </div>

        {/* ROLE 4: MANIFEST HQ */}
        <div className={`role-card group rounded-lg border transition-all duration-150 shadow-sm ${
          isLight
            ? 'border-slate-400 bg-slate-100/90 hover:border-sky-700'
            : 'border-white/10 bg-[#1A1D23] hover:border-sky-500/40'
        }`}>
          <div className="role-card-top">
            <span className={`role-category text-[12px] font-extrabold tracking-widest uppercase ${isLight ? 'text-sky-800 font-black' : 'text-sky-400'}`}>
              MANIFEST HQ
            </span>
            <span className={`role-status-badge rounded border px-1.5 py-0.5 text-[12px] font-bold uppercase ${
              isLight ? 'bg-sky-100 border-sky-400 text-sky-950 font-black' : 'bg-sky-500/10 border-sky-500/20 text-sky-400'
            }`}>
              ACTIVE
            </span>
          </div>
          <div className="role-card-title">
            <Globe className={`h-4 w-4 flex-shrink-0 ${isLight ? 'text-sky-800' : 'text-sky-400'}`} />
            <h4 className={`role-card-title-text font-black tracking-wider uppercase ${isLight ? 'text-slate-950' : 'text-white'}`}>
              MANIFEST HQ
            </h4>
          </div>
          <p className={`role-card-description text-[12px] ${isLight ? 'text-slate-800 font-medium' : 'text-slate-400'}`}>
            System-wide dashboard. Oversee operations across all stations, verify historical digital logs, inspect long-term flight manifest statistics, and audit safety compliance records.
          </p>
          <div className="role-card-action">
            <button
              onClick={() => onLogin('MANIFEST_HQ')}
              className={`flex w-full items-center justify-center gap-2 rounded border transition duration-150 cursor-pointer px-3 py-2 text-[12px] font-extrabold ${
                isLight
                  ? 'border-slate-400 hover:border-sky-800 text-slate-900 hover:text-white hover:bg-sky-800 bg-white shadow-sm'
                  : 'border-white/10 hover:border-sky-500/50 text-slate-300 hover:text-sky-400 bg-transparent'
              }`}
            >
              <span>LOGIN AS MANIFEST HQ</span>
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {/* ACTIVE STATION METRICS & RESET */}
      <div className={`flex flex-col gap-1.5 mt-auto pt-1.5 flex-shrink-0 border-t ${
        isLight ? 'border-slate-300' : 'border-white/10'
      }`}>
        <div className={`rounded border p-2 text-[12px] ${
          isLight ? 'bg-slate-100 border-slate-400 text-slate-800' : 'bg-[#0F1117] border-white/10 text-slate-400'
        }`}>
          <div className={`font-black uppercase tracking-wide text-[12px] border-b pb-0.5 ${
            isLight ? 'text-slate-950 border-slate-300' : 'text-white border-white/5'
          }`}>
            📍 CURRENT BOUNDS: {currentStation}
          </div>
          <div className="grid grid-cols-2 gap-y-0.5 text-[12px]">
            <span className="font-medium">Airport Hub:</span>
            <span className={`font-black text-right truncate ${isLight ? 'text-sky-900' : 'text-sky-400'}`}>{stationInfo?.name.split(' Airport')[0]}</span>
            <span className="font-medium">Timezone:</span>
            <span className={`font-mono text-right truncate ${isLight ? 'text-slate-950 font-bold' : 'text-white'}`}>{stationInfo?.timezone}</span>
          </div>
        </div>

        <div className="flex items-start gap-1.5 text-[12px] leading-normal">
          <HelpCircle className={`h-4 w-4 flex-shrink-0 mt-0.5 ${isLight ? 'text-slate-700' : 'text-slate-500'}`} />
          <p className={`leading-tight ${isLight ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
            Flight Attendant mode is initialized via a secure dispatcher session handover.
          </p>
        </div>
      </div>
    </div>
  );
}
