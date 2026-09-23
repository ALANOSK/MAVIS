/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Flight, DigitalAPB, StationCode, getAPBStatusLayers, getSimplifiedAPBDisplay, APBReturnCycle } from '../types';
import { ArrowLeft } from 'lucide-react';
import APBAuditTimeline from './APBAuditTimeline';
import { transitionAPB } from '../lib/apbStateMachine';

interface ManifestStationPageProps {
  theme?: 'dark' | 'light';
  currentStation: StationCode;
  currentRoute: string;
  flights: Flight[];
  apbs: DigitalAPB[];
  msRemark: string;
  setMsRemark: (val: string) => void;
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
  contingencyState?: 'LIVE' | 'CACHE_AVAILABLE' | 'NO_CACHE' | 'RECONCILING';
}

export default function ManifestStationPage({
  theme = 'dark',
  currentStation,
  currentRoute,
  flights,
  apbs,
  msRemark,
  setMsRemark,
  addToast,
  saveAPB,
  refreshData,
  navigateTo,
  addAPBNote,
  contingencyState = 'LIVE',
}: ManifestStationPageProps) {
  const isLight = theme === 'light';

  // Local state for the custom APB return sub-form
  const [isReturning, setIsReturning] = React.useState(false);
  const [returnReason, setReturnReason] = React.useState('Passenger headcount mismatch');
  const [returnNotes, setReturnNotes] = React.useState('');

  // Extract APB ID from route if present
  const parts = currentRoute.split('/');
  let apbId = '';
  if (currentRoute.includes('/manifest-station/apb/')) {
    const idx = parts.indexOf('apb');
    if (idx !== -1 && parts[idx + 1]) {
      apbId = parts[idx + 1];
    }
  }

  const currentAPB = apbs.find((a) => a.id === apbId);
  const currentFlight = currentAPB ? flights.find((f) => f.id === currentAPB.flightId) : null;

  // Reset state on APB change
  React.useEffect(() => {
    setIsReturning(false);
    setReturnReason('Passenger headcount mismatch');
    setReturnNotes('');
  }, [apbId]);

  // Filter APBs received by station
  const filteredAPBs = apbs.filter((a) => {
    const { syncStatus: layerSyncStatus } = getAPBStatusLayers(a, contingencyState);
    if (a.serverStatus !== 'SENT' && layerSyncStatus !== 'PENDING_SYNC' && layerSyncStatus !== 'SYNCING') return false;
    const f = flights.find((fl) => fl.id === a.flightId);
    if (!f) return false;

    // relate to active station bounds
    const isRelated = f.origin === currentStation || f.destination === currentStation;
    if (!isRelated) return false;

    return ['SENT_TO_SERVER', 'RETURNED_TO_FLIGHT_OPERATIONS', 'RETURNED_TO_MANIFEST_STATION', 'STATION_CHECKED', 'PENDING_HQ_REVIEW', 'HQ_REVIEWED', 'COMPLETED'].includes(a.status);
  });

  const isDetailView = currentRoute.startsWith('/manifest-station/apb/') && !!currentAPB;
  const isModalOpen = !!(isDetailView && currentAPB && currentFlight);

  return (
    <div className={`relative flex-1 flex flex-col min-h-0 min-w-0 overflow-y-auto ${isLight ? 'bg-slate-100 text-slate-900' : ''}`}>
      {/* Background: Manifest Station APB List */}
      <div className={`transition-all duration-300 flex-1 flex flex-col min-h-0 min-w-0 ${isModalOpen ? 'filter blur-md pointer-events-none opacity-35 select-none' : ''}`}>
        <div id="manifest-station-list" className="flex-1 p-5 max-w-7xl w-full mx-auto space-y-4">
          <div className={`flex items-center justify-between border-b pb-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div className="space-y-1">
              <h2 className={`text-base font-black tracking-widest uppercase ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>
                📋 MANIFEST STATION ({currentStation})
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Audit server-acknowledged physical count APBs matching flight routes.
              </p>
            </div>
            <span className="text-xs text-slate-500 font-mono">STATION BOUNDS ENABLED</span>
          </div>

          <div className="w-full overflow-x-auto rounded-lg">
            <table className="w-full text-xs text-left table-auto">
              <thead>
                <tr className={`uppercase font-bold text-[10px] tracking-wider border-b ${
                  isLight ? 'bg-slate-100/80 text-slate-700 border-slate-200' : 'bg-[#1A1D23]/90 text-slate-400 border-white/10'
                }`}>
                  <th className="px-3 py-3 whitespace-nowrap">Flight / APB #</th>
                  <th className="px-3 py-3 whitespace-nowrap">Date & Route</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">Pax Breakdown (ADT/CHD/INF)</th>
                  <th className="px-3 py-3 whitespace-nowrap">Cabin Lead / Time</th>
                  <th className="px-3 py-3 whitespace-nowrap">Review State</th>
                  <th className="px-3 py-3 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-white/10 text-slate-300'}`}>
                {filteredAPBs.map((a) => {
                  const f = flights.find((fl) => fl.id === a.flightId);
                  if (!f) return null;
                  const actual = a.actualCount || a.temporaryCount;

                  return (
                    <tr
                      key={a.id}
                      onClick={() => navigateTo(`/manifest-station/apb/${a.id}`)}
                      className={`cursor-pointer transition duration-150 ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1A1D23]'
                      }`}
                    >
                      <td className="px-3 py-2.5">
                        <div className={`font-bold uppercase font-mono text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {f.flightNumber}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500 mt-0.5">
                          {a.apbUniqueNumber}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className={`font-semibold text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                          {f.origin} ➔ {f.destination}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {f.flightDate}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <span className={`font-bold text-sm ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>
                            {actual.total}
                          </span>
                          <span className="text-slate-500 text-[10px]">
                            ({actual.adult}A / {actual.child}C / {actual.infant}I)
                          </span>
                          {a.extraCrew > 0 && (
                            <span className="text-[10px] text-amber-400 font-bold ml-1">
                              +{a.extraCrew} XC
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className={`font-medium text-xs truncate max-w-[150px] ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {a.flightAttendantVerification?.employeeName || 'Cabin Lead'}
                        </div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {a.sentAt ? new Date(a.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs">
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
                      <td className="px-3 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigateTo(`/manifest-station/apb/${a.id}`)}
                          className={`rounded border px-2.5 py-1 text-[10px] font-bold transition duration-150 ${
                            isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800' : 'bg-[#1A1D23] border-white/10 hover:border-sky-500 text-slate-400 hover:text-white'
                          }`}
                        >
                          {(() => {
                            const { reworkStatus } = getAPBStatusLayers(a, contingencyState);
                            return reworkStatus === 'RETURNED' ? 'Review Again' : 'Review';
                          })()}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredAPBs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500 font-bold">
                      No final server-acknowledged APBs match station bounds.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Centered Focused Responsive Modal */}
      {isModalOpen && currentAPB && currentFlight && (() => {
        const actual = currentAPB.actualCount || currentAPB.temporaryCount;
        const boarding = currentFlight.passengerSources.boarding.breakdown;
        const variance = actual.total - boarding.total;

        return (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-[fadeIn_0.15s_ease-out] select-none">
            <div 
              className={`w-[min(1100px,calc(100vw-16px))] sm:w-[min(1100px,calc(100vw-32px))] max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-32px)] h-auto min-w-0 min-h-0 rounded-xl border shadow-2xl flex flex-col overflow-hidden select-text pointer-events-auto ${
                isLight ? 'bg-white border-slate-300' : 'bg-[#0F1117] border-white/10'
              }`}
              style={{ boxSizing: 'border-box' }}
            >
              {/* Sticky Header */}
              <div className={`sticky top-0 z-10 border-b p-4 flex items-center justify-between flex-shrink-0 ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
              }`}>
                <h2 className={`text-sm sm:text-base font-black tracking-widest uppercase ${
                  isLight ? 'text-sky-800' : 'text-sky-400'
                }`}>
                  🔍 Station Review Panel
                </h2>
                <button
                  onClick={() => navigateTo('/manifest-station')}
                  className={`rounded border px-2.5 py-1.5 text-xs font-bold transition ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:text-white text-slate-300'
                  }`}
                >
                  CLOSE
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4">
                {/* General Flight Specs */}
                <div className={`border p-4 rounded-lg text-xs space-y-1.5 ${
                  isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                }`}>
                  <div className={`font-bold tracking-wider text-[11px] uppercase ${
                    isLight ? 'text-sky-800' : 'text-sky-400'
                  }`}>
                    APB REFERENCE: {currentAPB.apbUniqueNumber}
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Flight ID: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{currentFlight.flightNumber}</strong> | Route Bounds: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{currentFlight.origin} - {currentFlight.destination}</strong> | Total Capacity Limit: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{currentFlight.aircraft.capacity} ({currentFlight.aircraft.type})</strong>
                  </p>
                </div>

                {/* Comparison Census blocks */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className={`border p-3 rounded-lg text-center ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                  }`}>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Actual Count Tally</span>
                    <span className={`font-mono text-lg sm:text-xl font-black mt-1 block ${isLight ? 'text-slate-900' : 'text-white'}`}>{actual.total}</span>
                  </div>
                  <div className={`border p-3 rounded-lg text-center ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                  }`}>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Reference Boarding</span>
                    <span className={`font-mono text-lg sm:text-xl font-black mt-1 block ${isLight ? 'text-slate-900' : 'text-white'}`}>{boarding.total}</span>
                  </div>
                  <div className={`border p-3 rounded-lg text-center ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                  }`}>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Net Variance</span>
                    <span
                      className={`font-mono text-lg sm:text-xl font-black mt-1 block ${
                        variance !== 0 ? (isLight ? 'text-amber-700' : 'text-amber-400') : (isLight ? 'text-emerald-700' : 'text-emerald-400')
                      }`}
                    >
                      {variance > 0 ? '+' : ''}
                      {variance}
                    </span>
                  </div>
                  <div className={`border p-3 rounded-lg text-center ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                  }`}>
                    <span className="text-slate-500 uppercase block text-[9px] font-bold">Verification Handshake</span>
                    <span className={`font-mono text-xs sm:text-sm font-black uppercase mt-1.5 block truncate ${
                      isLight ? 'text-emerald-700' : 'text-emerald-400'
                    }`}>
                      {currentAPB.flightAttendantVerification?.pinStatus.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>

                {/* Operational Audit Timeline */}
                <APBAuditTimeline
                  apb={currentAPB}
                  showAddInput={true}
                  onAddNote={(text) => addAPBNote(currentAPB.id, text, 'Manifest Station', `MS-${currentStation}-001`, 'Synth Manifest Station Reviewer', 'GENERAL_NOTE')}
                  theme={theme}
                />

                {/* Remarks Input */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 uppercase tracking-wide font-bold">
                    Manifest Station Remarks / Audit Log Notes
                  </label>
                  <textarea
                    value={msRemark}
                    onChange={(e) => setMsRemark(e.target.value)}
                    placeholder="Add specific comments about passenger variance, manual headcounts, or cabin rosters..."
                    className={`w-full rounded border py-2 px-3 text-xs outline-none focus:border-sky-500/50 min-h-[60px] ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#1A1D23] border-white/10 text-white'
                    }`}
                  />
                </div>
              </div>

              {/* Sticky Footer */}
              <div className={`sticky bottom-0 z-10 border-t p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between flex-shrink-0 ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
              }`}>
                <button
                  onClick={() => navigateTo('/manifest-station')}
                  className={`rounded border px-5 py-2.5 text-xs font-bold transition uppercase text-center ${
                    isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'border border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  BACK TO LIST
                </button>

                {isReturning ? (
                  <div className={`w-full flex flex-col gap-3 p-4 rounded-xl border mt-2 ${
                    isLight ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-sm' : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  }`}>
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
                        🚨 SPECIFY DISCREPANCY REASON & INSTRUCTIONS
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold">Category Reason</label>
                        <select
                          value={returnReason}
                          onChange={(e) => setReturnReason(e.target.value)}
                          className={`rounded border py-1.5 px-2.5 text-xs outline-none focus:border-rose-500/50 ${
                            isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0F1117] border-white/10 text-white'
                          }`}
                        >
                          <option value="Passenger headcount mismatch">Passenger headcount mismatch</option>
                          <option value="Incorrect extra crew count">Incorrect extra crew count</option>
                          <option value="Verification PIN anomaly">Verification PIN anomaly</option>
                          <option value="Missing operational signatures">Missing operational signatures</option>
                          <option value="Other audit discrepancies">Other audit discrepancies</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold">Returned By Personnel ID</label>
                        <input
                          type="text"
                          readOnly
                          value={`MS-${currentStation}-001`}
                          className={`rounded border py-1.5 px-2.5 text-xs outline-none ${
                            isLight ? 'bg-slate-100 border-slate-300 text-slate-500' : 'bg-[#1A1D23] border-white/10 text-slate-400'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-500 uppercase font-bold">Reviewer Instructions / Discrepancy details</label>
                      <textarea
                        value={returnNotes}
                        onChange={(e) => setReturnNotes(e.target.value)}
                        placeholder="Detail the expected headcount vs what was submitted and specify areas for Cabin Crew to recount (e.g. Row 10-15 infants checked)..."
                        className={`rounded border py-2 px-3 text-xs outline-none focus:border-rose-500/50 min-h-[60px] ${
                          isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#1A1D23] border-white/10 text-white'
                        }`}
                      />
                    </div>

                    <div className="flex gap-2 justify-end mt-1">
                      <button
                        type="button"
                        onClick={() => setIsReturning(false)}
                        className={`rounded border px-4 py-2 text-xs font-bold transition uppercase ${
                          isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                        }`}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          const noteText = returnNotes || msRemark || `Discrepancy: ${returnReason}`;
                          const newNote = {
                            apbUniqueNumber: currentAPB.apbUniqueNumber,
                            apbVersion: currentAPB.previousActualCounts.length + 1,
                            noteText: `Returned to Flight Operations. Reason: ${returnReason}. Notes: ${noteText}`,
                            authorEmployeeId: `MS-${currentStation}-001`,
                            authorName: 'Synth Manifest Station Reviewer',
                            role: 'Manifest Station',
                            station: currentStation,
                            utcTimestamp: new Date().toISOString(),
                            localTimestamp: new Date().toString(),
                            eventType: 'RETURN_TO_FO',
                            syncStatus: 'SYNCHRONIZED' as const,
                          };

                          const transition = transitionAPB(currentAPB.status, 'STATION_RETURN_TO_FO');
                          if (!transition.ok) {
                            addToast(transition.error || 'Invalid status transition for return', 'error');
                            return;
                          }

                          const newReturnCycle: APBReturnCycle = {
                            originalSubmissionAt: currentAPB.sentAt || new Date().toISOString(),
                            returnedAt: new Date().toISOString(),
                            returnReason: returnReason,
                            returnedBy: `MS-${currentStation}-001`,
                            returnNotes: noteText,
                            reviewerAction: 'RETURNED'
                          };

                          const updatedHistory = [...(currentAPB.returnHistory || []), newReturnCycle];

                          const updatedAPB: DigitalAPB = {
                            ...currentAPB,
                            status: transition.nextStatus,
                            reworkStatus: 'RETURNED',
                            reworkReviewStatus: 'RETURNED',
                            returnReason: returnReason,
                            returnedBy: `MS-${currentStation}-001`,
                            returnedAt: new Date().toISOString(),
                            returnNotes: noteText,
                            returnHistory: updatedHistory,
                            manifestStationReview: {
                              station: currentStation,
                              reviewerId: `MS-${currentStation}-001`,
                              status: 'RETURNED_TO_FO',
                              remarks: noteText,
                              reviewedAt: new Date().toISOString(),
                            },
                            notes: [...(currentAPB.notes || []), newNote],
                          };

                          await saveAPB(updatedAPB);
                          await refreshData();
                          setMsRemark('');
                          setIsReturning(false);
                          addToast(`APB returned successfully: ${returnReason}`, 'warning');
                          navigateTo('/manifest-station');
                        }}
                        className="rounded bg-rose-600 hover:bg-rose-700 text-white font-black py-2 px-5 text-xs uppercase transition shadow-sm"
                      >
                        Confirm Return to FO
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => {
                        setReturnNotes(msRemark);
                        setIsReturning(true);
                      }}
                      className="rounded border border-rose-500 hover:bg-rose-500/10 text-rose-600 py-2.5 px-4 text-xs font-bold uppercase transition text-center"
                    >
                      {currentAPB.reworkStatus === 'RESUBMITTED' ? '↩ RETURN AGAIN' : 'RETURN TO FLIGHT OPERATIONS'}
                    </button>

                    <button
                      onClick={async () => {
                        const transition = transitionAPB(currentAPB.status, 'STATION_FORWARD_TO_HQ');
                        if (!transition.ok) {
                          addToast(transition.error || 'Cannot forward to HQ from current status', 'error');
                          return;
                        }

                        const noteText = msRemark || 'Forwarded to HQ registry';
                        const newNote = {
                          apbUniqueNumber: currentAPB.apbUniqueNumber,
                          apbVersion: currentAPB.previousActualCounts.length + 1,
                          noteText: noteText,
                          authorEmployeeId: `MS-${currentStation}-001`,
                          authorName: 'Synth Manifest Station Reviewer',
                          role: 'Manifest Station',
                          station: currentStation,
                          utcTimestamp: new Date().toISOString(),
                          localTimestamp: new Date().toString(),
                          eventType: 'FORWARDED_TO_HQ',
                          syncStatus: 'SYNCHRONIZED' as const,
                        };
                        const updatedAPB: DigitalAPB = {
                          ...currentAPB,
                          status: transition.nextStatus,
                          reworkStatus: 'APPROVED',
                          reworkReviewStatus: 'PENDING_REVIEW',
                          manifestStationReview: {
                            station: currentStation,
                            reviewerId: `MS-${currentStation}-001`,
                            status: 'FORWARDED_TO_HQ',
                            remarks: noteText,
                            reviewedAt: new Date().toISOString(),
                          },
                          notes: [...(currentAPB.notes || []), newNote],
                        };
                        await saveAPB(updatedAPB);
                        await refreshData();
                        setMsRemark('');
                        addToast('APB forwarded to Manifest HQ for review', 'info');
                        navigateTo('/manifest-station');
                      }}
                      className={`rounded border py-2.5 px-4 text-xs font-bold uppercase transition text-center ${
                        isLight ? 'border-slate-300 text-slate-800 bg-slate-100 hover:bg-slate-200' : 'border-white/10 text-white hover:bg-white/5'
                      }`}
                    >
                      FORWARD TO MANIFEST HQ
                    </button>

                    <button
                      onClick={async () => {
                        const transition = transitionAPB(currentAPB.status, 'STATION_CHECK_CLEAN');
                        if (!transition.ok) {
                          addToast(transition.error || 'Cannot mark station checked from current status', 'error');
                          return;
                        }

                        const noteText = msRemark || 'Checked clean at station bounds';
                        const newNote = {
                          apbUniqueNumber: currentAPB.apbUniqueNumber,
                          apbVersion: currentAPB.previousActualCounts.length + 1,
                          noteText: noteText,
                          authorEmployeeId: `MS-${currentStation}-001`,
                          authorName: 'Synth Manifest Station Reviewer',
                          role: 'Manifest Station',
                          station: currentStation,
                          utcTimestamp: new Date().toISOString(),
                          localTimestamp: new Date().toString(),
                          eventType: 'STATION_CHECKED',
                          syncStatus: 'SYNCHRONIZED' as const,
                        };
                        const updatedAPB: DigitalAPB = {
                          ...currentAPB,
                          status: transition.nextStatus,
                          reworkStatus: 'APPROVED',
                          reworkReviewStatus: 'APPROVED',
                          manifestStationReview: {
                            station: currentStation,
                            reviewerId: `MS-${currentStation}-001`,
                            status: 'STATION_CHECKED',
                            remarks: noteText,
                            reviewedAt: new Date().toISOString(),
                          },
                          notes: [...(currentAPB.notes || []), newNote],
                        };
                        await saveAPB(updatedAPB);
                        await refreshData();
                        setMsRemark('');
                        addToast('Digital APB marked checked and saved', 'success');
                        navigateTo('/manifest-station');
                      }}
                      className="rounded bg-[#0284c7] hover:bg-sky-600 text-white font-black py-2.5 px-5 text-xs uppercase transition shadow-sm text-center"
                    >
                      ✅ MARK AS STATION CHECKED
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

