/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Flight, StationCode } from '../types';
import { CARRIERS } from '../data';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';

interface FlightBoardProps {
  flights: Flight[];
  currentStation: StationCode;
  theme?: 'light' | 'dark';
}

export default function FlightBoard({ flights, currentStation, theme = 'dark' }: FlightBoardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTabActive, setIsTabActive] = useState(true);
  const [flipTrigger, setFlipTrigger] = useState(false);

  const isLight = theme === 'light';

  // Filter Departures and Arrivals based on station
  const departures = flights.filter((f) => f.origin === currentStation);
  const arrivals = flights.filter((f) => f.destination === currentStation);

  // Group into pages of 3 flights. Pad with nulls to ensure stable height
  const depPages: (Flight | null)[][] = [];
  for (let i = 0; i < Math.max(1, departures.length); i += 3) {
    const chunk = departures.slice(i, i + 3);
    while (chunk.length < 3) {
      chunk.push(null);
    }
    depPages.push(chunk);
  }

  const arrPages: (Flight | null)[][] = [];
  for (let i = 0; i < Math.max(1, arrivals.length); i += 3) {
    const chunk = arrivals.slice(i, i + 3);
    while (chunk.length < 3) {
      chunk.push(null);
    }
    arrPages.push(chunk);
  }

  // Monitor browser tab visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Interval rotation every 5 seconds
  useEffect(() => {
    if (!isTabActive) return;

    const interval = setInterval(() => {
      setFlipTrigger(true);
      // Brief timeout to trigger mechanical flap flip animation
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setFlipTrigger(false);
      }, 350);
    }, 5000);

    return () => clearInterval(interval);
  }, [isTabActive, depPages.length, arrPages.length]);

  // Reset index on station change
  useEffect(() => {
    setCurrentIndex(0);
  }, [currentStation]);

  const activeDepPage = depPages[currentIndex % depPages.length] || [null, null, null];
  const activeArrPage = arrPages[currentIndex % arrPages.length] || [null, null, null];

  // Helper to format timestamps to hh:mm
  const formatTime = (isoString?: string) => {
    if (!isoString) return '--:--';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return '--:--';
    }
  };

  const getStatusStyle = (status?: string) => {
    if (!status) return 'text-slate-500 border-transparent';
    switch (status) {
      case 'BOARDING':
      case 'FINAL_CALL':
        return isLight 
          ? 'bg-amber-100 text-amber-950 border-amber-400 font-extrabold' 
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'DEPARTED':
      case 'IN_FLIGHT':
      case 'ARRIVED':
        return isLight 
          ? 'bg-emerald-100 text-emerald-950 border-emerald-400 font-extrabold' 
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DELAYED':
        return isLight 
          ? 'bg-rose-100 text-rose-950 border-rose-400 font-extrabold' 
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return isLight 
          ? 'bg-slate-200 text-slate-900 border-slate-400 font-bold' 
          : 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  // Render a cell in mechanical "Split-Flap" style
  const renderFlapCell = (text: string) => {
    return (
      <div 
        className={`inline-flex items-center gap-[1px] font-mono text-xs font-bold transition-all duration-300 ${
          flipTrigger ? 'scale-y-0 opacity-40 rotate-x-90' : 'scale-y-100 opacity-100 rotate-x-0'
        }`}
      >
        {text.split('').map((char, index) => (
          <span
            key={index}
            className={`relative flex items-center justify-center w-[11px] h-[19px] rounded-[2px] text-[10px] font-black border uppercase flex-shrink-0 ${
              isLight
                ? 'bg-slate-200 border-slate-400 text-slate-900 font-black shadow-[inset_0_-1px_1px_rgba(0,0,0,0.1)]'
                : 'bg-[#181C26] border-slate-800 text-yellow-500 shadow-[inset_0_-1px_1px_rgba(255,255,255,0.05)]'
            }`}
            style={{ textShadow: isLight ? 'none' : '0 0 2px rgba(245, 158, 11, 0.4)' }}
          >
            {char}
            {/* Split Line */}
            <span className={`absolute left-0 right-0 top-1/2 h-[1px] ${isLight ? 'bg-slate-400/60' : 'bg-black/40'}`} />
          </span>
        ))}
      </div>
    );
  };

  const [mobileTab, setMobileTab] = useState<'DEP' | 'ARR'>('DEP');

  const renderRows = (page: (Flight | null)[]) => {
    return page.map((flight, idx) => {
      if (!flight) {
        return (
          <div
            key={`empty-${idx}`}
            className={`min-h-[38px] sm:min-h-[42px] border border-dashed rounded-md px-2 py-1.5 opacity-30 flex items-center justify-between sm:grid sm:grid-cols-5 ${
              isLight ? 'border-slate-300 bg-slate-50' : 'border-white/10 bg-white/2'
            }`}
          >
            <span className="font-mono text-[11px]">---</span>
            <span className="font-mono text-[11px] hidden sm:inline">---</span>
            <span className="font-mono text-[11px] hidden sm:inline">--:--</span>
            <span className="font-mono text-[11px] hidden sm:inline">---</span>
            <span className="text-[10px] text-slate-500 uppercase font-bold">OUT OF SERVICE</span>
          </div>
        );
      }

      const carrierName = CARRIERS[flight.carrierCode]?.displayName || flight.carrierCode;

      return (
        <div
          key={flight.id}
          className={`border rounded-md px-2.5 py-1.5 transition-all duration-150 ${
            isLight 
              ? 'border-slate-300 bg-white hover:bg-slate-50 text-slate-900 shadow-xs' 
              : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-200'
          }`}
        >
          {/* DESKTOP/TABLET GRID VIEW (>= 640px) */}
          <div className="hidden sm:grid flight-board-row min-h-[42px] items-center">
            {/* Col 1: Flight Number */}
            <div className="flex-shrink-0 min-w-0 flex items-center">
              {renderFlapCell(flight.flightNumber)}
            </div>

            {/* Col 2: Carrier & Route */}
            <div className="flex flex-col min-w-0 leading-tight">
              <span className={`text-[9px] font-extrabold uppercase tracking-wide truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`} title={carrierName}>
                {flight.carrierCode}
              </span>
              <span className={`font-mono text-[11px] font-bold truncate ${isLight ? 'text-slate-950 font-black' : 'text-white'}`}>
                {flight.origin}➔{flight.destination}
              </span>
            </div>

            {/* Col 3: STD / ETD or STA / ETA */}
            <div className="flex flex-col min-w-0 leading-tight font-mono">
              <span className={`text-[9px] font-extrabold ${isLight ? 'text-slate-900' : 'text-slate-300'} whitespace-nowrap`}>
                {flight.flightDate}
              </span>
              <span className={`text-[9px] ${isLight ? 'text-slate-700 font-extrabold' : 'text-slate-400'} whitespace-nowrap`}>
                {formatTime(flight.scheduledDeparture || flight.scheduledArrival)} <span className={isLight ? 'text-sky-800 font-black' : 'text-sky-400 font-bold'}>({formatTime(flight.estimatedDeparture || flight.estimatedArrival)})</span>
              </span>
            </div>

            {/* Col 4: Gate / Aircraft */}
            <div className="flex flex-col min-w-0 leading-tight">
              <span className={`text-[10px] font-black uppercase ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>
                {flight.gate ? `G-${flight.gate}` : 'TBD'}
              </span>
              <span className={`text-[9px] font-bold truncate ${isLight ? 'text-slate-600' : 'text-slate-400'}`} title={flight.aircraft.type}>
                {flight.aircraft.type}
              </span>
            </div>

            {/* Col 5: Status Badge */}
            <div className="min-w-0 flex justify-start items-center">
              <span className={`inline-block text-[9px] font-black tracking-wider uppercase rounded px-1.5 py-0.5 border truncate max-w-full leading-none ${getStatusStyle(flight.movementStatus)}`}>
                {flight.movementStatus}
              </span>
            </div>
          </div>

          {/* MOBILE COMPACT VIEW (< 640px) */}
          <div className="sm:hidden flex flex-col gap-1 w-full min-w-0">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                {renderFlapCell(flight.flightNumber)}
                <span className={`font-mono text-[11px] font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {flight.origin}➔{flight.destination}
                </span>
              </div>
              <span className={`text-[8.5px] font-black tracking-wider uppercase rounded px-1.5 py-0.5 border flex-shrink-0 leading-none ${getStatusStyle(flight.movementStatus)}`}>
                {flight.movementStatus}
              </span>
            </div>

            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-0.5 border-t border-white/5">
              <div className="flex items-center gap-1 truncate">
                <span className={isLight ? 'text-slate-700' : 'text-slate-300'}>
                  {formatTime(flight.scheduledDeparture || flight.scheduledArrival)}
                </span>
                <span className={isLight ? 'text-sky-700' : 'text-sky-400'}>
                  ({formatTime(flight.estimatedDeparture || flight.estimatedArrival)})
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 text-[9px]">
                <span className={isLight ? 'text-sky-800 font-bold' : 'text-sky-400 font-bold'}>
                  {flight.gate ? `G-${flight.gate}` : 'TBD'}
                </span>
                <span>•</span>
                <span className="truncate max-w-[65px]">{flight.aircraft.type}</span>
              </div>
            </div>
          </div>
        </div>
      );
    });
  };

  return (
    <div 
      className={`flight-board grid grid-cols-1 md:grid-cols-2 w-full min-w-0 max-w-full p-2 sm:p-3.5 border-t transition-all duration-300 select-none ${
        isLight
          ? 'bg-white border-slate-200 text-slate-800 shadow-md'
          : 'bg-[#0E1015] border-white/10 text-slate-200'
      }`}
    >
      {/* MOBILE SEGMENTED SELECTOR (< 768px) */}
      <div className="md:hidden flex items-center gap-1 p-0.5 rounded-lg border border-white/10 bg-black/20 mb-2 w-full text-xs font-bold uppercase">
        <button
          onClick={() => setMobileTab('DEP')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1 transition cursor-pointer ${
            mobileTab === 'DEP'
              ? 'bg-sky-600 text-white font-black shadow-xs'
              : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
          <span>Departures ({departures.length})</span>
        </button>
        <button
          onClick={() => setMobileTab('ARR')}
          className={`flex-1 py-1.5 px-2 rounded-md flex items-center justify-center gap-1 transition cursor-pointer ${
            mobileTab === 'ARR'
              ? 'bg-sky-600 text-white font-black shadow-xs'
              : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownLeft className="h-3.5 w-3.5 text-sky-400" />
          <span>Arrivals ({arrivals.length})</span>
        </button>
      </div>

      {/* LEFT COLUMN: DEPARTURES */}
      <div className={`flight-board-section ${mobileTab === 'DEP' ? 'block' : 'hidden md:flex'}`}>
        <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
          <h3 className="text-xs font-black tracking-widest text-sky-500 uppercase flex items-center gap-1.5">
            <ArrowUpRight className="h-4 w-4 animate-pulse text-emerald-500" />
            DEPARTURES FROM {currentStation}
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            PAGE {currentIndex % depPages.length + 1} OF {depPages.length}
          </span>
        </div>
        
        {/* Header labels on desktop/tablet */}
        <div className="hidden sm:grid flight-board-row text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1 px-2">
          <span>Flight</span>
          <span>Route</span>
          <span>Date & STD/ETD</span>
          <span>Gate/Acft</span>
          <span>Status</span>
        </div>

        <div className="flight-board-list">
          {renderRows(activeDepPage)}
        </div>
      </div>

      {/* RIGHT COLUMN: ARRIVALS */}
      <div className={`flight-board-section ${mobileTab === 'ARR' ? 'block' : 'hidden md:flex'}`}>
        <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
          <h3 className="text-xs font-black tracking-widest text-sky-500 uppercase flex items-center gap-1.5">
            <ArrowDownLeft className="h-4 w-4 animate-pulse text-sky-400" />
            ARRIVALS TO {currentStation}
          </h3>
          <span className="text-[10px] text-slate-500 font-mono">
            PAGE {currentIndex % arrPages.length + 1} OF {arrPages.length}
          </span>
        </div>

        {/* Header labels on desktop/tablet */}
        <div className="hidden sm:grid flight-board-row text-[9px] font-black uppercase text-slate-500 tracking-wider mb-1 px-2">
          <span>Flight</span>
          <span>Route</span>
          <span>Date & STA/ETA</span>
          <span>Gate/Acft</span>
          <span>Status</span>
        </div>

        <div className="flight-board-list">
          {renderRows(activeArrPage)}
        </div>
      </div>
    </div>
  );
}
