/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Flight, DigitalAPB, StationCode, getAPBStatusLayers, getSimplifiedAPBDisplay, ReworkAudit } from '../types';
import { CARRIERS } from '../data';
import APBAuditTimeline from './APBAuditTimeline';
import {
  Search,
  CheckCircle,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Send,
  Clock,
  Briefcase,
  Layers,
  AlertTriangle,
  WifiOff,
  Plus,
} from 'lucide-react';

interface FlightOperationsPageProps {
  currentStation: StationCode;
  currentRoute: string;
  flights: Flight[];
  apbs: DigitalAPB[];
  foSearch: string;
  setFoSearch: (val: string) => void;
  foMovFilter: string;
  setFoMovFilter: (val: string) => void;
  foAPBFilter: string;
  setFoAPBFilter: (val: string) => void;
  verificationChecklist: {
    checked: boolean;
    passed: boolean;
    results: { label: string; pass: boolean }[];
  } | null;
  verifyFlight: (flight: Flight) => void;
  pullDataToDigitalAPB: (flight: Flight) => void;
  initiateHandover: (apb: DigitalAPB) => void;
  transmitToServer: () => void;
  returnToFAForRecheck: () => void;
  setReturnReason: (val: string) => void;
  addToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
  navigateTo: (route: string) => void;
  addAPBNote: (
    apbId: string,
    text: string,
    role: string,
    authorId: string,
    authorName: string,
    eventType: string
  ) => Promise<void>;
  theme?: 'light' | 'dark';
  contingencyState?: 'LIVE' | 'CACHE_AVAILABLE' | 'NO_CACHE' | 'RECONCILING';
  handleCreateEmergencyFlight?: (flightData: any) => Promise<any>;
  handleReconcileEmergency?: (flightId: string) => Promise<void>;
  saveAPB?: (apb: DigitalAPB) => Promise<void>;
  refreshData?: () => Promise<void>;
}

export default function FlightOperationsPage({
  currentStation,
  currentRoute,
  flights,
  apbs,
  foSearch,
  setFoSearch,
  foMovFilter,
  setFoMovFilter,
  foAPBFilter,
  setFoAPBFilter,
  verificationChecklist,
  verifyFlight,
  pullDataToDigitalAPB,
  initiateHandover,
  transmitToServer,
  returnToFAForRecheck,
  setReturnReason,
  addToast,
  navigateTo,
  addAPBNote,
  theme = 'dark',
  contingencyState = 'LIVE',
  handleCreateEmergencyFlight,
  handleReconcileEmergency,
  saveAPB,
  refreshData,
}: FlightOperationsPageProps) {
  const isLight = theme === 'light';
  // Extract path params manually
  const parts = currentRoute.split('/');
  let flightId = '';
  if (currentRoute.includes('/flights/')) {
    const idx = parts.indexOf('flights');
    if (idx !== -1 && parts[idx + 1]) {
      flightId = parts[idx + 1];
    }
  }

  const currentFlight = flights.find((f) => f.id === flightId);
  const currentAPB = currentFlight ? apbs.find((a) => a.flightId === currentFlight.id) : null;

  // Local sorting & date filter states
  const [foSortField, setFoSortField] = useState<'flightNumber' | 'flightDate' | 'scheduledDeparture' | 'movementStatus' | 'apbStatus'>('scheduledDeparture');
  const [foSortAsc, setFoSortAsc] = useState<boolean>(true);
  const [foDateFilter, setFoDateFilter] = useState<string>('');

  // Emergency Form States
  const [showEmergencyForm, setShowEmergencyForm] = useState(false);
  const [emergFlightNum, setEmergFlightNum] = useState('JT-999');
  const [emergDest, setEmergDest] = useState('DPS');
  const [emergSTD, setEmergSTD] = useState('14:30');
  const [emergType, setEmergType] = useState('B738');
  const [emergReg, setEmergReg] = useState('PK-LQR');
  const [emergCapacity, setEmergCapacity] = useState(189);
  const [emergReason, setEmergReason] = useState('Primary ACARS & Dispatch Network Failure - Station Emergency Protocol');

  // APB Rework Form States
  const [reworkAdults, setReworkAdults] = useState<number>(0);
  const [reworkChildren, setReworkChildren] = useState<number>(0);
  const [reworkInfants, setReworkInfants] = useState<number>(0);
  const [reworkExtraCrew, setReworkExtraCrew] = useState<number>(0);
  const [reworkAuditNotes, setReworkAuditNotes] = useState<string>('');
  const [reworkMode, setReworkMode] = useState<'SABRE_AUTO' | 'MANUAL'>('SABRE_AUTO');
  const [faConfirmed, setFaConfirmed] = useState<boolean>(true);

  // Auto verified SABRE data state
  const [isSabreDataFetched, setIsSabreDataFetched] = useState<boolean>(false);
  const [isFetchingSabre, setIsFetchingSabre] = useState<boolean>(false);
  const [sabreAdults, setSabreAdults] = useState<number>(0);
  const [sabreChildren, setSabreChildren] = useState<number>(0);
  const [sabreInfants, setSabreInfants] = useState<number>(0);
  const [sabreExtraCrew, setSabreExtraCrew] = useState<number>(0);
  const [sabreTotal, setSabreTotal] = useState<number>(0);
  const [sabreSyncTime, setSabreSyncTime] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('Passenger offloaded');
  const [correctionNote, setCorrectionNote] = useState<string>('');

  // Sync state values on load of returned APB
  React.useEffect(() => {
    if (currentAPB) {
      const { reworkStatus } = getAPBStatusLayers(currentAPB, contingencyState);
      if (reworkStatus === 'RETURNED' || reworkStatus === 'CORRECTING' || reworkStatus === 'RESUBMITTED' || currentAPB.status === 'RETURNED_TO_FLIGHT_OPERATIONS') {
        const hasSabreSimulation = !!(currentFlight?.passengerSources?.boarding?.breakdown && contingencyState !== 'NO_CACHE');
        if (currentAPB.reworkAudit) {
          const audit = currentAPB.reworkAudit;
          setSabreAdults(audit.verifiedSabreCount.adult);
          setSabreChildren(audit.verifiedSabreCount.child);
          setSabreInfants(audit.verifiedSabreCount.infant);
          setSabreExtraCrew(audit.verifiedSabreCount.extraCrew);
          setSabreTotal(audit.verifiedSabreCount.total);
          setSabreSyncTime(audit.timestamp);
          setIsSabreDataFetched(true);
          setCorrectionReason(audit.correctionReason || 'Passenger offloaded');
          setCorrectionNote(audit.operatorNote || '');
          setReworkAdults(audit.verifiedSabreCount.adult);
          setReworkChildren(audit.verifiedSabreCount.child);
          setReworkInfants(audit.verifiedSabreCount.infant);
          setReworkExtraCrew(audit.verifiedSabreCount.extraCrew);
          setReworkMode(hasSabreSimulation ? 'SABRE_AUTO' : 'MANUAL');
        } else if (hasSabreSimulation && currentFlight) {
          const b = currentFlight.passengerSources.boarding.breakdown;
          setSabreAdults(b.adult);
          setSabreChildren(b.child);
          setSabreInfants(b.infant);
          setSabreExtraCrew(currentAPB.extraCrew ?? 0);
          setSabreTotal(b.total);
          setSabreSyncTime(new Date().toISOString());
          setIsSabreDataFetched(true);
          setCorrectionReason('Passenger offloaded');
          setCorrectionNote('');
          setReworkAdults(b.adult);
          setReworkChildren(b.child);
          setReworkInfants(b.infant);
          setReworkExtraCrew(currentAPB.extraCrew ?? 0);
          setReworkMode('SABRE_AUTO');
        } else {
          setIsSabreDataFetched(false);
          setSabreAdults(0);
          setSabreChildren(0);
          setSabreInfants(0);
          setSabreExtraCrew(0);
          setSabreTotal(0);
          setSabreSyncTime('');
          setCorrectionReason('Manual recount adjustment');
          setCorrectionNote('');
          setReworkAdults((currentAPB.actualCount || currentAPB.temporaryCount)?.adult ?? 0);
          setReworkChildren((currentAPB.actualCount || currentAPB.temporaryCount)?.child ?? 0);
          setReworkInfants((currentAPB.actualCount || currentAPB.temporaryCount)?.infant ?? 0);
          setReworkExtraCrew(currentAPB.extraCrew ?? 0);
          setReworkMode('MANUAL');
        }
        setFaConfirmed(true);
        setReworkAuditNotes(currentAPB.returnNotes ?? '');
      }
    }
  }, [currentAPB?.id, currentAPB?.reworkStatus, currentFlight?.flightNumber, contingencyState]);

  // Extract unique available dates for filtering
  const availableDates = useMemo(() => {
    const dates = new Set<string>();
    flights.forEach((f) => {
      const isRelated = f.origin === currentStation || f.destination === currentStation;
      if (isRelated && f.flightStatus !== 'CANCELLED' && f.movementStatus !== 'COMPLETED' && f.movementStatus !== 'ARRIVED') {
        dates.add(f.flightDate);
      }
    });
    return Array.from(dates).sort();
  }, [flights, currentStation]);

  // Filter flights matching station bounds
  const filteredFlights = flights.filter((f) => {
    if (contingencyState === 'NO_CACHE') {
      return f.sourceMode === 'MANUAL_EMERGENCY';
    }

    const isRelated = f.origin === currentStation || f.destination === currentStation;
    if (!isRelated || f.flightStatus === 'CANCELLED' || f.movementStatus === 'COMPLETED' || f.movementStatus === 'ARRIVED') return false;

    const apbObj = apbs.find((a) => a.flightId === f.id);
    const apbStatus = apbObj ? apbObj.status : 'NOT_CREATED';

    const matchesSearch =
      !foSearch ||
      f.flightNumber.toLowerCase().includes(foSearch.toLowerCase()) ||
      f.origin.toLowerCase().includes(foSearch.toLowerCase()) ||
      f.destination.toLowerCase().includes(foSearch.toLowerCase()) ||
      f.flightDate.toLowerCase().includes(foSearch.toLowerCase());
    const matchesMov = !foMovFilter || f.movementStatus === foMovFilter;
    const matchesAPB = !foAPBFilter || apbStatus === foAPBFilter;
    const matchesDate = !foDateFilter || f.flightDate === foDateFilter;

    return matchesSearch && matchesMov && matchesAPB && matchesDate;
  });

  const sortedFlights = useMemo(() => {
    return [...filteredFlights].sort((a, b) => {
      let comparison = 0;
      if (foSortField === 'flightNumber') {
        comparison = a.flightNumber.localeCompare(b.flightNumber);
      } else if (foSortField === 'flightDate') {
        comparison = a.flightDate.localeCompare(b.flightDate);
      } else if (foSortField === 'scheduledDeparture') {
        comparison = new Date(a.scheduledDeparture).getTime() - new Date(b.scheduledDeparture).getTime();
      } else if (foSortField === 'movementStatus') {
        comparison = a.movementStatus.localeCompare(b.movementStatus);
      } else if (foSortField === 'apbStatus') {
        const apbA = apbs.find((x) => x.flightId === a.id)?.status || 'NOT_CREATED';
        const apbB = apbs.find((x) => x.flightId === b.id)?.status || 'NOT_CREATED';
        comparison = apbA.localeCompare(apbB);
      }
      return foSortAsc ? comparison : -comparison;
    });
  }, [filteredFlights, foSortField, foSortAsc, apbs]);

  // Render view depending on subroute
  const isDetailView = currentRoute.startsWith('/flight-operations/flights/') && !currentRoute.includes('/apb');
  const isAPBPrepView = currentRoute.endsWith('/apb') && currentFlight && currentAPB;
  const isFinalReviewView = currentRoute.includes('/apb/final-review') && currentFlight && currentAPB;

  const isModalOpen = !!((isDetailView && currentFlight) || isAPBPrepView || isFinalReviewView);

  const renderSortIndicator = (field: 'flightNumber' | 'flightDate' | 'scheduledDeparture' | 'movementStatus' | 'apbStatus') => {
    if (foSortField !== field) return null;
    return foSortAsc ? ' ▴' : ' ▾';
  };

  const handleHeaderClick = (field: 'flightNumber' | 'flightDate' | 'scheduledDeparture' | 'movementStatus' | 'apbStatus') => {
    if (foSortField === field) {
      setFoSortAsc(!foSortAsc);
    } else {
      setFoSortField(field);
      setFoSortAsc(true);
    }
  };

  return (
    <div className={`relative flex-1 flex flex-col min-h-0 min-w-0 ${isModalOpen ? 'overflow-hidden' : 'overflow-y-auto'}`}>
      {/* Background: Flight operations list */}
      <div className={`transition-all duration-300 flex-1 flex flex-col min-h-0 min-w-0 ${isModalOpen ? 'filter blur-md pointer-events-none opacity-35 select-none' : ''}`}>
        <div id="flight-ops-list" className="flex-1 p-5 max-w-7xl w-full mx-auto space-y-4">
          <div className={`flex items-center justify-between border-b pb-3 ${
            isLight ? 'border-slate-200' : 'border-white/10'
          }`}>
            <div className="space-y-1">
              <h2 className={`text-base font-black tracking-widest uppercase ${
                isLight ? 'text-sky-800' : 'text-sky-400'
              }`}>
                🛫 FLIGHT OPERATIONS ({currentStation})
              </h2>
              <p className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Select, verify, and initiate the Digital APB lifecycle for active passenger counts.
              </p>
            </div>
            <span className={`text-[10px] uppercase font-bold border px-2 py-1 rounded ${
              isLight ? 'bg-slate-100 text-slate-700 border-slate-300' : 'bg-white/5 text-slate-500 border-white/10'
            }`}>
              ROSTER ACTIVE
            </span>
          </div>

          {contingencyState === 'CACHE_AVAILABLE' && (
            <div className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
              isLight ? 'bg-amber-50 border-amber-300 text-amber-950 shadow-sm' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              <div className="flex gap-3">
                <WifiOff className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="text-xs font-black uppercase tracking-wider">OFFLINE LOCAL CACHE DETECTED</h3>
                  <p className="text-[11px] opacity-90 leading-relaxed">
                    SITA & GOM live stream connections are severed. However, MAVIS has resolved offline cached schedules for <strong>{currentStation}</strong>. Processing APBs on these flights will save local draft snapshot records labeled as <strong>PENDING SYNC</strong>.
                  </p>
                </div>
              </div>
            </div>
          )}

          {contingencyState === 'NO_CACHE' && (
            <div className={`p-4 rounded-xl border space-y-3 ${
              isLight ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-sm' : 'bg-rose-500/10 border-rose-500/20 text-rose-300'
            }`}>
              <div className="flex gap-3 items-start justify-between w-full">
                <div className="flex gap-3 items-start">
                  <AlertTriangle className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-1 flex-1">
                    <h3 className="text-xs font-black uppercase tracking-wider">CRITICAL NETWORK FAILURE & NO LOCAL CACHE</h3>
                    <p className="text-[11px] opacity-90 leading-relaxed">
                      All digital dispatcher streams are offline and no local cache was recovered. Flights list is currently empty.
                      <strong> Under emergency protocols, you must manually log the dispatch flight parameters to process the Digital APB.</strong>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowEmergencyForm(!showEmergencyForm)}
                  className={`rounded border px-3 py-1.5 text-xs font-black tracking-wider uppercase transition flex items-center gap-1.5 flex-shrink-0 ${
                    isLight 
                      ? 'bg-rose-100 hover:bg-rose-200 border-rose-400 text-rose-950' 
                      : 'bg-rose-500/20 hover:bg-rose-500/30 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {showEmergencyForm ? 'Hide Emergency Form' : 'Initialize Emergency Flight'}
                </button>
              </div>

              {showEmergencyForm && (
                <div className={`p-4 rounded-lg border space-y-4 animate-[fadeIn_0.15s_ease] ${
                  isLight ? 'bg-white border-rose-200' : 'bg-[#0F1117] border-rose-500/10'
                }`}>
                  <div className={`border-b pb-2 ${isLight ? 'border-rose-100' : 'border-rose-500/10'}`}>
                    <h4 className={`text-[10px] font-black uppercase tracking-widest ${isLight ? 'text-rose-900' : 'text-rose-300'}`}>
                      Emergency Flight Log & Local Initialization Form
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Flight Number</label>
                      <input
                        type="text"
                        value={emergFlightNum}
                        onChange={(e) => setEmergFlightNum(e.target.value.toUpperCase())}
                        className={`w-full rounded border p-2 text-xs font-mono font-bold outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#161920] border-white/10 text-white'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Destination</label>
                      <input
                        type="text"
                        maxLength={3}
                        value={emergDest}
                        onChange={(e) => setEmergDest(e.target.value.toUpperCase())}
                        className={`w-full rounded border p-2 text-xs font-mono font-bold outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#161920] border-white/10 text-white'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">STD (HH:MM)</label>
                      <input
                        type="text"
                        placeholder="e.g. 14:30"
                        value={emergSTD}
                        onChange={(e) => setEmergSTD(e.target.value)}
                        className={`w-full rounded border p-2 text-xs font-mono font-bold outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#161920] border-white/10 text-white'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Aircraft Type</label>
                      <input
                        type="text"
                        value={emergType}
                        onChange={(e) => setEmergType(e.target.value.toUpperCase())}
                        className={`w-full rounded border p-2 text-xs font-mono font-bold outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#161920] border-white/10 text-white'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Registration</label>
                      <input
                        type="text"
                        value={emergReg}
                        onChange={(e) => setEmergReg(e.target.value.toUpperCase())}
                        className={`w-full rounded border p-2 text-xs font-mono font-bold outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#161920] border-white/10 text-white'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Capacity</label>
                      <input
                        type="number"
                        value={emergCapacity}
                        onChange={(e) => setEmergCapacity(parseInt(e.target.value, 10) || 0)}
                        className={`w-full rounded border p-2 text-xs font-mono font-bold outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#161920] border-white/10 text-white'
                        }`}
                      />
                    </div>
                    <div className="space-y-1 col-span-1 sm:col-span-2 md:col-span-4">
                      <label className="text-[10px] uppercase font-bold text-slate-500 block">Disruption Reason & Notes</label>
                      <input
                        type="text"
                        value={emergReason}
                        onChange={(e) => setEmergReason(e.target.value)}
                        className={`w-full rounded border p-2 text-xs font-bold outline-none ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#161920] border-white/10 text-white'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end pt-2 border-t border-rose-500/10">
                    <button
                      onClick={async () => {
                        if (!handleCreateEmergencyFlight) return;
                        try {
                          await handleCreateEmergencyFlight({
                            flightNumber: emergFlightNum,
                            flightDate: new Date().toISOString().split('T')[0],
                            origin: currentStation,
                            destination: emergDest,
                            std: emergSTD,
                            aircraftType: emergType,
                            registration: emergReg,
                            capacity: emergCapacity,
                            emergencyReason: emergReason,
                          });
                          setShowEmergencyForm(false);
                        } catch (err) {
                          console.error(err);
                        }
                      }}
                      className="rounded bg-rose-600 hover:bg-rose-700 text-white font-black px-5 py-2.5 text-xs uppercase tracking-wider shadow-md transition"
                    >
                      Save Emergency Flight & Process APB
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Filters Row */}
          <div className={`flex flex-col sm:flex-row gap-2.5 items-center p-3 rounded-lg border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}>
            <div className="relative flex-1 w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by flight number (e.g. JT-111)..."
                value={foSearch}
                onChange={(e) => setFoSearch(e.target.value)}
                className={`w-full rounded border py-2 pl-9 pr-3 text-xs outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-sky-600'
                    : 'bg-[#1A1D23] border-white/10 text-white placeholder-slate-500 focus:border-sky-500/50'
                }`}
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                value={foMovFilter}
                onChange={(e) => setFoMovFilter(e.target.value)}
                className={`flex-1 sm:flex-none rounded border px-3 py-2 text-xs outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-800 focus:border-sky-600'
                    : 'bg-[#1A1D23] border-white/10 text-white focus:border-sky-500/50'
                }`}
              >
                <option value="">All Flight Movements</option>
                <option value="SCHEDULED">Scheduled</option>
                <option value="CHECK_IN">Check-In</option>
                <option value="BOARDING">Boarding</option>
                <option value="FINAL_CALL">Final Call</option>
                <option value="DEPARTED">Departed</option>
                <option value="IN_FLIGHT">In Flight</option>
                <option value="ARRIVED">Arrived</option>
                <option value="DELAYED">Delayed</option>
              </select>

              <select
                value={foAPBFilter}
                onChange={(e) => setFoAPBFilter(e.target.value)}
                className={`flex-1 sm:flex-none rounded border px-3 py-2 text-xs font-bold outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-sky-800 focus:border-sky-600'
                    : 'bg-[#1A1D23] border-white/10 text-sky-400 focus:border-sky-500/50'
                }`}
              >
                <option value="" className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>All APB Statuses</option>
                <option value="NOT_CREATED" className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>NOT CREATED</option>
                <option value="PREPARED" className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>PREPARED</option>
                <option value="FLIGHT_ATTENDANT_IN_PROGRESS" className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>IN FA MODE</option>
                <option value="FA_SUBMITTED" className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>FA SUBMITTED</option>
                <option value="SENT_TO_SERVER" className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>SENT TO SERVER</option>
                <option value="COMPLETED" className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>COMPLETED</option>
              </select>

              <select
                value={foDateFilter}
                onChange={(e) => setFoDateFilter(e.target.value)}
                className={`flex-1 sm:flex-none rounded border px-3 py-2 text-xs font-bold outline-none ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-sky-800 focus:border-sky-600'
                    : 'bg-[#1A1D23] border-white/10 text-sky-400 focus:border-sky-500/50'
                }`}
              >
                <option value="" className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>All Flight Dates</option>
                {availableDates.map((d) => (
                  <option key={d} value={d} className={isLight ? 'text-slate-800 font-normal' : 'text-white font-normal'}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Flight Table */}
          <div className={`overflow-x-auto rounded-lg border ${
            isLight ? 'bg-white border-slate-200 shadow-sm' : 'bg-[#0F1117] border-white/10'
          }`}>
            <table className="w-full text-xs text-left">
              <thead>
                <tr className={`uppercase font-bold text-[10px] tracking-wider border-b select-none ${
                  isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-[#1A1D23] text-slate-400 border-white/10'
                }`}>
                  <th className="px-4 py-3 cursor-pointer hover:text-sky-600 transition" onClick={() => handleHeaderClick('flightNumber')}>
                    Flight{renderSortIndicator('flightNumber')}
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-sky-600 transition" onClick={() => handleHeaderClick('flightDate')}>
                    Flight Date{renderSortIndicator('flightDate')}
                  </th>
                  <th className="px-4 py-3">Route</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-sky-600 transition" onClick={() => handleHeaderClick('scheduledDeparture')}>
                    Schedule (STD){renderSortIndicator('scheduledDeparture')}
                  </th>
                  <th className="px-4 py-3">Aircraft Specs</th>
                  <th className="px-4 py-3">Gate</th>
                  <th className="px-4 py-3 cursor-pointer hover:text-sky-600 transition" onClick={() => handleHeaderClick('movementStatus')}>
                    Movement{renderSortIndicator('movementStatus')}
                  </th>
                  <th className="px-4 py-3 cursor-pointer hover:text-sky-600 transition" onClick={() => handleHeaderClick('apbStatus')}>
                    APB Status{renderSortIndicator('apbStatus')}
                  </th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-white/10'}`}>
                {sortedFlights.map((f) => {
                  const apbObj = apbs.find((a) => a.flightId === f.id);
                  const apbStatus = apbObj ? apbObj.status : 'NOT_CREATED';

                  return (
                    <tr
                      key={f.id}
                      onClick={() => navigateTo(`/flight-operations/flights/${f.id}`)}
                      className={`cursor-pointer transition duration-150 ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-[#1A1D23]'
                      }`}
                    >
                      <td className={`px-4 py-3.5 font-bold tracking-widest uppercase whitespace-nowrap ${
                        isLight ? 'text-sky-700' : 'text-sky-400'
                      }`}>
                        {f.flightNumber}
                      </td>
                      <td className={`px-4 py-3.5 font-mono font-bold whitespace-nowrap ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>
                        {f.flightDate}
                      </td>
                      <td className={`px-4 py-3.5 font-medium whitespace-nowrap ${
                        isLight ? 'text-slate-800' : 'text-white'
                      }`}>{f.origin} ➔ {f.destination}</td>
                      <td className={`px-4 py-3.5 font-mono whitespace-nowrap ${
                        isLight ? 'text-slate-600' : 'text-slate-300'
                      }`}>
                        {new Date(f.scheduledDeparture).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} UTC
                      </td>
                      <td className={`px-4 py-3.5 font-mono whitespace-nowrap ${
                        isLight ? 'text-slate-600' : 'text-slate-300'
                      }`}>
                        {f.aircraft.type} <span className={isLight ? 'text-slate-400 text-[10px]' : 'text-slate-500 text-[10px]'}>({f.aircraft.registration})</span>
                      </td>
                      <td className={`px-4 py-3.5 font-bold whitespace-nowrap ${
                        isLight ? 'text-slate-900' : 'text-white'
                      }`}>G-{f.gate}</td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
                            f.movementStatus === 'BOARDING'
                              ? isLight ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : f.movementStatus === 'FINAL_CALL'
                              ? isLight ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : isLight ? 'bg-slate-100 text-slate-600 border border-slate-300' : 'bg-white/5 text-slate-400 border border-white/10'
                          }`}
                        >
                          {f.movementStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {(() => {
                          const { primaryLabel, primaryColor, secondarySyncLabel, secondarySyncColor } = getSimplifiedAPBDisplay(apbObj, contingencyState);
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
                            ? isLight ? 'bg-sky-50 text-sky-700 border-sky-200' : 'bg-sky-500/10 text-sky-400 border border-sky-500/20 animate-pulse'
                            : secondarySyncColor === 'rose'
                            ? isLight ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-500 border-white/5';

                          return (
                            <div className="flex flex-col gap-1 items-start">
                              <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border ${primaryBadgeClass}`}>
                                {primaryLabel}
                              </span>
                              <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase border ${syncBadgeClass}`}>
                                SYNC: {secondarySyncLabel}
                              </span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigateTo(`/flight-operations/flights/${f.id}`)}
                          className={`rounded border px-2.5 py-1 text-[10px] font-bold transition duration-150 h-[32px] ${
                            isLight
                              ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
                              : 'bg-[#1A1D23] border-white/10 hover:border-sky-500 text-slate-300 hover:text-white'
                          }`}
                        >
                          {(() => {
                            const { reworkStatus } = getAPBStatusLayers(apbObj, contingencyState);
                            return reworkStatus === 'RETURNED' ? 'Review Return' : 'Process';
                          })()}
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredFlights.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 font-bold">
                      No active flights found matching current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
           {/* Centered Focused Responsive Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-sm overflow-hidden animate-[fadeIn_0.15s_ease-out] select-none">
          <div 
            className={`w-[min(1024px,calc(100vw-16px))] sm:w-[min(1024px,calc(100vw-32px))] max-h-[calc(100dvh-16px)] sm:max-h-[calc(100dvh-32px)] h-auto min-w-0 min-h-0 rounded-xl border shadow-2xl flex flex-col overflow-hidden select-text pointer-events-auto ${
              isLight ? 'bg-white border-slate-300' : 'bg-[#0F1117] border-white/10'
            }`}
            style={{ boxSizing: 'border-box' }}
          >
            {/* 1. FLIGHT DETAIL VIEW */}
            {isDetailView && currentFlight && (() => {
              const apbObj = apbs.find((a) => a.flightId === currentFlight.id);
              const apbStatus = apbObj ? apbObj.status : 'NOT_CREATED';

              return (
                <>
                  {/* Sticky Header */}
                  <div className={`sticky top-0 z-10 border-b p-4 flex items-center justify-between flex-shrink-0 ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
                  }`}>
                    <h2 className={`text-sm sm:text-base font-black tracking-widest uppercase flex items-center gap-2 ${
                      isLight ? 'text-sky-800' : 'text-sky-400'
                    }`}>
                      <span>🔍 Flight {currentFlight.flightNumber} Operational Desk</span>
                    </h2>
                    <button
                      onClick={() => navigateTo('/flight-operations')}
                      className={`rounded border px-2.5 py-1.5 text-xs font-bold transition ${
                        isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:text-white text-slate-300'
                      }`}
                    >
                      CLOSE
                    </button>
                  </div>

                  {/* Scrollable Content Body */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4">
                    {/* Contingency Flight Source Banner */}
                    {currentFlight.sourceMode && currentFlight.sourceMode !== 'LIVE' && (
                      <div className={`p-3 rounded-lg border flex flex-col sm:flex-row gap-2 sm:items-center justify-between text-xs font-bold ${
                        currentFlight.sourceMode === 'CACHED'
                          ? isLight ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                          : isLight ? 'bg-rose-100 border-rose-300 text-rose-950' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={`h-2 w-2 rounded-full animate-pulse ${
                            currentFlight.sourceMode === 'CACHED' ? 'bg-amber-500' : 'bg-rose-500'
                          }`} />
                          <div>
                            <span className="uppercase tracking-wider">Flight Source: </span>
                            <strong className="uppercase font-black">
                              {currentFlight.sourceMode === 'CACHED' ? 'OFFLINE LOCAL CACHE (STATION CACHED)' : 'MANUAL EMERGENCY (DISPATCH DISRUPTED)'}
                            </strong>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider opacity-75">Sync Status:</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-black tracking-wider ${
                            currentFlight.syncStatus === 'PENDING'
                              ? isLight ? 'bg-amber-200 text-amber-950' : 'bg-amber-500/20 text-amber-300'
                              : isLight ? 'bg-emerald-200 text-emerald-950' : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {currentFlight.syncStatus || 'PENDING'}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Emergency Reconciliation Comparison Panel */}
                    {currentFlight.sourceMode === 'MANUAL_EMERGENCY' && apbObj && apbObj.verificationStatus === 'RECONCILIATION_REQUIRED' && (
                      <div className={`p-4 rounded-xl border space-y-3.5 ${
                        isLight ? 'bg-rose-50/50 border-rose-300 text-rose-950 shadow-sm' : 'bg-rose-500/5 border-rose-500/20 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2 border-b pb-2 border-rose-500/10">
                          <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                            🚨 SITA / GOM MASTER RECONCILIATION PENDING
                          </span>
                        </div>
                        <p className="text-[11px] opacity-90 leading-relaxed uppercase font-semibold">
                          The SITA/GOM master systems are restored. MAVIS recovered the official flight dispatch records. We detected a mismatch between your manual emergency entry and the recovered official master data. Please review the variance below before synchronizing.
                        </p>

                        <div className={`overflow-hidden rounded border text-xs font-mono ${
                          isLight ? 'bg-white border-slate-200' : 'bg-black/30 border-white/5'
                        }`}>
                          <div className={`grid grid-cols-3 p-2 font-bold uppercase text-[10px] ${
                            isLight ? 'bg-slate-100' : 'bg-white/5'
                          }`}>
                            <div>Metric Category</div>
                            <div className="text-center">Manual Emergency</div>
                            <div className="text-right">Official Recovered</div>
                          </div>
                          
                          <div className="grid grid-cols-3 p-2.5 border-b border-white/5">
                            <div className="font-bold">Total Passengers</div>
                            <div className="text-center font-bold text-amber-400">183 PAX</div>
                            <div className="text-right font-bold text-emerald-400">181 PAX</div>
                          </div>

                          <div className="grid grid-cols-3 p-2.5 border-b border-white/5">
                            <div className="font-bold">Discrepancy Variance</div>
                            <div className="col-span-2 text-right font-black text-rose-400">-2 PAX</div>
                          </div>

                          <div className="grid grid-cols-3 p-2.5">
                            <div className="font-bold">Flight Identity (ID)</div>
                            <div className="col-span-2 text-right font-mono font-bold text-slate-400">
                              {currentFlight.id} <span className="text-[9px] text-emerald-400 font-sans font-black uppercase ml-1.5">(PRESERVED - STABLE ID)</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-1">
                          <p className="text-[9px] text-slate-500 uppercase leading-normal max-w-md">
                            *Note: Clicking Reconcile will preserve your audited manifest on the ground ledger, but safely log the variance on SITA/GOM master servers to finalize dispatch. No manual values will be silently overwritten.
                          </p>
                          <button
                            onClick={async () => {
                              if (handleReconcileEmergency) {
                                await handleReconcileEmergency(currentFlight.id);
                              }
                            }}
                            className="rounded bg-emerald-600 hover:bg-emerald-700 text-white font-black px-5 py-2.5 text-xs uppercase tracking-wider transition shadow-lg flex-shrink-0"
                          >
                            ✓ Reconcile & Synchronize Flight
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Emergency Reconciliation Complete Banner */}
                    {currentFlight.sourceMode === 'MANUAL_EMERGENCY' && apbObj && apbObj.verificationStatus === 'RECONCILED' && (
                      <div className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                        isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-950 shadow-sm' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      }`}>
                        <div className="space-y-1">
                          <h3 className="text-xs font-black uppercase tracking-wider">✓ Manual Reconciliation Completed</h3>
                          <p className="text-[11px] opacity-90 leading-relaxed uppercase">
                            Emergency logs successfully verified, matched, and synchronized with SITA/GOM. Saved variance is logged as: <strong>183 PAX vs 181 PAX (-2 pax variance)</strong>. MAVIS flight ID <strong>{currentFlight.id}</strong> was preserved as stable master ID.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* General Flight Info Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div className={`border p-3 rounded-lg text-xs space-y-1 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                      }`}>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Flight Date</span>
                        <span className={`font-mono font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentFlight.flightDate}</span>
                      </div>
                      <div className={`border p-3 rounded-lg text-xs space-y-1 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                      }`}>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Carrier details</span>
                        <span className={`font-bold text-sm leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>{CARRIERS[currentFlight.carrierCode]?.displayName || currentFlight.carrierCode}</span>
                      </div>
                      <div className={`border p-3 rounded-lg text-xs space-y-1 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                      }`}>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Route Bounds</span>
                        <span className={`font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentFlight.origin} - {currentFlight.destination}</span>
                      </div>
                      <div className={`border p-3 rounded-lg text-xs space-y-1 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                      }`}>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Aircraft Specifications</span>
                        <span className={`font-mono text-xs leading-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {currentFlight.aircraft.type} <strong className={isLight ? 'text-sky-700' : 'text-sky-400'}>({currentFlight.aircraft.registration})</strong>
                        </span>
                      </div>
                      <div className={`border p-3 rounded-lg text-xs space-y-1 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                      }`}>
                        <span className="text-[10px] text-slate-500 uppercase block font-bold">Terminal & Gate</span>
                        <span className={`font-mono font-bold text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          T{currentFlight.departureTerminal} | Gate G-{currentFlight.gate}
                        </span>
                      </div>
                    </div>

                    {/* Passenger Sources Segment */}
                    {currentFlight.sourceMode === 'MANUAL_EMERGENCY' && currentFlight.passengerSources.boarding.updatedAt === null ? (
                      <div className={`border p-4 rounded-lg space-y-3 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                      }`}>
                        <div className={`flex justify-between items-center border-b pb-2 ${
                          isLight ? 'border-slate-200' : 'border-white/5'
                        }`}>
                          <h3 className="text-xs font-black tracking-wider uppercase text-amber-500 flex items-center gap-1.5">
                            ⚠️ PASSENGER REFERENCE DATA UNAVAILABLE
                          </h3>
                          <span className={`text-[10px] uppercase font-bold border px-1.5 py-0.5 rounded ${
                            isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                          }`}>
                            NO SIGNAL / NO CACHE
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {['SALES', 'CHECK-IN', 'BOARDING'].map((streamName) => (
                            <div
                              key={streamName}
                              className={`border p-2.5 rounded text-xs ${
                                isLight ? 'bg-white border-slate-200' : 'bg-[#0F1117] border-white/10'
                              }`}
                            >
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">
                                {streamName}
                              </span>
                              <div className="font-mono text-amber-500 font-bold mt-1">
                                UNAVAILABLE
                              </div>
                              <div className={`text-right text-[11px] font-mono text-slate-500 mt-1.5 border-t pt-1.5 ${
                                isLight ? 'border-slate-200' : 'border-white/10'
                              }`}>
                                Total: —
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className={`text-[11px] leading-relaxed font-sans ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          No live connection and no cached passenger manifest are available. Sales, Check-in and Boarding reference streams cannot be retrieved. Proceed with controlled manual cabin headcount.
                        </p>
                      </div>
                    ) : (
                      <div className={`border p-4 rounded-lg space-y-3 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                      }`}>
                        <div className={`flex justify-between items-center border-b pb-2 ${
                          isLight ? 'border-slate-200' : 'border-white/5'
                        }`}>
                          <h3 className={`text-xs font-black tracking-wider uppercase ${
                            isLight ? 'text-sky-800' : 'text-sky-400'
                          }`}>
                            📊 Real-time Flight Passenger Stream Snapshot
                          </h3>
                          <span className="text-[10px] text-slate-500 font-mono">AS OF: {new Date().toLocaleDateString()}</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            currentFlight.passengerSources.sales,
                            currentFlight.passengerSources.checkIn,
                            currentFlight.passengerSources.boarding,
                          ].map((src) => (
                            <div
                              key={src.source}
                              className={`border p-2.5 rounded text-xs transition duration-150 ${
                                src.source === 'BOARDING'
                                  ? isLight ? 'bg-sky-100 border-sky-300' : 'bg-sky-500/5 border-sky-500/20'
                                  : isLight ? 'bg-white border-slate-200' : 'bg-[#0F1117] border-white/10'
                              }`}
                            >
                              <span className="text-[9px] uppercase tracking-wider text-slate-500 block font-bold">
                                {src.source.replace(/_/g, ' ')}
                              </span>
                              <div className={`font-mono font-bold mt-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                A:{src.breakdown.adult} / C:{src.breakdown.child} / I:{src.breakdown.infant}
                              </div>
                              <div className={`text-right text-[11px] font-black mt-1.5 border-t pt-1.5 ${
                                isLight ? 'text-sky-800 border-slate-200' : 'text-sky-400 border-white/10'
                              }`}>
                                Total: {src.breakdown.total}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Crew matching */}
                    <div className={`border p-4 rounded-lg space-y-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                    }`}>
                      <h3 className={`text-xs font-black tracking-wider uppercase ${
                        isLight ? 'text-sky-800' : 'text-sky-400'
                      }`}>
                        🧑‍✈ Active Crew Roster Matching & Identity Checks
                      </h3>
                      <div className={`overflow-x-auto rounded border ${
                        isLight ? 'border-slate-200' : 'border-white/5'
                      }`}>
                        <table className="w-full text-xs text-left">
                          <thead>
                            <tr className={`border-b uppercase text-[9px] font-bold ${
                              isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-[#0F1117] text-slate-400 border-white/10'
                            }`}>
                              <th className="px-3 py-2">Employee ID</th>
                              <th className="px-3 py-2">Rostered Crew Member</th>
                              <th className="px-3 py-2">Roster Position</th>
                              <th className="px-3 py-2">Roster Ranks</th>
                            </tr>
                          </thead>
                          <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-white/5 text-slate-300'}`}>
                            {currentFlight.crewRoster.map((crew) => (
                              <tr key={crew.employeeId}>
                                <td className="px-3 py-2.5 font-mono text-slate-500">{crew.employeeId}</td>
                                <td className={`px-3 py-2.5 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{crew.name}</td>
                                <td className="px-3 py-2.5 text-slate-500">{crew.crewPosition.replace(/_/g, ' ')}</td>
                                <td className="px-3 py-2.5">
                                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold border flex-shrink-0 ${
                                    isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  }`}>
                                    ORIGINAL ACTIVE
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Checklist verification display */}
                    {apbStatus === 'NOT_CREATED' && verificationChecklist && (
                      <div className={`rounded border p-4 text-left max-w-lg mx-auto space-y-2.5 animate-[fadeIn_0.15s_ease] ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                      }`}>
                        <h4 className={`text-[10px] font-black uppercase tracking-widest border-b pb-1.5 ${
                          isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-white/10'
                        }`}>
                          Automated Verification Checklist
                        </h4>
                        <div className="space-y-1.5">
                          {verificationChecklist.results.map((r, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs leading-relaxed">
                              {r.pass ? (
                                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                              ) : (
                                <XCircle className="h-4 w-4 text-rose-600 flex-shrink-0 mt-0.5" />
                              )}
                              <span className={r.pass ? (isLight ? 'text-slate-900' : 'text-white') : (isLight ? 'text-rose-700 font-semibold' : 'text-rose-400 font-semibold')}>{r.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Sticky Footer */}
                  <div className={`sticky bottom-0 z-10 border-t p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between flex-shrink-0 ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
                  }`}>
                    <button
                      onClick={() => navigateTo('/flight-operations')}
                      className={`rounded border px-5 py-2.5 text-xs font-bold transition uppercase text-center ${
                        isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'border border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      BACK TO LIST
                    </button>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {apbStatus === 'NOT_CREATED' ? (
                        <>
                          <button
                            onClick={() => verifyFlight(currentFlight)}
                            className="rounded bg-sky-600 hover:bg-sky-700 text-white font-bold px-6 py-2.5 text-xs uppercase transition shadow-sm"
                          >
                            RUN INTEGRITY CHECKLIST
                          </button>
                          {verificationChecklist?.passed && (
                            <button
                              onClick={() => pullDataToDigitalAPB(currentFlight)}
                              className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 text-xs font-bold uppercase transition shadow-sm animate-[fadeIn_0.15s_ease]"
                            >
                              PULL SNAPSHOT TO DIGITAL APB
                            </button>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            const { reworkStatus } = getAPBStatusLayers(apbObj, contingencyState);
                            if (reworkStatus === 'RETURNED') {
                              navigateTo(`/flight-operations/flights/${currentFlight.id}/apb/final-review`);
                            } else if (apbStatus === 'PREPARED') {
                              navigateTo(`/flight-operations/flights/${currentFlight.id}/apb`);
                            } else if (apbStatus === 'FA_SUBMITTED' || apbObj?.status === 'FA_SUBMITTED') {
                              navigateTo(`/flight-operations/flights/${currentFlight.id}/apb/final-review`);
                            } else if (apbStatus === 'FLIGHT_ATTENDANT_IN_PROGRESS' || apbObj?.status === 'FLIGHT_ATTENDANT_IN_PROGRESS' || apbObj?.status === 'RETURNED_TO_FLIGHT_ATTENDANT') {
                              navigateTo(`/flight-operations/flights/${currentFlight.id}/apb/flight-attendant`);
                            } else {
                              navigateTo(`/flight-operations/flights/${currentFlight.id}/apb/final-review`);
                            }
                          }}
                          className={`rounded px-5 py-2.5 text-xs font-bold transition uppercase shadow-sm ${
                            (() => {
                              const { reworkStatus } = getAPBStatusLayers(apbObj, contingencyState);
                              return reworkStatus === 'RETURNED'
                                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                                : 'bg-sky-600 hover:bg-sky-700 text-white';
                            })()
                          }`}
                        >
                          {(() => {
                            const { reworkStatus } = getAPBStatusLayers(apbObj, contingencyState);
                            return reworkStatus === 'RETURNED' ? 'Review Return & Correct' : 'GO TO ACTIVE APB';
                          })()}
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}

            {/* 2. APB PREPARATION & HANDOVER */}
            {isAPBPrepView && (() => {
              return (
                <>
                  {/* Sticky Header */}
                  <div className={`sticky top-0 z-10 border-b p-4 flex items-center justify-between flex-shrink-0 ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
                  }`}>
                    <h2 className={`text-sm sm:text-base font-black tracking-widest uppercase ${
                      isLight ? 'text-sky-800' : 'text-sky-400'
                    }`}>
                      📋 Digital APB Reference Center
                    </h2>
                    <button
                      onClick={() => navigateTo(`/flight-operations/flights/${currentFlight.id}`)}
                      className={`rounded border px-2.5 py-1.5 text-xs font-bold transition ${
                        isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:text-white text-slate-300'
                      }`}
                    >
                      CLOSE
                    </button>
                  </div>

                  {/* Scrollable Body */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4">
                    <div className={`rounded-lg border p-4 text-xs space-y-2 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                    }`}>
                      <div>
                        <span className="text-slate-500 uppercase block font-bold text-[9px]">Unique APB Reference</span>
                        <span className={`font-mono text-sm font-black ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>{currentAPB.apbUniqueNumber}</span>
                      </div>
                      <div className={`flex flex-wrap gap-4 pt-2 border-t ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                        {(() => {
                          const { primaryLabel, primaryColor, secondarySyncLabel, secondarySyncColor } = getSimplifiedAPBDisplay(currentAPB, contingencyState);
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
                            <>
                              <div>
                                <span className="text-slate-500 font-semibold mr-1">Status:</span>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${primaryBadgeClass}`}>
                                  {primaryLabel}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500 font-semibold mr-1">Sync:</span>
                                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase border ${syncBadgeClass}`}>
                                  {secondarySyncLabel}
                                </span>
                              </div>
                            </>
                          );
                        })()}
                        <div>
                          <span className="text-slate-500 font-semibold">Prepared By:</span> <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentAPB.preparedBy}</span>
                        </div>
                      </div>
                    </div>

                    {/* Read-Only Reference Streams */}
                    <div className={`border p-4 rounded-lg space-y-2 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                    }`}>
                      <h3 className={`text-xs font-black tracking-wider uppercase mb-2 ${
                        isLight ? 'text-slate-800' : 'text-white'
                      }`}>
                        🔒 Locked Passenger Reference Streams (Read-Only)
                      </h3>
                      {currentFlight.sourceMode === 'MANUAL_EMERGENCY' && currentFlight.passengerSources.boarding.updatedAt === null ? (
                        <div className="space-y-3">
                          <div className={`overflow-x-auto rounded border ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                            <table className="w-full text-xs text-left">
                              <thead>
                                <tr className={`border-b text-[10px] font-bold ${
                                  isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-[#0F1117] text-slate-400 border-white/10'
                                }`}>
                                  <th className="px-3 py-2">Source</th>
                                  <th className="px-3 py-2 text-center">Status</th>
                                  <th className="px-3 py-2 text-right">Reference Total</th>
                                </tr>
                              </thead>
                              <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-white/5 text-slate-300'}`}>
                                {['SALES', 'CHECK IN', 'BOARDING'].map((src) => (
                                  <tr key={src}>
                                    <td className="px-3 py-2.5 uppercase font-medium">{src}</td>
                                    <td className="px-3 py-2.5 text-center font-mono text-amber-500 font-bold">UNAVAILABLE</td>
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-500">—</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          <div className={`p-2.5 rounded text-xs font-mono border ${isLight ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-amber-500/10 border-amber-500/20 text-amber-300'}`}>
                            ⚠️ NO SIGNAL / NO CACHE — MANUAL CABIN CENSUS REQUIRED
                          </div>
                        </div>
                      ) : (
                        <div className={`overflow-x-auto rounded border ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
                          <table className="w-full text-xs text-left">
                            <thead>
                              <tr className={`border-b text-[10px] font-bold ${
                                isLight ? 'bg-slate-200 text-slate-700 border-slate-300' : 'bg-[#0F1117] text-slate-400 border-white/10'
                              }`}>
                                <th className="px-3 py-2">Source</th>
                                <th className="px-3 py-2 text-center">Adult</th>
                                <th className="px-3 py-2 text-center">Child</th>
                                <th className="px-3 py-2 text-center">Infant</th>
                                <th className="px-3 py-2 text-right">Total</th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-700' : 'divide-white/5 text-slate-300'}`}>
                              {[
                                currentFlight.passengerSources.sales,
                                currentFlight.passengerSources.checkIn,
                                currentFlight.passengerSources.boarding,
                              ].map((src) => (
                                <tr
                                  key={src.source}
                                  className={src.source === 'BOARDING' ? (isLight ? 'bg-sky-100 text-slate-900 font-bold' : 'bg-sky-500/5 text-white font-bold') : ''}
                                >
                                  <td className="px-3 py-2.5 uppercase font-medium">{src.source.replace(/_/g, ' ')}</td>
                                  <td className="px-3 py-2.5 text-center font-mono">{src.breakdown.adult}</td>
                                  <td className="px-3 py-2.5 text-center font-mono">{src.breakdown.child}</td>
                                  <td className="px-3 py-2.5 text-center font-mono">{src.breakdown.infant}</td>
                                  <td className={`px-3 py-2.5 text-right font-mono ${isLight ? 'text-sky-800 font-bold' : 'text-sky-400'}`}>{src.breakdown.total}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className={`border p-4 rounded-lg text-xs space-y-2 text-left leading-relaxed ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                    }`}>
                      <h4 className={`font-bold uppercase ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>📱 Handover Instructions</h4>
                      <p className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                        Please secure clearance before continuing. You are passing the physical device control to the Cabin Lead Attendant at the front cabin door to perform the onboard physical passenger headcount.
                      </p>
                    </div>
                  </div>

                  {/* Sticky Footer */}
                  <div className={`sticky bottom-0 z-10 border-t p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between flex-shrink-0 ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
                  }`}>
                    <button
                      onClick={() => navigateTo(`/flight-operations/flights/${currentFlight.id}`)}
                      className={`rounded border px-5 py-2.5 text-xs font-bold transition uppercase text-center ${
                        isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'border border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      BACK TO DETAILS
                    </button>
                    <button
                      onClick={() => initiateHandover(currentAPB)}
                      className="rounded bg-sky-600 hover:bg-sky-700 text-white font-black px-6 py-2.5 text-xs transition uppercase shadow-sm text-center"
                    >
                      📱 INITIATE CABIN HANDOVER
                    </button>
                  </div>
                </>
              );
            })()}

            {/* 3. FLIGHT OPERATIONS FINAL REVIEW */}
            {isFinalReviewView && (() => {
              const { reworkStatus } = getAPBStatusLayers(currentAPB, contingencyState);
              const isReturned = reworkStatus === 'RETURNED' || reworkStatus === 'CORRECTING' || currentAPB.status === 'RETURNED_TO_FLIGHT_OPERATIONS';
              const isSabreSimulationAvailable = !!(currentFlight?.passengerSources?.boarding?.breakdown && contingencyState !== 'NO_CACHE');

              const handleFetchSabreData = () => {
                setIsFetchingSabre(true);
                setTimeout(() => {
                  if (currentFlight?.passengerSources?.boarding?.breakdown) {
                    const b = currentFlight.passengerSources.boarding.breakdown;
                    setSabreAdults(b.adult);
                    setSabreChildren(b.child);
                    setSabreInfants(b.infant);
                    setSabreTotal(b.total);
                    setSabreExtraCrew(currentAPB?.extraCrew ?? 0);
                    setReworkAdults(b.adult);
                    setReworkChildren(b.child);
                    setReworkInfants(b.infant);
                    setReworkExtraCrew(currentAPB?.extraCrew ?? 0);
                    setSabreSyncTime(new Date().toISOString());
                    setIsSabreDataFetched(true);
                    setReworkMode('SABRE_AUTO');
                  }
                  setIsFetchingSabre(false);
                  addToast('Verified passenger reference values auto-populated from SABRE simulation!', 'success');
                }, 400);
              };

              const computedTotal = reworkAdults + reworkChildren + reworkInfants;
              const prevPax = currentAPB.actualCount || currentAPB.temporaryCount;
              const prevTotal = prevPax?.total ?? 0;
              const totalVariance = computedTotal - prevTotal;

              return (
                <>
                  {/* Sticky Header */}
                  <div className={`sticky top-0 z-10 border-b p-4 flex items-center justify-between flex-shrink-0 ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
                  }`}>
                    <h2 className={`text-sm sm:text-base font-black tracking-widest uppercase ${
                      isLight ? 'text-sky-800' : 'text-sky-400'
                    }`}>
                      📋 {isReturned ? 'Digital APB Rework & Correction Workbench' : 'Digital APB Final Submission Desk'}
                    </h2>
                    <button
                      onClick={() => navigateTo('/flight-operations')}
                      className={`rounded border px-2.5 py-1.5 text-xs font-bold transition ${
                        isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:text-white text-slate-300'
                      }`}
                    >
                      CLOSE
                    </button>
                  </div>

                  {/* Scrollable Body */}
                  <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-5 space-y-4">
                    {/* Return Summary Info */}
                    {isReturned && (
                      <div className={`p-4 rounded-xl border space-y-3.5 ${
                        isLight ? 'bg-rose-50 border-rose-300 text-rose-950 shadow-sm' : 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                      }`}>
                        <div className="flex items-center gap-2 border-b pb-2 border-rose-500/10">
                          <span className="text-xs font-black uppercase tracking-wider text-rose-500">
                            🚨 DETECTED MANIFEST DISCREPANCY & RETURN DETAILS
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs uppercase font-semibold">
                          <div>
                            <span className="text-slate-500 block text-[9px] font-bold">Reason for Return</span>
                            <strong className="text-rose-500">{currentAPB.returnReason || 'Passenger mismatch'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] font-bold">Returned By Personnel</span>
                            <strong className={isLight ? 'text-slate-900' : 'text-white'}>{currentAPB.returnedBy || 'Manifest Station'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] font-bold">Returned Timestamp (UTC)</span>
                            <strong className="font-mono text-slate-400">{currentAPB.returnedAt ? new Date(currentAPB.returnedAt).toUTCString() : '—'}</strong>
                          </div>
                          <div>
                            <span className="text-slate-500 block text-[9px] font-bold">Required Action</span>
                            <strong className="text-sky-500">Correct passenger counts via SABRE or Controlled Manual path and Resubmit</strong>
                          </div>
                        </div>
                        {currentAPB.returnNotes && (
                          <div className="mt-2.5 p-2.5 rounded bg-black/15 border border-white/5 font-mono text-[11px] leading-relaxed">
                            <span className="text-slate-500 block text-[9px] font-bold uppercase font-sans mb-1">Station Reviewer Notes / Remarks</span>
                            {currentAPB.returnNotes}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`rounded-lg border p-4 text-xs space-y-2 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                    }`}>
                      <div className={`flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b pb-2 mb-2 ${
                        isLight ? 'border-slate-200' : 'border-white/10'
                      }`}>
                        <div>
                          <span className="text-slate-500 uppercase text-[10px] block font-bold">APB Unique Number</span>
                          <span className={`font-mono text-sm font-black ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>{currentAPB.apbUniqueNumber}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 uppercase text-[10px] block font-bold">Processing state</span>
                          {(() => {
                            if (isReturned) {
                              return (
                                <span className="rounded px-2 py-0.5 text-[10px] font-bold border bg-rose-500/10 text-rose-400 border-rose-500/20">
                                  RETURNED FOR CORRECTION
                                </span>
                              );
                            }
                            return (
                              <span className={`rounded px-2 py-0.5 text-[10px] font-bold border ${
                                isLight ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                              }`}>
                                FA SUBMITTED (PENDING OPERATIONAL REVIEW)
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {(() => {
                        const actualPax = currentAPB.actualCount || currentAPB.temporaryCount;
                        const actualTotal = actualPax?.total ?? 0;
                        const isEmergencyUnreconciled = currentFlight.sourceMode === 'MANUAL_EMERGENCY' && currentFlight.passengerSources.boarding.updatedAt === null;
                        const refBoardingTotal = currentFlight.passengerSources.boarding.breakdown.total;
                        const discrepancy = actualTotal - refBoardingTotal;
                        const leadAttendantName = currentAPB.flightAttendantVerification?.employeeName ||
                          currentFlight?.crewRoster?.find(c => c.employeeId === currentAPB.flightAttendantVerification?.employeeId)?.name ||
                          'Assigned Lead FA';

                        return (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                              <span className="text-slate-500 block font-semibold">FA Count Census:</span>
                              <strong className={`text-sm font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {actualTotal}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-semibold">Reference Boarding:</span>
                              <strong className={`text-sm font-mono ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {isEmergencyUnreconciled ? '— (UNAVAILABLE)' : refBoardingTotal}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-semibold">Discrepancy:</span>
                              <strong
                                className={`text-sm font-mono ${
                                  isEmergencyUnreconciled
                                    ? 'text-amber-500'
                                    : discrepancy !== 0
                                    ? 'text-amber-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                {isEmergencyUnreconciled
                                  ? 'N/A (EMERGENCY)'
                                  : discrepancy > 0
                                  ? `+${discrepancy}`
                                  : discrepancy}
                              </strong>
                            </div>
                            <div>
                              <span className="text-slate-500 block font-semibold">Verified Lead Attendant:</span>
                              <strong className={`text-sm ${isLight ? 'text-slate-900' : 'text-white'}`}>
                                {leadAttendantName}
                              </strong>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Side-by-Side: Previous Submission vs Current Correction Workbench */}
                    {isReturned && (() => {
                      const prevPax = currentAPB.actualCount || currentAPB.temporaryCount;
                      return (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {/* Left: Previous Submission Data (Read-only) */}
                          <div className={`border p-4 rounded-lg space-y-3 text-xs ${
                            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                          }`}>
                            <h3 className={`text-xs font-black tracking-wider uppercase border-b pb-1.5 ${
                              isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'
                            }`}>
                              📊 Previous Submitted Passenger Breakdown
                            </h3>
                            <div className="space-y-2 font-semibold">
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-slate-500">Adult Passengers:</span>
                                <span className="font-mono">{prevPax?.adult ?? 0}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-slate-500">Child Passengers:</span>
                                <span className="font-mono">{prevPax?.child ?? 0}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-slate-500">Infant Passengers:</span>
                                <span className="font-mono">{prevPax?.infant ?? 0}</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-[#3b82f6]">Total Passenger Census:</span>
                                <span className="font-mono text-[#3b82f6] font-black">{prevPax?.total ?? 0} PAX</span>
                              </div>
                              <div className="flex justify-between items-center py-1 border-b border-white/5">
                                <span className="text-slate-500">Extra Flight Crew:</span>
                                <span className="font-mono">{currentAPB.extraCrew ?? 0}</span>
                              </div>
                              <div className="pt-2">
                                <span className="text-[10px] text-slate-500 block uppercase font-bold">Return Flag / Cause:</span>
                                <span className="text-rose-500 font-bold block">{currentAPB.returnReason || 'Discrepancy detected'}</span>
                              </div>
                            </div>
                          </div>

                        {/* Right: Current Correction Workbench (Actionable) */}
                        <div className={`border p-4 rounded-lg space-y-3 text-xs ${
                          isLight ? 'bg-slate-100 border-slate-300' : 'bg-[#1E222B] border-sky-500/30 shadow-sky-500/5'
                        }`}>
                          <div className={`border-b pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                            isLight ? 'border-slate-200' : 'border-white/10'
                          }`}>
                            <span className="text-xs font-black tracking-wider uppercase text-sky-400">
                              🔧 APB CORRECTION WORKBENCH
                            </span>
                            {/* Two Path Switcher Tabs */}
                            <div className="flex items-center gap-1 bg-black/20 p-0.5 rounded border border-white/10">
                              <button
                                type="button"
                                onClick={() => {
                                  setReworkMode('SABRE_AUTO');
                                  if (isSabreSimulationAvailable && currentFlight) {
                                    const b = currentFlight.passengerSources.boarding.breakdown;
                                    setReworkAdults(b.adult);
                                    setReworkChildren(b.child);
                                    setReworkInfants(b.infant);
                                    setReworkExtraCrew(currentAPB.extraCrew ?? 0);
                                    setIsSabreDataFetched(true);
                                    setSabreSyncTime(new Date().toISOString());
                                  }
                                }}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition ${
                                  reworkMode === 'SABRE_AUTO'
                                    ? 'bg-sky-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                ⚡ Path A: SABRE Ref
                              </button>
                              <button
                                type="button"
                                onClick={() => setReworkMode('MANUAL')}
                                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase transition ${
                                  reworkMode === 'MANUAL'
                                    ? 'bg-amber-600 text-white shadow-sm'
                                    : 'text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                ✏️ Path B: Manual
                              </button>
                            </div>
                          </div>

                          {/* PATH A: SABRE Simulation Available */}
                          {reworkMode === 'SABRE_AUTO' && (
                            <div className="space-y-3">
                              {isSabreSimulationAvailable ? (
                                <div className="space-y-3">
                                  <div className={`p-3 rounded-lg border space-y-2.5 ${
                                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'
                                  }`}>
                                    <div className="grid grid-cols-3 gap-2 text-center border-b pb-2 border-white/5">
                                      <div>
                                        <span className="text-slate-500 block text-[8px] uppercase font-bold">SOURCE</span>
                                        <strong className="text-sky-400 font-black tracking-wide text-[9px]">SABRE MASTER RECORD</strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block text-[8px] uppercase font-bold">STATUS</span>
                                        <strong className="text-emerald-500 font-black tracking-wide text-[9px]">AVAILABLE & VERIFIED</strong>
                                      </div>
                                      <div>
                                        <span className="text-slate-500 block text-[8px] uppercase font-bold">SYNC TIME</span>
                                        <strong className="font-mono text-slate-300 text-[9px] block truncate">
                                          {sabreSyncTime ? new Date(sabreSyncTime).toLocaleTimeString() : 'Current Session'}
                                        </strong>
                                      </div>
                                    </div>

                                    <div className="flex justify-between items-center pt-1">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase">Auto-populated passenger counts:</span>
                                      <button
                                        type="button"
                                        disabled={isFetchingSabre}
                                        onClick={handleFetchSabreData}
                                        className="text-[10px] px-2 py-1 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 rounded font-bold transition flex items-center gap-1"
                                      >
                                        {isFetchingSabre ? 'Syncing...' : '🔄 Re-populate from SABRE'}
                                      </button>
                                    </div>

                                    <div className="space-y-1.5 pt-1">
                                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Adult Passengers:</span>
                                        <span className={`font-bold font-mono text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{reworkAdults}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Child Passengers:</span>
                                        <span className={`font-bold font-mono text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{reworkChildren}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Infant Passengers:</span>
                                        <span className={`font-bold font-mono text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{reworkInfants}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1 border-b border-white/5">
                                        <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Extra Flight Crew:</span>
                                        <span className={`font-bold font-mono text-xs ${isLight ? 'text-slate-900' : 'text-white'}`}>{reworkExtraCrew}</span>
                                      </div>
                                      <div className="flex justify-between items-center py-1.5 border-t border-sky-500/20">
                                        <span className="text-sky-400 font-black uppercase tracking-wider text-[11px]">Total Headcount:</span>
                                        <div className="flex items-center gap-2">
                                          <span className="font-extrabold text-xs text-sky-400 font-mono">{computedTotal} PAX</span>
                                          <span className={`text-[10px] font-bold font-mono ${totalVariance === 0 ? 'text-slate-500' : totalVariance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            ({totalVariance > 0 ? `+${totalVariance}` : totalVariance} vs previous)
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* FA Confirmation in Path A */}
                                  <div className={`p-2.5 rounded border flex items-center justify-between gap-3 ${
                                    faConfirmed
                                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                                  }`}>
                                    <label className="flex items-center gap-2 cursor-pointer text-[11px] font-bold">
                                      <input
                                        type="checkbox"
                                        checked={faConfirmed}
                                        onChange={(e) => setFaConfirmed(e.target.checked)}
                                        className="w-4 h-4 rounded text-emerald-600 focus:ring-0 cursor-pointer"
                                      />
                                      <span>FA Confirmation: Cabin physical census verified with Senior Lead ({currentAPB.flightAttendantVerification?.employeeName || 'Assigned Lead'})</span>
                                    </label>
                                    <span className="text-[9px] uppercase font-black px-1.5 py-0.5 rounded bg-black/30">
                                      {faConfirmed ? 'CONFIRMED' : 'PENDING'}
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 py-4 text-center">
                                  <div className="mx-auto w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-400">
                                    <AlertTriangle className="w-5 h-5" />
                                  </div>
                                  <div className="space-y-1 max-w-sm mx-auto">
                                    <p className={`font-black text-xs uppercase tracking-wider ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                                      SABRE Simulation Unavailable
                                    </p>
                                    <p className={`text-[11px] leading-relaxed ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                      Live SABRE passenger reference is offline or unavailable. Switch to Path B to perform controlled manual correction with mandatory audit note.
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setReworkMode('MANUAL')}
                                    className="px-4 py-2 rounded bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase transition shadow-sm"
                                  >
                                    ✏️ Switch to Controlled Manual Correction
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* PATH B: Controlled Manual Correction */}
                          {reworkMode === 'MANUAL' && (
                            <div className="space-y-3">
                              <div className={`p-3 rounded-lg border space-y-2.5 ${
                                isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/20 border-white/5'
                              }`}>
                                <div className="flex items-center justify-between border-b pb-2 border-white/5">
                                  <span className="text-amber-400 font-bold uppercase tracking-wider text-[10px]">
                                    ✏️ Controlled Manual Passenger Entry
                                  </span>
                                  <span className="text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded font-bold uppercase">
                                    OPERATOR OVERRIDE
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                  {/* Adult Counter */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Adult Passengers</label>
                                    <div className="flex items-center">
                                      <button
                                        type="button"
                                        onClick={() => setReworkAdults(Math.max(0, reworkAdults - 1))}
                                        className={`w-7 h-7 flex items-center justify-center font-bold border rounded-l ${
                                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={reworkAdults}
                                        onChange={(e) => setReworkAdults(Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`w-14 h-7 text-center font-mono font-bold text-xs border-y outline-none ${
                                          isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#15181F] text-white border-white/10'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setReworkAdults(reworkAdults + 1)}
                                        className={`w-7 h-7 flex items-center justify-center font-bold border rounded-r ${
                                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* Child Counter */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Child Passengers</label>
                                    <div className="flex items-center">
                                      <button
                                        type="button"
                                        onClick={() => setReworkChildren(Math.max(0, reworkChildren - 1))}
                                        className={`w-7 h-7 flex items-center justify-center font-bold border rounded-l ${
                                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={reworkChildren}
                                        onChange={(e) => setReworkChildren(Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`w-14 h-7 text-center font-mono font-bold text-xs border-y outline-none ${
                                          isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#15181F] text-white border-white/10'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setReworkChildren(reworkChildren + 1)}
                                        className={`w-7 h-7 flex items-center justify-center font-bold border rounded-r ${
                                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* Infant Counter */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Infant Passengers</label>
                                    <div className="flex items-center">
                                      <button
                                        type="button"
                                        onClick={() => setReworkInfants(Math.max(0, reworkInfants - 1))}
                                        className={`w-7 h-7 flex items-center justify-center font-bold border rounded-l ${
                                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={reworkInfants}
                                        onChange={(e) => setReworkInfants(Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`w-14 h-7 text-center font-mono font-bold text-xs border-y outline-none ${
                                          isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#15181F] text-white border-white/10'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setReworkInfants(reworkInfants + 1)}
                                        className={`w-7 h-7 flex items-center justify-center font-bold border rounded-r ${
                                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>

                                  {/* Extra Crew Counter */}
                                  <div className="space-y-1">
                                    <label className="text-[9px] text-slate-400 font-bold uppercase block">Extra Flight Crew</label>
                                    <div className="flex items-center">
                                      <button
                                        type="button"
                                        onClick={() => setReworkExtraCrew(Math.max(0, reworkExtraCrew - 1))}
                                        className={`w-7 h-7 flex items-center justify-center font-bold border rounded-l ${
                                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                      >
                                        -
                                      </button>
                                      <input
                                        type="number"
                                        min={0}
                                        value={reworkExtraCrew}
                                        onChange={(e) => setReworkExtraCrew(Math.max(0, parseInt(e.target.value) || 0))}
                                        className={`w-14 h-7 text-center font-mono font-bold text-xs border-y outline-none ${
                                          isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-[#15181F] text-white border-white/10'
                                        }`}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setReworkExtraCrew(reworkExtraCrew + 1)}
                                        className={`w-7 h-7 flex items-center justify-center font-bold border rounded-r ${
                                          isLight ? 'bg-slate-200 hover:bg-slate-300 text-slate-800 border-slate-300' : 'bg-white/10 hover:bg-white/20 text-white border-white/10'
                                        }`}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center py-1.5 border-t border-white/5 mt-2">
                                  <span className="text-amber-400 font-black uppercase tracking-wider text-[11px]">Computed Total:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-xs text-amber-400 font-mono">{computedTotal} PAX</span>
                                    <span className={`text-[10px] font-bold font-mono ${totalVariance === 0 ? 'text-slate-500' : totalVariance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      ({totalVariance > 0 ? `+${totalVariance}` : totalVariance} vs previous)
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Common Section: Correction Reason & Note (Required) */}
                          <div className="space-y-3 pt-2 border-t border-white/10">
                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 uppercase tracking-wide font-bold flex items-center justify-between">
                                <span>CORRECTION REASON <span className="text-rose-400">*</span></span>
                              </label>
                              <select
                                value={correctionReason}
                                onChange={(e) => setCorrectionReason(e.target.value)}
                                className={`w-full rounded border py-1.5 px-2 text-xs outline-none focus:border-sky-500/50 ${
                                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#15181F] border-white/10 text-white'
                                }`}
                              >
                                <option value="Passenger offloaded">Passenger offloaded</option>
                                <option value="No-show reconciliation">No-show reconciliation</option>
                                <option value="Duplicate booking removed">Duplicate booking removed</option>
                                <option value="Manual recount adjustment">Manual recount adjustment</option>
                                <option value="Gate pass / Transit adjustment">Gate pass / Transit adjustment</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[9px] text-slate-400 uppercase tracking-wide font-bold flex items-center justify-between">
                                <span>CORRECTION NOTE / REMARKS <span className="text-rose-400">*</span></span>
                                <span className="text-[8px] text-slate-500 font-normal">Required for operational audit trail</span>
                              </label>
                              <textarea
                                value={correctionNote}
                                onChange={(e) => setCorrectionNote(e.target.value)}
                                placeholder="Explain discrepancy root-cause, passenger status resolution, or physical count notes..."
                                className={`w-full rounded border py-1.5 px-2 text-xs outline-none focus:border-sky-500/50 min-h-[60px] ${
                                  isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#15181F] border-white/10 text-white'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                    {/* Verification signature snapshots */}
                    <div className={`border p-4 rounded-lg space-y-2 text-xs ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
                    }`}>
                      <h3 className={`text-xs font-black tracking-wider uppercase border-b pb-1.5 ${
                        isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'
                      }`}>
                        🛂 Cabin Lead Attendant Signature Records
                      </h3>
                      <div className="grid grid-cols-2 gap-y-2 max-w-md">
                        <span className="text-slate-500">Staff Status:</span>
                        <span className={`font-semibold text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentAPB.flightAttendantVerification?.crewStatus}</span>
                        <span className="text-slate-500">Lead Employee ID:</span>
                        <span className={`font-mono text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentAPB.flightAttendantVerification?.employeeId}</span>
                        <span className="text-slate-500">PIN Handshake status:</span>
                        <span className="text-emerald-600 font-bold text-right">{currentAPB.flightAttendantVerification?.pinStatus}</span>
                        <span className="text-slate-500">Count Submitted At:</span>
                        <span className={`text-right ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          {currentAPB.flightAttendantSubmittedAt ? new Date(currentAPB.flightAttendantSubmittedAt).toLocaleTimeString() : '—'}
                        </span>
                      </div>
                    </div>

                    {/* Operational Audit Timeline */}
                    <APBAuditTimeline
                      apb={currentAPB}
                      showAddInput={true}
                      onAddNote={(text) => addAPBNote(currentAPB.id, text, 'Flight Operations', `FO-${currentStation}-001`, 'Synth Flight Operations Lead', 'OPERATIONAL_NOTE_CREATED')}
                      theme={theme}
                    />
                  </div>

                  {/* Sticky Footer */}
                  <div className={`sticky bottom-0 z-10 border-t p-3 sm:p-4 flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch sm:items-center justify-between flex-shrink-0 ${
                    isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
                  }`}>
                    <button
                      onClick={() => navigateTo('/flight-operations')}
                      className={`rounded border px-5 py-2.5 text-xs font-bold transition uppercase text-center ${
                        isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'border border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      CANCEL / FLIGHT LIST
                    </button>

                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                      {isReturned ? (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              if (computedTotal <= 0) {
                                addToast('Passenger total headcount is required and must be greater than 0.', 'error');
                                return;
                              }
                              if (!correctionNote.trim()) {
                                addToast('Please enter a brief correction note before updating draft.', 'warning');
                                return;
                              }
                              const auditData: ReworkAudit = {
                                previousCount: {
                                  adult: currentAPB.actualCount?.adult ?? 0,
                                  child: currentAPB.actualCount?.child ?? 0,
                                  infant: currentAPB.actualCount?.infant ?? 0,
                                  extraCrew: currentAPB.extraCrew ?? 0,
                                  total: currentAPB.actualCount?.total ?? 0,
                                },
                                verifiedSabreCount: {
                                  adult: reworkAdults,
                                  child: reworkChildren,
                                  infant: reworkInfants,
                                  extraCrew: reworkExtraCrew,
                                  total: computedTotal,
                                },
                                variance: {
                                  adult: reworkAdults - (currentAPB.actualCount?.adult ?? 0),
                                  child: reworkChildren - (currentAPB.actualCount?.child ?? 0),
                                  infant: reworkInfants - (currentAPB.actualCount?.infant ?? 0),
                                  extraCrew: reworkExtraCrew - (currentAPB.extraCrew ?? 0),
                                  total: computedTotal - (currentAPB.actualCount?.total ?? 0),
                                },
                                correctionReason: correctionReason,
                                operatorNote: correctionNote,
                                timestamp: new Date().toISOString(),
                              };

                              const updatedAPB: DigitalAPB = {
                                ...currentAPB,
                                actualCount: {
                                  total: computedTotal,
                                  adult: reworkAdults,
                                  child: reworkChildren,
                                  infant: reworkInfants,
                                },
                                extraCrew: reworkExtraCrew,
                                reworkStatus: 'CORRECTING',
                                reworkAudit: auditData,
                                notes: [
                                  ...(currentAPB.notes || []),
                                  {
                                    apbUniqueNumber: currentAPB.apbUniqueNumber,
                                    apbVersion: (currentAPB.previousActualCounts?.length || 0) + 1,
                                    noteText: `APB draft saved during corrections (${reworkMode === 'SABRE_AUTO' ? 'SABRE Reference' : 'Controlled Manual'}). Reason: ${correctionReason}. Remarks: ${correctionNote}`,
                                    authorEmployeeId: `FO-${currentStation}-001`,
                                    authorName: 'Synth Flight Operations Lead',
                                    role: 'Flight Operations',
                                    station: currentStation,
                                    utcTimestamp: new Date().toISOString(),
                                    localTimestamp: new Date().toString(),
                                    eventType: 'OPERATIONAL_NOTE_CREATED',
                                    syncStatus: 'SYNCHRONIZED' as const,
                                  }
                                ],
                              };
                              if (saveAPB) {
                                await saveAPB(updatedAPB);
                                if (refreshData) await refreshData();
                                addToast('APB draft updated with corrections successfully! Status set to CORRECTING.', 'success');
                              }
                            }}
                            className={`rounded border py-2.5 px-4 text-xs font-bold uppercase transition ${
                              isLight ? 'text-slate-800 border-slate-300 bg-slate-100 hover:bg-slate-200' : 'text-white border-white/20 bg-white/5 hover:bg-white/10'
                            }`}
                          >
                            💾 Update APB Draft
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              // Validation 1: Passenger Total
                              if (computedTotal <= 0) {
                                addToast('Passenger total headcount is required and must be greater than 0.', 'error');
                                return;
                              }

                              // Validation 2: Correction reason and note
                              if (!correctionReason || !correctionNote.trim()) {
                                addToast('Correction reason and explanatory note are required before resubmission.', 'error');
                                return;
                              }

                              // Validation 3: FA Confirmation if Path A with SABRE
                              if (reworkMode === 'SABRE_AUTO' && isSabreSimulationAvailable && !faConfirmed) {
                                addToast('Please confirm Senior Flight Attendant physical census verification.', 'warning');
                                return;
                              }

                              const dateStr = '20260803';
                              const subSeq = Math.floor(Math.random() * 89000) + 10000;
                              const generatedSubId = `SUB-${dateStr}-${currentFlight.flightNumber.replace('-', '')}-${subSeq}`;

                              const lastCycle = currentAPB.returnHistory && currentAPB.returnHistory.length > 0
                                ? {
                                    ...currentAPB.returnHistory[currentAPB.returnHistory.length - 1],
                                    correctedAt: new Date().toISOString(),
                                    resubmittedAt: new Date().toISOString(),
                                    reviewerAction: 'RESUBMITTED' as const
                                  }
                                : null;
                              const updatedHistory = lastCycle && currentAPB.returnHistory
                                ? [...currentAPB.returnHistory.slice(0, -1), lastCycle]
                                : currentAPB.returnHistory;

                              const resubmitNote = {
                                apbUniqueNumber: currentAPB.apbUniqueNumber,
                                apbVersion: (currentAPB.previousActualCounts?.length || 0) + 1,
                                noteText: `Resubmitted APB with corrections (${reworkMode === 'SABRE_AUTO' ? 'PATH A: SABRE Reference Auto-Populated' : 'PATH B: Controlled Manual Correction'}). Reason: ${correctionReason}. Remarks: ${correctionNote}`,
                                authorEmployeeId: `FO-${currentStation}-001`,
                                authorName: 'Synth Flight Operations Lead',
                                role: 'Flight Operations',
                                station: currentStation,
                                utcTimestamp: new Date().toISOString(),
                                localTimestamp: new Date().toString(),
                                eventType: 'RESUBMITTED_TO_MS' as const,
                                syncStatus: 'SYNCHRONIZED' as const,
                              };

                              const auditData: ReworkAudit = {
                                previousCount: {
                                  adult: currentAPB.actualCount?.adult ?? 0,
                                  child: currentAPB.actualCount?.child ?? 0,
                                  infant: currentAPB.actualCount?.infant ?? 0,
                                  extraCrew: currentAPB.extraCrew ?? 0,
                                  total: currentAPB.actualCount?.total ?? 0,
                                },
                                verifiedSabreCount: {
                                  adult: reworkAdults,
                                  child: reworkChildren,
                                  infant: reworkInfants,
                                  extraCrew: reworkExtraCrew,
                                  total: computedTotal,
                                },
                                variance: {
                                  adult: reworkAdults - (currentAPB.actualCount?.adult ?? 0),
                                  child: reworkChildren - (currentAPB.actualCount?.child ?? 0),
                                  infant: reworkInfants - (currentAPB.actualCount?.infant ?? 0),
                                  extraCrew: reworkExtraCrew - (currentAPB.extraCrew ?? 0),
                                  total: computedTotal - (currentAPB.actualCount?.total ?? 0),
                                },
                                correctionReason: correctionReason,
                                operatorNote: correctionNote,
                                timestamp: new Date().toISOString(),
                              };

                              const updatedAPB: DigitalAPB = {
                                ...currentAPB,
                                status: 'SENT_TO_SERVER', // send back to server / Manifest Station Review
                                serverStatus: 'SENT',
                                submissionId: generatedSubId,
                                sentBy: `FO-${currentStation}-001`,
                                sentAt: new Date().toISOString(),
                                actualCount: {
                                  total: computedTotal,
                                  adult: reworkAdults,
                                  child: reworkChildren,
                                  infant: reworkInfants,
                                },
                                extraCrew: reworkExtraCrew,
                                reworkStatus: 'RESUBMITTED', // maps to CORRECTION_SUBMITTED
                                reworkReviewStatus: 'PENDING_REVIEW', // routes to Manifest Station Review
                                returnHistory: updatedHistory,
                                reworkAudit: auditData,
                                notes: [...(currentAPB.notes || []), resubmitNote],
                              };

                              if (saveAPB) {
                                await saveAPB(updatedAPB);
                                if (refreshData) await refreshData();
                                setReworkAuditNotes('');
                                setCorrectionNote('');
                                addToast(`APB resubmitted with corrections to Manifest Station Review! Sub ID: ${generatedSubId}`, 'success');
                                navigateTo('/flight-operations');
                              }
                            }}
                            className="rounded bg-[#0284c7] hover:bg-sky-600 text-white font-black py-2.5 px-5 text-xs uppercase transition shadow-sm cursor-pointer"
                          >
                            🚀 Resubmit APB with Corrections
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              const reason = prompt('Enter physical recount instructions or discrepancy notes for cabin crew:') || '';
                              if (reason.trim()) {
                                setReturnReason(reason);
                                setTimeout(returnToFAForRecheck, 10);
                              } else {
                                addToast('Return canceled. Reason for return is mandatory.', 'warning');
                              }
                            }}
                            className="rounded border border-rose-500 hover:bg-rose-500/10 text-rose-600 py-2.5 px-4 text-xs font-bold uppercase transition"
                          >
                            ↩ RETURN TO FA FOR RECHECK
                          </button>

                          <button
                            onClick={transmitToServer}
                            className="rounded bg-sky-600 hover:bg-sky-700 text-white font-black py-2.5 px-6 text-xs uppercase tracking-wider transition duration-150 shadow-sm"
                          >
                            📤 TRANSMIT TO SERVER
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
