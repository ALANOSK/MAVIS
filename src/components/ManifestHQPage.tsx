/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Flight, DigitalAPB, StationCode, getAPBStatusLayers, getSimplifiedAPBDisplay, APBReturnCycle } from '../types';
import { Search, ArrowLeft, Shield, CheckCircle, Clock } from 'lucide-react';
import APBAuditTimeline from './APBAuditTimeline';
import HQHistoricalDashboard from './HQHistoricalDashboard';
import HQSalesRevenueDashboard from './HQSalesRevenueDashboard';
import DocumentTransactionCheckDashboard from './audit/DocumentTransactionCheckDashboard';
import { saveFlight } from '../db';
import { transitionAPB } from '../lib/apbStateMachine';

function getRelativeTimeStr(baseIso: string, offsetMinutes: number): string {
  if (!baseIso) return '--:--';
  const d = new Date(baseIso);
  const offsetMs = offsetMinutes * 60 * 1000;
  const targetDate = new Date(d.getTime() - offsetMs);
  return targetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}

function formatTimelineTime(isoString: string | null | undefined): string {
  if (!isoString) return 'NOT AVAILABLE';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return 'NOT AVAILABLE';
    if (d.getTime() > Date.now()) return 'NOT AVAILABLE';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) + ' UTC';
  } catch {
    return 'NOT AVAILABLE';
  }
}

interface ManifestHQPageProps {
  currentRoute: string;
  flights: Flight[];
  apbs: DigitalAPB[];
  mhqSearch: string;
  setMhqSearch: (val: string) => void;
  mhqStationFilter: 'ALL' | StationCode;
  setMhqStationFilter: (val: 'ALL' | StationCode) => void;
  mhqStatusFilter: string;
  setMhqStatusFilter: (val: string) => void;
  hqRemark: string;
  setHqRemark: (val: string) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  saveAPB: (apb: DigitalAPB) => Promise<void>;
  refreshData: () => Promise<void>;
  navigateTo: (route: string) => void;
  addAPBNote: (
    apbId: string,
    text: string,
    role: string,
    authorId: string,
    authorName: string,
    eventType: string
  ) => Promise<void>;
  theme: 'light' | 'dark';
  contingencyState?: 'LIVE' | 'CACHE_AVAILABLE' | 'NO_CACHE' | 'RECONCILING';
}

export default function ManifestHQPage({
  currentRoute,
  flights,
  apbs,
  mhqSearch,
  setMhqSearch,
  mhqStationFilter,
  setMhqStationFilter,
  mhqStatusFilter,
  setMhqStatusFilter,
  hqRemark,
  setHqRemark,
  addToast,
  saveAPB,
  refreshData,
  navigateTo,
  addAPBNote,
  theme,
  contingencyState = 'LIVE',
}: ManifestHQPageProps) {
  const [activeTab, setActiveTab] = useState<'MONITOR' | 'HISTORICAL' | 'REVENUE' | 'DOC_TRANSACTION_CHECK'>('MONITOR');
  const [passengerAuditStatusFilter, setPassengerAuditStatusFilter] = useState<string>('ALL');

  // Extract APB ID from route if present
  const parts = currentRoute.split('/');
  let apbId = '';
  if (currentRoute.includes('/manifest-hq/apb/')) {
    const idx = parts.indexOf('apb');
    if (idx !== -1 && parts[idx + 1]) {
      apbId = parts[idx + 1];
    }
  }

  const currentAPB = apbs.find((a) => a.id === apbId);
  const currentFlight = currentAPB ? flights.find((f) => f.id === currentAPB.flightId) : null;

  // Filter APBs for global HQ oversight
  const filteredAPBs = apbs.filter((a) => {
    const { syncStatus: layerSyncStatus } = getAPBStatusLayers(a, contingencyState);
    if (a.serverStatus !== 'SENT' && layerSyncStatus !== 'PENDING_SYNC' && layerSyncStatus !== 'SYNCING') return false;
    const f = flights.find((fl) => fl.id === a.flightId);
    if (!f) return false;

    const matchesSearch =
      !mhqSearch ||
      f.flightNumber.toLowerCase().includes(mhqSearch.toLowerCase()) ||
      a.apbUniqueNumber.toLowerCase().includes(mhqSearch.toLowerCase()) ||
      (a.submissionId && a.submissionId.toLowerCase().includes(mhqSearch.toLowerCase()));
    const matchesStation =
      mhqStationFilter === 'ALL' || f.origin === mhqStationFilter || f.destination === mhqStationFilter;
    const matchesStatus = !mhqStatusFilter || a.status === mhqStatusFilter;

    // Passenger Audit Status filter logic
    let matchesPassengerAudit = true;
    const actual = a.actualCount || a.temporaryCount;
    const boarding = f.passengerSources?.boarding?.breakdown;

    if (passengerAuditStatusFilter === 'VERIFIED') {
      matchesPassengerAudit = boarding ? (actual.total === boarding.total) : false;
    } else if (passengerAuditStatusFilter === 'VARIANCE DETECTED') {
      matchesPassengerAudit = boarding ? (actual.total !== boarding.total) : false;
    } else if (passengerAuditStatusFilter === 'PENDING_REVIEW') {
      matchesPassengerAudit = a.status === 'SENT_TO_SERVER' || a.status === 'STATION_CHECKED' || a.status === 'PENDING_HQ_REVIEW' || a.status === 'RETURNED_TO_MANIFEST_STATION';
    } else if (passengerAuditStatusFilter === 'EMERGENCY APB') {
      matchesPassengerAudit = a.sourceMode === 'MANUAL_EMERGENCY' || f.sourceMode === 'MANUAL_EMERGENCY';
    }

    return matchesSearch && matchesStation && matchesStatus && matchesPassengerAudit;
  });

  const isDetailView = currentRoute.startsWith('/manifest-hq/apb/') && currentAPB;

  // Stats calculation
  const totalReceived = apbs.filter((a) => a.serverStatus === 'SENT').length;
  const totalChecked = apbs.filter((a) => a.status === 'STATION_CHECKED').length;
  const totalCompleted = apbs.filter((a) => a.status === 'COMPLETED').length;
  const totalReturned = apbs.filter((a) => a.status.includes('RETURNED')).length;

  const isModalOpen = !!(isDetailView && currentAPB && currentFlight);
  const isLight = theme === 'light';

  return (
    <div className={`relative flex-1 flex flex-col min-h-0 min-w-0 ${isModalOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      {/* Background: Global Monitor Dashboard */}
      <div className={`transition-all duration-300 flex-1 flex flex-col min-h-0 min-w-0 ${isModalOpen ? 'filter blur-md pointer-events-none opacity-35 select-none' : ''}`}>
        <div id="manifest-hq-list" className="flex-1 p-5 max-w-7xl w-full mx-auto space-y-4">
          <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b ${isLight ? 'border-slate-200' : 'border-white/10'} pb-3 gap-3`}>
            <div className="space-y-1">
              <h2 className={`text-base font-black tracking-widest uppercase ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                🏛 MANIFEST HQ
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Oversight desk for real-time station-checked audits and 3-month operational trends.
              </p>
            </div>
            {/* Navigation Tabs */}
            <div className={`flex items-center overflow-x-auto max-w-full scrollbar-none gap-1 ${isLight ? 'bg-slate-200/80 border-slate-300' : 'bg-[#0F1117] border-white/10'} border rounded-lg p-1 text-[11px] font-bold uppercase leading-none`}>
              <button
                onClick={() => setActiveTab('MONITOR')}
                className={`px-3 py-1.5 rounded transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'MONITOR'
                    ? 'bg-sky-600 text-white font-black shadow-sm'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📡 Global Monitor
              </button>
              <button
                onClick={() => setActiveTab('HISTORICAL')}
                className={`px-3 py-1.5 rounded transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'HISTORICAL'
                    ? 'bg-sky-600 text-white font-black shadow-sm'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Dashboard All Operational
              </button>
              <button
                onClick={() => setActiveTab('REVENUE')}
                className={`px-3 py-1.5 rounded transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'REVENUE'
                    ? 'bg-sky-600 text-white font-black shadow-sm'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                💵 Dashboard Sales & Revenue
              </button>
              <button
                onClick={() => setActiveTab('DOC_TRANSACTION_CHECK')}
                className={`px-3 py-1.5 rounded transition cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  activeTab === 'DOC_TRANSACTION_CHECK'
                    ? 'bg-sky-600 text-white font-black shadow-sm'
                    : isLight
                    ? 'text-slate-700 hover:text-slate-900 hover:bg-slate-300/50'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📑 Document & Transaction Check
              </button>
            </div>
          </div>

          {activeTab === 'HISTORICAL' ? (
            <HQHistoricalDashboard theme={theme} dbFlights={flights} apbs={apbs} />
          ) : activeTab === 'REVENUE' ? (
            <HQSalesRevenueDashboard theme={theme} flights={flights} apbs={apbs} />
          ) : activeTab === 'DOC_TRANSACTION_CHECK' ? (
            <DocumentTransactionCheckDashboard theme={theme} addToast={addToast} />
          ) : (
            <>
              {/* Dynamic Visual Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'} border p-3 rounded-lg text-xs`}>
                  <span className={`uppercase block font-bold text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Transmitted APBs</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalReceived}</span>
                    <span className={`text-[10px] ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>Received</span>
                  </div>
                </div>
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'} border p-3 rounded-lg text-xs`}>
                  <span className={`uppercase block font-bold text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Station Checked</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalChecked}</span>
                    <span className={`text-[10px] ${isLight ? 'text-indigo-700 font-bold' : 'text-indigo-400'}`}>Verified</span>
                  </div>
                </div>
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'} border p-3 rounded-lg text-xs`}>
                  <span className={`uppercase block font-bold text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Process Completed</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalCompleted}</span>
                    <span className={`text-[10px] ${isLight ? 'text-emerald-700 font-bold' : 'text-emerald-400'}`}>Archived</span>
                  </div>
                </div>
                <div className={`${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'} border p-3 rounded-lg text-xs`}>
                  <span className={`uppercase block font-bold text-[9px] ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>Returned / Pending</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className={`text-2xl font-black font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>{totalReturned}</span>
                    <span className={`text-[10px] ${isLight ? 'text-rose-700 font-bold' : 'text-rose-400'}`}>Recheck</span>
                  </div>
                </div>
              </div>

              {/* Global Filters */}
              <div className={`grid grid-cols-1 sm:grid-cols-4 gap-2 p-3 rounded-lg border ${isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'}`}>
                <div className="relative">
                  <Search className={`absolute left-2.5 top-2.5 h-4 w-4 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
                  <input
                    type="text"
                    placeholder="Search by flight code or unique ID..."
                    value={mhqSearch}
                    onChange={(e) => setMhqSearch(e.target.value)}
                    className={`w-full rounded border py-2 pl-9 pr-3 text-xs outline-none focus:border-sky-500 ${
                      isLight
                        ? 'border-slate-300 bg-slate-50 text-slate-900 placeholder-slate-400'
                        : 'border-white/10 bg-[#1A1D23] text-white placeholder-slate-500 focus:border-sky-500/50'
                    }`}
                  />
                </div>

                <select
                  value={mhqStationFilter}
                  onChange={(e) => setMhqStationFilter(e.target.value as any)}
                  className={`rounded border px-3 py-2 text-xs focus:border-sky-500 outline-none ${
                    isLight
                      ? 'border-slate-300 bg-slate-50 text-slate-900'
                      : 'border-white/10 bg-[#1A1D23] text-white focus:border-sky-500/50'
                  }`}
                >
                  <option value="ALL">All Operational Stations</option>
                  <option value="CGK">CGK — Jakarta</option>
                  <option value="DPS">DPS — Bali</option>
                  <option value="KUL">KUL — Kuala Lumpur</option>
                  <option value="SUB">SUB — Surabaya</option>
                  <option value="KNO">KNO — Medan</option>
                  <option value="UPG">UPG — Makassar</option>
                </select>

                <select
                  value={mhqStatusFilter}
                  onChange={(e) => setMhqStatusFilter(e.target.value)}
                  className={`rounded border px-3 py-2 text-xs font-bold outline-none focus:border-sky-500 ${
                    isLight
                      ? 'border-slate-300 bg-slate-50 text-sky-700'
                      : 'border-white/10 bg-[#1A1D23] text-sky-400 focus:border-sky-500/50'
                  }`}
                >
                  <option value="" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>All Processing Statuses</option>
                  <option value="SENT_TO_SERVER" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>SENT TO SERVER</option>
                  <option value="STATION_CHECKED" className={isLight ? 'text-indigo-700 font-bold' : 'text-white font-normal font-bold text-indigo-400'}>STATION CHECKED</option>
                  <option value="HQ_REVIEWED" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>HQ REVIEWED</option>
                  <option value="COMPLETED" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>COMPLETED</option>
                </select>

                <select
                  value={passengerAuditStatusFilter}
                  onChange={(e) => setPassengerAuditStatusFilter(e.target.value)}
                  className={`rounded border px-3 py-2 text-xs font-bold outline-none focus:border-sky-500 ${
                    isLight
                      ? 'border-slate-300 bg-slate-50 text-sky-700'
                      : 'border-white/10 bg-[#1A1D23] text-sky-400 focus:border-sky-500/50'
                  }`}
                >
                  <option value="ALL" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>All Passenger Audits</option>
                  <option value="VERIFIED" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>VERIFIED Only</option>
                  <option value="VARIANCE DETECTED" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>VARIANCE DETECTED Only</option>
                  <option value="PENDING REVIEW" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>PENDING REVIEW Only</option>
                  <option value="EMERGENCY APB" className={isLight ? 'text-slate-900 font-normal' : 'text-white font-normal'}>EMERGENCY APB Only</option>
                </select>
              </div>

              {/* Monitor Table */}
              <div className="w-full overflow-x-auto rounded-lg">
                <table className="w-full text-xs text-left table-auto">
                  <thead>
                    <tr className={`${isLight ? 'bg-slate-100/80 text-slate-700 border-b border-slate-200' : 'bg-[#1A1D23]/90 text-slate-400 border-b border-white/10'} uppercase font-bold text-[10px] tracking-wider`}>
                      <th className="px-3 py-3 whitespace-nowrap">Flight / APB #</th>
                      <th className="px-3 py-3 whitespace-nowrap">Date & Route</th>
                      <th className="px-3 py-3 text-center whitespace-nowrap">Pax (Act / Brd / Diff)</th>
                      <th className="px-3 py-3 whitespace-nowrap">Lead FA / Sender</th>
                      <th className="px-2.5 py-3 text-center whitespace-nowrap">Station</th>
                      <th className="px-2.5 py-3 whitespace-nowrap">APB Status</th>
                      <th className="px-2.5 py-3 text-center whitespace-nowrap">Audit</th>
                      <th className="px-2.5 py-3 text-center whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-white/5 text-slate-300'}`}>
                    {filteredAPBs.map((a) => {
                      const f = flights.find((fl) => fl.id === a.flightId);
                      if (!f) return null;
                      const actual = a.actualCount || a.temporaryCount;
                      const boarding = f.passengerSources.boarding.breakdown;
                      const diff = actual.total - boarding.total;

                      return (
                        <tr
                          key={a.id}
                          onClick={() => navigateTo(`/manifest-hq/apb/${a.id}`)}
                          className={`${isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1A1D23]'} cursor-pointer transition duration-150`}
                        >
                          {/* Flight & APB Identification */}
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold uppercase font-mono text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {f.flightNumber}
                              </span>
                              <span className={`text-[9px] font-semibold px-1 py-0.2 rounded border ${
                                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10'
                              }`}>
                                {f.carrierCode}
                              </span>
                            </div>
                            <div className={`font-mono text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              {a.apbUniqueNumber}
                            </div>
                          </td>

                          {/* Date & Route */}
                          <td className="px-3 py-2.5">
                            <div className={`font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              {f.origin} ➔ {f.destination}
                            </div>
                            <div className={`font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              {f.flightDate}
                            </div>
                          </td>

                          {/* Passenger Breakdown (Actual, Boarding, Discrepancy) */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                              <span className={`font-bold ${isLight ? 'text-sky-700' : 'text-sky-400'}`} title="Actual Physical Count">
                                {actual.total}
                              </span>
                              <span className="text-slate-500">/</span>
                              <span className={isLight ? 'text-slate-700' : 'text-slate-300'} title="Boarding System Count">
                                {boarding.total}
                              </span>
                              <span className="text-slate-500">/</span>
                              <span
                                title="Variance (Diff)"
                                className={`font-bold px-1 rounded text-[10px] ${
                                  diff !== 0
                                    ? isLight
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-amber-500/20 text-amber-400'
                                    : isLight
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                            </div>
                          </td>

                          {/* Lead FA & Sender Info */}
                          <td className="px-3 py-2.5">
                            <div className={`font-medium text-xs truncate max-w-[140px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                              {a.flightAttendantVerification?.employeeName || 'Lead FA'}
                              {a.extraCrew > 0 && (
                                <span className="ml-1 text-[10px] text-amber-400 font-bold">
                                  (+{a.extraCrew} XC)
                                </span>
                              )}
                            </div>
                            <div className={`font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                              Via: {a.sentBy}
                            </div>
                          </td>

                          {/* Station Status */}
                          <td className="px-2.5 py-2.5 text-center">
                            <span className={`inline-block rounded px-1.5 py-0.5 text-[9px] font-bold border ${
                              isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                            }`}>
                              {a.manifestStationReview?.status === 'STATION_CHECKED' ? 'STN CHECKED' : a.manifestStationReview?.status || 'PENDING'}
                            </span>
                          </td>

                          {/* APB Status & Sync Status */}
                          <td className="px-2.5 py-2.5 text-xs">
                            {(() => {
                              const { primaryLabel, primaryColor, secondarySyncLabel, secondarySyncColor } = getSimplifiedAPBDisplay(a, contingencyState);
                              const primaryBadgeClass = primaryColor === 'emerald'
                                ? isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : primaryColor === 'rose'
                                ? isLight ? 'bg-rose-100 text-rose-800 border-rose-300' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'
                                : primaryColor === 'amber'
                                ? isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : primaryColor === 'cyan'
                                ? isLight ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                                : primaryColor === 'slate'
                                ? isLight ? 'bg-slate-100 text-slate-600 border-slate-300' : 'bg-white/5 text-slate-400 border-white/10'
                                : isLight ? 'bg-sky-100 text-sky-800 border-sky-300' : 'bg-sky-500/10 text-sky-400 border-sky-500/20';

                              const syncBadgeClass = secondarySyncColor === 'emerald'
                                ? isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-[#c4e830] border border-[#c4e830]/20'
                                : secondarySyncColor === 'amber'
                                ? isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse font-black'
                                : secondarySyncColor === 'sky'
                                ? isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-500/10 text-sky-400 border-sky-500/20 animate-pulse'
                                : secondarySyncColor === 'rose'
                                ? isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-500 border-white/5';

                              return (
                                <div className="flex flex-col gap-0.5 items-start">
                                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${primaryBadgeClass}`}>
                                    {primaryLabel}
                                  </span>
                                  <span className={`rounded px-1 py-0.2 text-[8px] font-bold uppercase border ${syncBadgeClass}`}>
                                    SYNC: {secondarySyncLabel}
                                  </span>
                                </div>
                              );
                            })()}
                          </td>

                          {/* Passenger Audit Status */}
                          <td className="px-2.5 py-2.5 text-center text-xs">
                            {(() => {
                              const isVerified = actual.total === boarding.total;
                              return isVerified ? (
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                  VERIFIED
                                </span>
                              ) : (
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${isLight ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse font-extrabold'}`}>
                                  REVIEW
                                </span>
                              );
                            })()}
                          </td>

                          {/* Action Button */}
                          <td className="px-2.5 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => navigateTo(`/manifest-hq/apb/${a.id}`)}
                              className={`rounded border px-2.5 py-1 text-[10px] font-bold transition duration-150 ${
                                isLight
                                  ? 'bg-white border-slate-300 hover:border-sky-600 text-slate-700 hover:text-slate-900 shadow-sm'
                                  : 'bg-[#1A1D23] border-white/10 hover:border-sky-500 text-slate-300 hover:text-white'
                              }`}
                            >
                              Audit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {filteredAPBs.length === 0 && (
                      <tr>
                        <td colSpan={8} className={`px-4 py-8 text-center font-bold ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                          No matching transmitted APBs found on global records.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Centered Focused Responsive Modal */}
      {isModalOpen && currentAPB && currentFlight && (() => {
        const actual = currentAPB.actualCount || currentAPB.temporaryCount;
        const boarding = currentFlight.passengerSources.boarding.breakdown;
        const diff = actual.total - boarding.total;

        const salesTotal = currentFlight.passengerSources?.sales?.breakdown?.total;
        const checkInTotal = currentFlight.passengerSources?.checkIn?.breakdown?.total;
        const boardingTotal = currentFlight.passengerSources?.boarding?.breakdown?.total;

        return (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-[fadeIn_0.15s_ease-out] select-none">
            <div 
              className={`w-full max-w-5xl max-h-[calc(100vh-24px)] sm:max-h-[calc(100vh-48px)] rounded-xl border shadow-2xl flex flex-col overflow-hidden select-text pointer-events-auto ${isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0F1117] border-white/10'}`}
              style={{ boxSizing: 'border-box' }}
            >
              {/* Sticky Header */}
              <div className={`sticky top-0 z-10 p-4 flex items-center justify-between flex-shrink-0 border-b ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0F1117] border-white/10'}`}>
                <h2 className={`text-sm sm:text-base font-black tracking-widest uppercase ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                  🏛 Global HQ Audit Desk
                </h2>
                <button
                  onClick={() => navigateTo('/manifest-hq')}
                  className={`rounded border px-2.5 py-1.5 text-xs font-bold transition ${isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'}`}
                >
                  CLOSE
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4">
                {/* Consolidated Overview grids */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Flight specs */}
                  <div className={`p-4 rounded-lg space-y-2 text-xs border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'}`}>
                    <h3 className={`font-black uppercase border-b pb-1.5 text-[10px] tracking-wider ${isLight ? 'text-sky-700 border-slate-200' : 'text-sky-400 border-white/5'}`}>
                      Flight & Aircraft Specification
                    </h3>
                    <div className={`grid grid-cols-2 gap-y-2 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Flight number:</span>
                      <span className={`font-bold text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentFlight.flightNumber}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Carrier specs:</span>
                      <span className={`text-right font-semibold ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentFlight.carrierCode}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Scheduled bounds:</span>
                      <span className={`text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentFlight.origin}➔{currentFlight.destination}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Gate:</span>
                      <span className={`text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>G-{currentFlight.gate}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>A/C registration:</span>
                      <span className={`font-mono text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {currentFlight.aircraft.type} ({currentFlight.aircraft.registration})
                      </span>
                    </div>
                  </div>

                  {/* Census comparison */}
                  <div className={`p-4 rounded-lg space-y-2 text-xs border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'}`}>
                    <h3 className={`font-black uppercase border-b pb-1.5 text-[10px] tracking-wider ${isLight ? 'text-sky-700 border-slate-200' : 'text-sky-400 border-white/5'}`}>
                      Physical APB Census Comparison
                    </h3>
                    <div className={`grid grid-cols-2 gap-y-2 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                      <span className={`${isLight ? 'text-slate-600' : 'text-slate-500'} font-bold`}>Physical Adults:</span>
                      <span className={`font-mono text-right font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{actual.adult}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Physical Children:</span>
                      <span className={`font-mono text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{actual.child}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Physical Infants:</span>
                      <span className={`font-mono text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{actual.infant}</span>
                      <span className={`font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>Total Physical Headcount:</span>
                      <span className={`font-mono font-black text-right text-sm ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                        {actual.total}
                      </span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Reference Boarding total:</span>
                      <span className={`font-mono text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{boarding.total}</span>
                      <span className={`font-bold uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>Net Variance:</span>
                      <span
                        className={`font-mono font-bold text-right ${
                          diff !== 0 ? (isLight ? 'text-amber-700' : 'text-amber-400') : (isLight ? 'text-emerald-700' : 'text-emerald-400')
                        }`}
                      >
                        {diff > 0 ? '+' : ''}
                        {diff}
                      </span>
                    </div>
                  </div>
                </div>

                {/* FA handshake details + station review */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-lg space-y-2 text-xs border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'}`}>
                    <h3 className={`font-black uppercase border-b pb-1.5 text-[10px] tracking-wider ${isLight ? 'text-sky-700 border-slate-200' : 'text-sky-400 border-white/5'}`}>
                      Onboard Cabin Attendant Handshake
                    </h3>
                    <div className={`grid grid-cols-2 gap-y-2 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Lead Cabin FA:</span>
                      <span className={`text-right font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentAPB.flightAttendantVerification?.employeeName}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Roster mapping:</span>
                      <span className={`text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentAPB.flightAttendantVerification?.crewStatus}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Verification handshake:</span>
                      <span className={`font-bold text-right ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>
                        {currentAPB.flightAttendantVerification?.pinStatus}
                      </span>
                    </div>
                  </div>

                  <div className={`p-4 rounded-lg space-y-2 text-xs border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'}`}>
                    <h3 className={`font-black uppercase border-b pb-1.5 text-[10px] tracking-wider ${isLight ? 'text-sky-700 border-slate-200' : 'text-sky-400 border-white/5'}`}>
                      Manifest Station Review & Comments
                    </h3>
                    <div className={`grid grid-cols-2 gap-y-2 ${isLight ? 'text-slate-800' : 'text-slate-300'}`}>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Review status:</span>
                      <span className={`text-right font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentAPB.manifestStationReview?.status || 'PENDING'}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Station Reviewer:</span>
                      <span className={`font-mono text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentAPB.manifestStationReview?.reviewerId || '—'}</span>
                      <span className={isLight ? 'text-slate-600' : 'text-slate-500'}>Station remarks:</span>
                      <span className={`text-right italic font-medium leading-relaxed truncate block max-w-[200px] ${isLight ? 'text-slate-900' : 'text-white'}`} title={currentAPB.manifestStationReview?.remarks || ''}>
                        "{currentAPB.manifestStationReview?.remarks || 'No comments added'}"
                      </span>
                    </div>
                  </div>
                </div>

                {/* PASSENGER RECONCILIATION AUDIT & OPERATIONAL AUDIT TIMELINE LAYER */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* PASSENGER RECONCILIATION AUDIT */}
                  <div className={`p-4 rounded-lg space-y-4 text-xs border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'}`}>
                    <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-white/5">
                      <h3 className={`font-black uppercase text-[11px] tracking-wider ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                        🔍 PASSENGER RECONCILIATION AUDIT
                      </h3>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                        actual.total === boarding.total
                          ? isLight ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isLight ? 'bg-rose-100 text-rose-800' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                      }`}>
                        STATUS: {actual.total === boarding.total ? 'VERIFIED' : 'REVIEW REQUIRED'}
                      </span>
                    </div>

                    {/* System Context Data Source Badges */}
                    <div className={`p-2 rounded text-[10px] space-y-1 ${isLight ? 'bg-slate-100/50' : 'bg-black/20'}`}>
                      <span className="font-extrabold uppercase text-[9px] text-slate-500 tracking-wider block">DATA SOURCE REGISTRY</span>
                      <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                        <div>
                          <span className="text-slate-400 block text-[8px]">FLIGHT & CREW:</span>
                          <strong className={isLight ? 'text-slate-800 font-bold' : 'text-slate-300 font-bold'}>AIMS Simulation</strong>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[8px]">PASSENGER DATA:</span>
                          <strong className={isLight ? 'text-slate-800 font-bold' : 'text-slate-300 font-bold'}>SABRE Simulation</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400 block text-[8px]">APB PROCESSING:</span>
                          <strong className={isLight ? 'text-slate-800 font-bold' : 'text-slate-300 font-bold'}>MAVIS Operational Engine</strong>
                        </div>
                      </div>
                    </div>

                    {/* Flight ID and Route info */}
                    <div className="grid grid-cols-3 gap-2 text-center py-1 border-b border-slate-200 dark:border-white/5">
                      <div>
                        <span className="text-slate-500 block text-[9px] font-bold">FLIGHT</span>
                        <strong className={isLight ? 'text-slate-800 font-mono' : 'text-white font-mono'}>{currentFlight.flightNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] font-bold">ROUTE</span>
                        <strong className={isLight ? 'text-slate-800 font-mono uppercase' : 'text-white font-mono uppercase'}>{currentFlight.origin} → {currentFlight.destination}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[9px] font-bold">DATE</span>
                        <strong className={isLight ? 'text-slate-800 font-mono' : 'text-white font-mono'}>{currentFlight.flightDate}</strong>
                      </div>
                    </div>

                    {/* Timeline List of Sources */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">SABRE SALES:</span>
                        <span className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {salesTotal !== undefined && salesTotal !== null ? `${salesTotal} Pax` : 'NOT AVAILABLE'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">SABRE CHECK-IN:</span>
                        <span className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {checkInTotal !== undefined && checkInTotal !== null ? `${checkInTotal} Pax` : 'NOT AVAILABLE'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">BOARDING FINAL:</span>
                        <span className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {boardingTotal !== undefined && boardingTotal !== null ? `${boardingTotal} Pax` : 'NOT AVAILABLE'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1 border-b border-slate-200 dark:border-white/5">
                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">FA ACTUAL COUNT:</span>
                        <span className={`font-mono font-bold text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {actual.total} Pax
                        </span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-sky-400 font-bold uppercase tracking-wider text-[10px]">FINAL APB:</span>
                        <span className="font-mono font-black text-xs text-sky-400">
                          {currentAPB.actualCount ? `${currentAPB.actualCount.total} Pax` : `${actual.total} Pax (DRAFT)`}
                        </span>
                      </div>
                    </div>

                    {/* Variances */}
                    <div className={`p-3 rounded-lg border space-y-2 ${isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-black/20 border-white/5'}`}>
                      <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">RECONCILIATION VARIANCES</span>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Sales vs Boarding:</span>
                        <strong className={`font-mono text-xs ${
                          salesTotal !== undefined && boardingTotal !== undefined
                            ? (boardingTotal - salesTotal === 0 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-extrabold')
                            : 'text-slate-400'
                        }`}>
                          {salesTotal !== undefined && boardingTotal !== undefined
                            ? `${boardingTotal - salesTotal > 0 ? '+' : ''}${boardingTotal - salesTotal} Pax`
                            : 'NOT AVAILABLE'}
                        </strong>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Check-in vs Boarding:</span>
                        <strong className={`font-mono text-xs ${
                          checkInTotal !== undefined && boardingTotal !== undefined
                            ? (boardingTotal - checkInTotal === 0 ? 'text-emerald-500 font-bold' : 'text-amber-500 font-extrabold')
                            : 'text-slate-400'
                        }`}>
                          {checkInTotal !== undefined && boardingTotal !== undefined
                            ? `${boardingTotal - checkInTotal > 0 ? '+' : ''}${boardingTotal - checkInTotal} Pax`
                            : 'NOT AVAILABLE'}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* EVENT-BASED TIMELINE */}
                  <div className={`p-4 rounded-lg space-y-4 text-xs border flex flex-col h-auto min-h-0 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'}`}>
                    {(() => {
                      const uEvents: Array<{
                        id: string;
                        source: 'AIMS Simulation' | 'SABRE Simulation' | 'MAVIS Operational Engine';
                        timestamp: string | null;
                        title: string;
                        detail: string;
                        paxCount?: number;
                      }> = [
                        {
                          id: 'aims-created',
                          source: 'AIMS Simulation',
                          timestamp: currentFlight.aimsCreatedUtc || null,
                          title: 'Flight created',
                          detail: `Route initialized ${currentFlight.origin}➔${currentFlight.destination}`,
                        },
                        {
                          id: 'aims-assigned',
                          source: 'AIMS Simulation',
                          timestamp: currentFlight.aimsAircraftAssignedUtc || null,
                          title: 'Aircraft assigned',
                          detail: `${currentFlight.aircraft.type} (${currentFlight.aircraft.registration})`,
                        },
                        {
                          id: 'aims-crew',
                          source: 'AIMS Simulation',
                          timestamp: currentFlight.aimsCrewRosterVerifiedUtc || null,
                          title: 'Crew roster verified',
                          detail: `${currentFlight.crewRoster?.length || 0} crew members assigned to schedule`,
                        },
                        {
                          id: 'sabre-sales',
                          source: 'SABRE Simulation',
                          timestamp: currentFlight.passengerSources?.sales?.updatedAt || null,
                          title: 'Sales snapshot received',
                          paxCount: salesTotal,
                          detail: `${salesTotal !== undefined ? `${salesTotal} Pax booked` : 'NOT AVAILABLE'}`,
                        },
                        {
                          id: 'sabre-checkin',
                          source: 'SABRE Simulation',
                          timestamp: (['SCHEDULED', 'CANCELLED'].includes(currentFlight.movementStatus) || !currentFlight.passengerSources?.checkIn?.updatedAt)
                            ? null
                            : currentFlight.passengerSources.checkIn.updatedAt,
                          title: (['SCHEDULED', 'CANCELLED'].includes(currentFlight.movementStatus) || !currentFlight.passengerSources?.checkIn?.updatedAt)
                            ? 'Check-in pending'
                            : (currentFlight.movementStatus === 'CHECK_IN' ? 'Check-in in progress' : 'Check-in completed'),
                          paxCount: (['SCHEDULED', 'CANCELLED'].includes(currentFlight.movementStatus) || !currentFlight.passengerSources?.checkIn?.updatedAt)
                            ? undefined
                            : checkInTotal,
                          detail: (['SCHEDULED', 'CANCELLED'].includes(currentFlight.movementStatus) || !currentFlight.passengerSources?.checkIn?.updatedAt)
                            ? 'NOT AVAILABLE'
                            : `${checkInTotal !== undefined ? `${checkInTotal} Pax checked in` : 'NOT AVAILABLE'}`,
                        },
                        {
                          id: 'sabre-boarding',
                          source: 'SABRE Simulation',
                          timestamp: (['SCHEDULED', 'CHECK_IN', 'CANCELLED'].includes(currentFlight.movementStatus) || !currentFlight.passengerSources?.boarding?.updatedAt)
                            ? null
                            : currentFlight.passengerSources.boarding.updatedAt,
                          title: (['SCHEDULED', 'CHECK_IN', 'CANCELLED'].includes(currentFlight.movementStatus) || !currentFlight.passengerSources?.boarding?.updatedAt)
                            ? 'Boarding pending'
                            : (currentFlight.movementStatus === 'BOARDING' ? 'Boarding in progress' : 'Boarding completed'),
                          paxCount: (['SCHEDULED', 'CHECK_IN', 'CANCELLED'].includes(currentFlight.movementStatus) || !currentFlight.passengerSources?.boarding?.updatedAt)
                            ? undefined
                            : boardingTotal,
                          detail: (['SCHEDULED', 'CHECK_IN', 'CANCELLED'].includes(currentFlight.movementStatus) || !currentFlight.passengerSources?.boarding?.updatedAt)
                            ? 'NOT AVAILABLE'
                            : `${boardingTotal !== undefined ? `${boardingTotal} Pax final boarded` : 'NOT AVAILABLE'}`,
                        },
                        {
                          id: 'mavis-prepared',
                          source: 'MAVIS Operational Engine',
                          timestamp: currentAPB.preparedAt || null,
                          title: 'APB prepared in system',
                          detail: `Draft generated by ${currentAPB.preparedBy || 'Flight Operations Interface'}`,
                        }
                      ];

                      if (currentAPB.flightAttendantSubmittedAt) {
                        uEvents.push({
                          id: 'mavis-submitted',
                          source: 'MAVIS Operational Engine',
                          timestamp: currentAPB.flightAttendantSubmittedAt,
                          title: 'FA submitted APB',
                          paxCount: currentAPB.actualCount?.total ?? actual.total,
                          detail: 'Cabin headcount verification by Senior FA',
                        });
                      }

                      if (currentAPB.manifestStationReview?.reviewedAt) {
                        uEvents.push({
                          id: 'mavis-station-approved',
                          source: 'MAVIS Operational Engine',
                          timestamp: currentAPB.manifestStationReview.reviewedAt,
                          title: 'Manifest Station approved',
                          detail: `Reviewed by ${currentAPB.manifestStationReview.reviewerId}. Remarks: "${currentAPB.manifestStationReview.remarks || 'No remarks'}"`,
                        });
                      }

                      if (currentAPB.manifestHQReview?.reviewedAt) {
                        uEvents.push({
                          id: 'mavis-hq-verified',
                          source: 'MAVIS Operational Engine',
                          timestamp: currentAPB.manifestHQReview.reviewedAt,
                          title: 'Manifest HQ verified',
                          detail: `Reviewed by ${currentAPB.manifestHQReview.reviewerId}. Remarks: "${currentAPB.manifestHQReview.remarks || 'No remarks'}"`,
                        });
                      }

                      if (currentAPB.returnedAt) {
                        uEvents.push({
                          id: 'mavis-returned',
                          source: 'MAVIS Operational Engine',
                          timestamp: currentAPB.returnedAt,
                          title: 'APB returned for rework',
                          detail: `Returned by ${currentAPB.returnedBy || 'HQ'}. Reason: "${currentAPB.returnReason || 'Rework requested'}"`,
                        });
                      }

                      if (currentAPB.reworkAudit?.timestamp) {
                        uEvents.push({
                          id: 'mavis-reconciled',
                          source: 'MAVIS Operational Engine',
                          timestamp: currentAPB.reworkAudit.timestamp,
                          title: 'APB corrected & reconciled',
                          detail: `Correction: "${currentAPB.reworkAudit.correctionReason}". Prev: ${currentAPB.reworkAudit.previousCount.total}, Sab: ${currentAPB.reworkAudit.verifiedSabreCount.total}`,
                        });
                      }

                      const sortedEvents = [...uEvents].sort((a, b) => {
                        if (!a.timestamp) return 1;
                        if (!b.timestamp) return -1;
                        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                      });

                      return (
                        <>
                          <div className="flex justify-between items-center border-b pb-2 border-slate-200 dark:border-white/5">
                            <h3 className={`font-black uppercase text-[11px] tracking-wider ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                              ⏳ {currentFlight.flightNumber} AUDIT HISTORY
                            </h3>
                            <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold uppercase tracking-wider ${isLight ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-slate-400'}`}>
                              {sortedEvents.length} Events
                            </span>
                          </div>

                          <div className="relative border-l pl-4 ml-2 space-y-4 py-1 overflow-y-auto max-h-[360px] h-auto min-h-0 border-slate-200 dark:border-white/5">
                            {sortedEvents.map((ev) => {
                              let sourceColor = '';
                              if (ev.source === 'AIMS Simulation') {
                                sourceColor = isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-500/10 text-sky-400 border-sky-500/20';
                              } else if (ev.source === 'SABRE Simulation') {
                                sourceColor = isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
                              } else {
                                sourceColor = isLight ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
                              }

                              return (
                                <div key={ev.id} className="relative">
                                  <span className={`absolute -left-[21px] top-1 flex h-2 w-2 items-center justify-center rounded-full border ${
                                    ev.source === 'AIMS Simulation' ? 'border-sky-500 bg-sky-500' :
                                    ev.source === 'SABRE Simulation' ? 'border-indigo-500 bg-indigo-500' :
                                    'border-emerald-500 bg-emerald-500'
                                  }`} />
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-bold uppercase border ${sourceColor}`}>
                                        {ev.source}
                                      </span>
                                      <span className="font-mono text-[9px] text-slate-400 font-extrabold">
                                        {formatTimelineTime(ev.timestamp)}
                                      </span>
                                    </div>
                                    <p className={`font-bold text-[11px] ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                      {ev.title}
                                      {ev.paxCount !== undefined && (
                                        <span className={`ml-1.5 font-mono text-[10px] font-extrabold ${isLight ? 'text-sky-700' : 'text-sky-400'}`}>
                                          ({ev.paxCount} Pax)
                                        </span>
                                      )}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-medium">
                                      {ev.detail}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}

                    {/* AUDIT RESULT Section */}
                    <div className={`p-3 rounded border space-y-1.5 mt-auto ${isLight ? 'bg-slate-100/50 border-slate-200' : 'bg-black/20 border-white/5'}`}>
                      <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">AUDIT RESULT</span>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400 font-semibold">Passenger variance:</span>
                        <span className={`font-mono font-black ${diff !== 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {diff > 0 ? '+' : ''}{diff} Pax
                        </span>
                      </div>
                      <div className="text-xs">
                        <span className="text-slate-400 font-semibold block mb-0.5">Resolution:</span>
                        <p className={`font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {diff === 0 
                            ? 'Reconciliation successful. Passenger counts verified and match.' 
                            : currentAPB.reworkAudit?.correctionReason 
                            ? `Reconciliation adjusted: ${currentAPB.reworkAudit.correctionReason}`
                            : 'Passenger offloaded after boarding reconciliation.'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Operational Audit Timeline */}
                <APBAuditTimeline
                  apb={currentAPB}
                  showAddInput={true}
                  theme={theme}
                  onAddNote={(text) => addAPBNote(currentAPB.id, text, 'Manifest HQ', 'MHQ-001', 'Synth Manifest HQ Auditor', 'GENERAL_NOTE')}
                />

                {/* Audit Remarks */}
                <div className="space-y-1">
                  <label className={`text-xs uppercase font-bold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-500'}`}>HQ Audit Remarks</label>
                  <textarea
                    value={hqRemark}
                    onChange={(e) => setHqRemark(e.target.value)}
                    placeholder="Write general audit clearance notes or instructions before finalizing process..."
                    className={`w-full rounded border py-2 px-3 text-xs outline-none focus:border-sky-500 min-h-[60px] ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                        : 'bg-[#1A1D23] border-white/10 text-white placeholder-slate-500 focus:border-sky-500/50'
                    }`}
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className={`sticky bottom-0 z-10 p-4 flex flex-wrap gap-3 items-center justify-between flex-shrink-0 border-t ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0F1117] border-white/10'}`}>
                <button
                  onClick={() => navigateTo('/manifest-hq')}
                  className={`rounded border px-5 py-2.5 text-xs font-bold transition uppercase ${
                    isLight
                      ? 'border-slate-300 text-slate-700 hover:text-slate-900 hover:bg-slate-200/60'
                      : 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  BACK TO MONITOR
                </button>

                {(() => {
                  const isAwaitingStation = currentAPB.status === 'SENT_TO_SERVER' ||
                    currentAPB.status === 'RETURNED_TO_FLIGHT_OPERATIONS' ||
                    currentAPB.status === 'RETURNED_TO_FLIGHT_ATTENDANT';

                  if (isAwaitingStation) {
                    return (
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1.5 rounded text-xs font-bold border flex items-center gap-1.5 ${
                          isLight
                            ? 'bg-amber-100 border-amber-300 text-amber-900'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          AWAITING MANIFEST STATION FORWARDING ({currentFlight.origin})
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={async () => {
                          const transition = transitionAPB(currentAPB.status, 'HQ_RETURN_TO_STATION');
                          if (!transition.ok) {
                            addToast(transition.error || 'Cannot return to station from current status', 'error');
                            return;
                          }

                          const noteText = hqRemark || 'Discrepancy audit return: Sent back to Station review phase';
                          const newNote = {
                            apbUniqueNumber: currentAPB.apbUniqueNumber,
                            apbVersion: currentAPB.previousActualCounts.length + 1,
                            noteText: noteText,
                            authorEmployeeId: 'MHQ-001',
                            authorName: 'Synth Manifest HQ Auditor',
                            role: 'Manifest HQ',
                            station: currentFlight.origin,
                            utcTimestamp: new Date().toISOString(),
                            localTimestamp: new Date().toString(),
                            eventType: 'RETURN_TO_STATION',
                            syncStatus: 'SYNCHRONIZED' as const,
                          };
                          const newReturnCycle: APBReturnCycle = {
                            originalSubmissionAt: currentAPB.sentAt || new Date().toISOString(),
                            returnedAt: new Date().toISOString(),
                            returnReason: 'Discrepancy audit return from HQ',
                            returnedBy: 'MHQ-001',
                            returnNotes: noteText,
                            reviewerAction: 'RETURNED',
                          };
                          const updatedAPB: DigitalAPB = {
                            ...currentAPB,
                            status: transition.nextStatus,
                            reworkStatus: 'RETURNED',
                            reworkReviewStatus: 'RETURNED',
                            returnReason: 'Discrepancy audit return from HQ',
                            returnedBy: 'MHQ-001',
                            returnedAt: new Date().toISOString(),
                            returnNotes: noteText,
                            returnHistory: [...(currentAPB.returnHistory || []), newReturnCycle],
                            manifestHQReview: {
                              reviewerId: 'MHQ-001',
                              status: 'RETURNED_TO_MS',
                              remarks: noteText,
                              reviewedAt: new Date().toISOString(),
                            },
                            notes: [...(currentAPB.notes || []), newNote],
                          };
                          await saveAPB(updatedAPB);
                          await refreshData();
                          setHqRemark('');
                          addToast('APB returned to Manifest Station for correction', 'warning');
                          navigateTo('/manifest-hq');
                        }}
                        className={`rounded border py-2.5 px-4 text-xs font-bold uppercase transition ${
                          isLight
                            ? 'border-rose-400 bg-rose-50 hover:bg-rose-100 text-rose-700'
                            : 'border-rose-500 hover:bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        RETURN TO STATION
                      </button>

                      <button
                        onClick={async () => {
                          const transition = transitionAPB(currentAPB.status, 'HQ_APPROVE');
                          if (!transition.ok) {
                            addToast(transition.error || 'Cannot mark HQ reviewed from current status', 'error');
                            return;
                          }

                          const noteText = hqRemark || 'Reviewed clean by HQ Registry';
                          const newNote = {
                            apbUniqueNumber: currentAPB.apbUniqueNumber,
                            apbVersion: currentAPB.previousActualCounts.length + 1,
                            noteText: noteText,
                            authorEmployeeId: 'MHQ-001',
                            authorName: 'Synth Manifest HQ Auditor',
                            role: 'Manifest HQ',
                            station: currentFlight.origin,
                            utcTimestamp: new Date().toISOString(),
                            localTimestamp: new Date().toString(),
                            eventType: 'HQ_REVIEWED',
                            syncStatus: 'SYNCHRONIZED' as const,
                          };
                          const updatedAPB: DigitalAPB = {
                            ...currentAPB,
                            status: transition.nextStatus,
                            manifestHQReview: {
                              reviewerId: 'MHQ-001',
                              status: 'HQ_REVIEWED',
                              remarks: noteText,
                              reviewedAt: new Date().toISOString(),
                            },
                            notes: [...(currentAPB.notes || []), newNote],
                          };
                          await saveAPB(updatedAPB);
                          await refreshData();
                          setHqRemark('');
                          addToast('APB marked reviewed by HQ', 'success');
                          navigateTo('/manifest-hq');
                        }}
                        className={`rounded border py-2.5 px-4 text-xs font-bold uppercase transition ${
                          isLight
                            ? 'border-slate-300 bg-white text-slate-800 hover:bg-slate-100 shadow-sm'
                            : 'border-white/10 text-white hover:bg-white/5'
                        }`}
                      >
                        ✅ MARK AS HQ REVIEWED
                      </button>

                      <button
                        onClick={async () => {
                          const transition = transitionAPB(currentAPB.status, 'HQ_COMPLETE');
                          if (!transition.ok) {
                            addToast(transition.error || 'Cannot complete process from current status', 'error');
                            return;
                          }

                          const noteText = hqRemark || 'Process fully closed and archived';
                          const newNote = {
                            apbUniqueNumber: currentAPB.apbUniqueNumber,
                            apbVersion: currentAPB.previousActualCounts.length + 1,
                            noteText: noteText,
                            authorEmployeeId: 'MHQ-001',
                            authorName: 'Synth Manifest HQ Auditor',
                            role: 'Manifest HQ',
                            station: currentFlight.origin,
                            utcTimestamp: new Date().toISOString(),
                            localTimestamp: new Date().toString(),
                            eventType: 'COMPLETED',
                            syncStatus: 'SYNCHRONIZED' as const,
                          };
                          const updatedAPB: DigitalAPB = {
                            ...currentAPB,
                            status: transition.nextStatus,
                            manifestHQReview: {
                              reviewerId: 'MHQ-001',
                              status: 'COMPLETED',
                              remarks: noteText,
                              reviewedAt: new Date().toISOString(),
                            },
                            notes: [...(currentAPB.notes || []), newNote],
                          };
                          const updatedFlight: Flight = {
                            ...currentFlight,
                            movementStatus: 'COMPLETED',
                          };
                          await saveFlight(updatedFlight);
                          await saveAPB(updatedAPB);
                          await refreshData();
                          setHqRemark('');
                          addToast('🏁 Manifest process marked COMPLETED and archived', 'success');
                          navigateTo('/manifest-hq');
                        }}
                        className="rounded bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 px-5 text-xs uppercase shadow-sm transition"
                      >
                        🏁 MARK PROCESS COMPLETED
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
