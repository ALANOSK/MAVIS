/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Flight, DigitalAPB } from '../types';
import { SYNTHETIC_EMPLOYEES } from '../data';
import PassengerCounter from './PassengerCounter';
import { User, Check, Shield, X } from 'lucide-react';

interface FlightAttendantPortalProps {
  theme?: 'dark' | 'light';
  currentFlight: Flight;
  currentAPB: DigitalAPB;
  faStep: number;
  setFaStep: (step: number) => void;
  faCrewStatus: 'ORIGINAL_CREW' | 'REPLACEMENT_CREW' | null;
  confirmFACrewStatus: (status: 'ORIGINAL_CREW' | 'REPLACEMENT_CREW') => void;
  selectedOriginalFA: string;
  setSelectedOriginalFA: (val: string) => void;
  replacementEmpId: string;
  setReplacementEmpId: (val: string) => void;
  replacementName: string;
  setReplacementName: (val: string) => void;
  replacementReason: string;
  setReplacementReason: (val: string) => void;
  faEmpId: string;
  setFaEmpId: (val: string) => void;
  faPin: string;
  setFaPin: (val: string) => void;
  updateFACount: (key: 'adult' | 'child' | 'infant', value: number) => void;
  updateFAExtraCrew: (value: number) => void;
  verifyFALogin: () => void;
  handleFAFinalSubmit: () => void;
}

export default function FlightAttendantPortal({
  theme = 'dark',
  currentFlight,
  currentAPB,
  faStep,
  setFaStep,
  faCrewStatus,
  confirmFACrewStatus,
  selectedOriginalFA,
  setSelectedOriginalFA,
  replacementEmpId,
  setReplacementEmpId,
  replacementName,
  setReplacementName,
  replacementReason,
  setReplacementReason,
  faEmpId,
  setFaEmpId,
  faPin,
  setFaPin,
  updateFACount,
  updateFAExtraCrew,
  verifyFALogin,
  handleFAFinalSubmit,
}: FlightAttendantPortalProps) {
  const isLight = theme === 'light';
  const currentCount = currentAPB.actualCount || currentAPB.temporaryCount;

  // Lock body scroll while the overlay modal is active
  useEffect(() => {
    const originalStyle = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, []);

  const handleCancelClose = () => {
    // Navigate back to the previous flight operations view
    window.location.hash = `/flight-operations/flights/${currentFlight.id}/apb`;
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-3 sm:p-4 backdrop-blur-md overflow-hidden select-none animate-[fadeIn_0.2s_ease]">
      <div
        className={`w-[min(1100px,calc(100vw-24px))] max-h-[calc(100dvh-24px)] h-auto min-w-0 min-h-0 rounded-xl border z-[1100] shadow-2xl flex flex-col overflow-hidden select-text pointer-events-auto ${
          isLight ? 'bg-white border-slate-300' : 'bg-[#0F1117] border-white/10'
        }`}
        style={{ boxSizing: 'border-box' }}
      >
        {/* STICKY HEADER */}
        <div className={`sticky top-0 z-10 border-b p-4 flex items-center justify-between gap-4 flex-shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
        }`}>
          <div className="min-w-0">
            <h2 className="text-sm sm:text-base font-black tracking-widest text-rose-600 uppercase truncate flex items-center gap-1.5">
              👩‍✈ FLIGHT ATTENDANT
            </h2>
            <span className={`text-[10px] uppercase tracking-wider font-bold block mt-0.5 truncate ${
              isLight ? 'text-slate-600' : 'text-slate-400'
            }`}>
              Verification Phase & Active Onboard Physical Census Control
            </span>
          </div>
          <button
            onClick={handleCancelClose}
            className={`rounded border p-2 text-xs font-bold transition flex items-center gap-1.5 uppercase flex-shrink-0 cursor-pointer ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'bg-white/5 hover:bg-white/10 border-white/10 hover:text-white text-slate-300'
            }`}
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* INTERNAL SCROLLABLE CONTENT AREA */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-5 min-h-0 min-w-0 scrollbar-width-thin">
          
          {/* Flight Summary Cards - Responsive columns */}
          <div className={`border p-4 rounded-lg text-xs grid grid-cols-1 sm:grid-cols-2 gap-4 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
          }`}>
            <div className="min-w-0">
              <span className="text-slate-500 uppercase block font-bold text-[9px] tracking-wider">Flight Bounds</span>
              <span className={`font-bold text-sm uppercase truncate block mt-0.5 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {currentFlight.flightNumber} ({currentFlight.origin} ➔ {currentFlight.destination})
              </span>
            </div>
            <div className="min-w-0">
              <span className="text-slate-500 uppercase block font-bold text-[9px] tracking-wider">A/C Seats Limit</span>
              <span className={`font-bold text-sm uppercase truncate block mt-0.5 ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>
                {currentFlight.aircraft.capacity} seats ({currentFlight.aircraft.type})
              </span>
            </div>
          </div>

          {/* Physical Census Adjustment Section */}
          <div className={`space-y-3.5 border p-4 rounded-lg ${
            isLight ? 'bg-slate-50/50 border-slate-200' : 'bg-[#1A1D23]/30 border-white/5'
          }`}>
            <div className={`flex items-center justify-between border-b pb-2 ${
              isLight ? 'border-slate-200' : 'border-white/5'
            }`}>
              <h3 className={`text-xs font-black tracking-wider uppercase truncate ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}>
                ✏ Physical Census Adjustment
              </h3>
              <span className="text-[10px] uppercase font-bold text-slate-500 flex-shrink-0 ml-2">
                Step {faStep} of 3
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <PassengerCounter
                label="Adult Census Count"
                value={currentCount.adult}
                max={currentFlight.aircraft.capacity}
                description="Adjust headcount of adult passengers physically present on board"
                onChange={(v) => updateFACount('adult', v)}
                theme={theme}
              />

              <PassengerCounter
                label="Child Census Count"
                value={currentCount.child}
                max={currentFlight.aircraft.capacity}
                description="Adjust headcount of children (ages 2 to 12) present in cabin"
                onChange={(v) => updateFACount('child', v)}
                theme={theme}
              />

              <PassengerCounter
                label="Infant Census Count"
                value={currentCount.infant}
                max={currentFlight.aircraft.capacity}
                description="Adjust headcount of lap-held infants (under 2 years of age)"
                onChange={(v) => updateFACount('infant', v)}
                theme={theme}
              />

              {/* Extra Crew counters */}
              <div className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-lg border p-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-[#1A1D23] border-white/10'
              }`}>
                <div className="flex flex-col text-left min-w-0">
                  <span className={`text-sm font-black tracking-wider uppercase truncate ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>Extra Crew on Deck</span>
                  <span className="text-[11px] text-slate-500 leading-tight">Deadhead staff or observers (not in standard pax totals)</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    onClick={() => updateFAExtraCrew(currentAPB.extraCrew - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-rose-500/50 text-rose-600 font-bold hover:bg-rose-500/10 transition flex-shrink-0 cursor-pointer"
                  >
                    -
                  </button>
                  <span className={`font-mono text-lg font-black w-8 text-center flex-shrink-0 ${
                    isLight ? 'text-slate-900' : 'text-white'
                  }`}>{currentAPB.extraCrew}</span>
                  <button
                    onClick={() => updateFAExtraCrew(currentAPB.extraCrew + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-emerald-500/50 text-emerald-600 font-bold hover:bg-emerald-500/10 transition flex-shrink-0 cursor-pointer"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Total Census Banner */}
              <div className={`rounded-lg border-2 p-4 text-center flex flex-col items-center justify-center ${
                isLight ? 'bg-sky-50 border-sky-400' : 'bg-sky-500/10 border-sky-400 shadow-[0_4px_12px_rgba(56,189,248,0.15)]'
              }`}>
                <span className={`text-[10px] uppercase font-black tracking-widest block leading-none ${
                  isLight ? 'text-sky-800' : 'text-sky-400'
                }`}>
                  TOTAL PHYSICAL PASSENGERS ONBOARD
                </span>
                <span className={`font-mono text-3xl font-black mt-1 leading-none ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}>
                  {currentCount.total}
                </span>
              </div>

              {/* Ground Manifest vs Cabin Reconciliation Card */}
              {(() => {
                const isEmergencyFlight = currentFlight.sourceMode === 'MANUAL_EMERGENCY' || currentFlight.passengerSources.boarding.updatedAt === null;
                
                if (isEmergencyFlight && currentFlight.passengerSources.boarding.updatedAt === null) {
                  return (
                    <div className={`rounded-lg border p-4 text-left ${
                      isLight ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    }`}>
                      <div className="flex items-center gap-2 mb-1 justify-between">
                        <span className="text-[10px] font-black tracking-widest uppercase block leading-none text-slate-500">
                          Ground Manifest Status
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase leading-none bg-amber-200 text-amber-900">
                          GROUND REFERENCE UNAVAILABLE
                        </span>
                      </div>
                      <p className={`text-[11px] mt-2.5 leading-relaxed font-sans ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        No cached boarding manifest is available. Cabin headcount will be retained as the controlled manual emergency count until the official source is restored.
                      </p>
                    </div>
                  );
                }

                const boardingTotal = currentFlight.passengerSources.boarding.breakdown.total;
                const onboardTotal = currentCount.total;
                const diff = onboardTotal - boardingTotal;
                
                return (
                  <div className={`rounded-lg border p-4 transition-colors duration-150 text-left ${
                    diff === 0 
                      ? isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                      : isLight ? 'bg-amber-50 border-amber-300 text-amber-900 animate-[pulse_2s_infinite]' : 'bg-amber-500/10 border-amber-500/30 text-amber-300 animate-[pulse_2s_infinite]'
                  }`}>
                    <div className="flex items-center gap-2 mb-1 justify-between">
                      <span className="text-[10px] font-black tracking-widest uppercase block leading-none text-slate-500">
                        Ground Manifest vs Cabin Reconciliation
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase leading-none ${
                        diff === 0 ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-200 text-amber-900'
                      }`}>
                        {diff === 0 ? 'Matched' : 'Discrepancy'}
                      </span>
                    </div>
                    
                    <div className={`grid grid-cols-3 gap-2 mt-2 border-t pt-2 text-center text-xs ${
                      isLight ? 'border-slate-200' : 'border-white/5'
                    }`}>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Ground Boarding</span>
                        <span className={`font-mono text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{boardingTotal}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Cabin Headcount</span>
                        <span className={`font-mono text-sm font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{onboardTotal}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 block uppercase font-bold">Variance</span>
                        <span className={`font-mono text-sm font-black ${diff === 0 ? 'text-emerald-700' : diff > 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                          {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </div>
                    </div>
                    
                    <p className={`text-[11px] mt-2.5 leading-relaxed font-sans ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {diff === 0 ? (
                        <span>✓ No discrepancy. Onboard cabin census perfectly reconciles with active ground boarding records. Ready for safety verification.</span>
                      ) : (
                        <span>⚠ Discrepancy of <strong>{Math.abs(diff)}</strong> passenger(s) found. Ground manifest lists <strong>{boardingTotal}</strong> boarded, but <strong>{onboardTotal}</strong> physically counted on board. Please double check rows and reconcile.</span>
                      )}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Step Wizard Verification Controls */}
          <div className={`border p-5 rounded-lg space-y-4 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D23] border-white/10'
          }`}>
            {/* Wizard Header Bar */}
            <div className="flex items-center gap-3 justify-center mb-1 flex-shrink-0">
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  faStep === 1
                    ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                    : 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                }`}
              >
                {faStep > 1 ? <Check className="h-4 w-4" /> : '1'}
              </span>
              <div className={`h-0.5 w-12 ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  faStep === 2
                    ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                    : faStep > 2
                    ? 'border-emerald-500 text-emerald-600 bg-emerald-500/10'
                    : isLight ? 'border-slate-300 text-slate-400' : 'border-white/10 text-slate-500'
                }`}
              >
                {faStep > 2 ? <Check className="h-4 w-4" /> : '2'}
              </span>
              <div className={`h-0.5 w-12 ${isLight ? 'bg-slate-300' : 'bg-white/10'}`} />
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                  faStep === 3
                    ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                    : isLight ? 'border-slate-300 text-slate-400' : 'border-white/10 text-slate-500'
                }`}
              >
                3
              </span>
            </div>

            {/* STEP 1: Staff Identity Mapping */}
            {faStep === 1 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className={`text-xs font-bold uppercase tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Step 1: Identity Mapping
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-md mx-auto mt-1 leading-relaxed overflow-wrap-anywhere">
                    Identify if you are the Original Crew or a designated Replacement Crew member.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    onClick={() => confirmFACrewStatus('ORIGINAL_CREW')}
                    className={`flex-1 rounded py-2.5 text-xs font-bold transition uppercase tracking-wider cursor-pointer ${
                      faCrewStatus === 'ORIGINAL_CREW'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isLight ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-[#0F1117] border border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Original Crew
                  </button>
                  <button
                    onClick={() => confirmFACrewStatus('REPLACEMENT_CREW')}
                    className={`flex-1 rounded py-2.5 text-xs font-bold transition uppercase tracking-wider cursor-pointer ${
                      faCrewStatus === 'REPLACEMENT_CREW'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : isLight ? 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100' : 'bg-[#0F1117] border border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    Replacement Crew
                  </button>
                </div>

                {/* Original Crew Dropdown */}
                {faCrewStatus === 'ORIGINAL_CREW' && (
                  <div className={`rounded p-3 border space-y-2 animate-[fadeIn_0.15s_ease] ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#0F1117] border-white/10'
                  }`}>
                    <label className="text-[10px] text-slate-500 uppercase font-bold block">Select your name from Original Crew roster:</label>
                    <select
                      value={selectedOriginalFA}
                      onChange={(e) => {
                        setSelectedOriginalFA(e.target.value);
                        setFaEmpId(e.target.value);
                      }}
                      className={`w-full rounded border text-xs py-2.5 px-3 outline-none focus:border-sky-500/50 ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1A1D23] border-white/10 text-white'
                      }`}
                    >
                      {currentFlight.crewRoster
                        .filter((cr) => cr.crewPosition.includes('FLIGHT_ATTENDANT'))
                        .map((cr) => (
                          <option key={cr.employeeId} value={cr.employeeId}>
                            {cr.name} ({cr.crewPosition.replace(/_/g, ' ')})
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Replacement Form */}
                {faCrewStatus === 'REPLACEMENT_CREW' && (
                  <div className={`rounded p-3 border space-y-3 animate-[fadeIn_0.15s_ease] ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#0F1117] border-white/10'
                  }`}>
                    <div className={`text-xs font-bold uppercase border-b pb-1 flex items-center gap-1.5 ${
                      isLight ? 'text-slate-900 border-slate-200' : 'text-white border-white/10'
                    }`}>
                      <User className="h-3.5 w-3.5 text-sky-600" />
                      <span>Replacement Crew Records</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block">Employee ID</label>
                        <input
                          type="text"
                          value={replacementEmpId}
                          onChange={(e) => {
                            setReplacementEmpId(e.target.value);
                            setFaEmpId(e.target.value);
                          }}
                          className={`w-full rounded border py-2 px-3 outline-none focus:border-sky-500/50 ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1A1D23] border-white/10 text-white'
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] text-slate-500 uppercase font-bold block">Full Name</label>
                        <input
                          type="text"
                          value={replacementName}
                          onChange={(e) => setReplacementName(e.target.value)}
                          className={`w-full rounded border py-2 px-3 outline-none focus:border-sky-500/50 ${
                            isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1A1D23] border-white/10 text-white'
                          }`}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-500 uppercase font-bold block">Reason for Replacement</label>
                      <input
                        type="text"
                        value={replacementReason}
                        onChange={(e) => setReplacementReason(e.target.value)}
                        className={`w-full rounded border py-2 px-3 outline-none focus:border-sky-500/50 ${
                          isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1A1D23] border-white/10 text-white'
                        }`}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 2: Safety PIN Credentials */}
            {faStep === 2 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className={`text-xs font-bold uppercase tracking-wide ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Step 2: PIN Handshake
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-1 leading-relaxed overflow-wrap-anywhere">
                    Enter your security credentials to confirm identity authorization.
                  </p>
                </div>

                <div className="space-y-3 max-w-xs mx-auto text-xs">
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold block">Confirmed Employee ID</label>
                    <input
                      type="text"
                      value={faEmpId}
                      onChange={(e) => setFaEmpId(e.target.value)}
                      className={`w-full rounded border py-2 px-3 font-mono outline-none focus:border-sky-500/50 ${
                        isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-[#0F1117] border-white/10 text-white'
                      }`}
                      readOnly
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] text-slate-500 uppercase font-bold block">PIN</label>
                    <input
                      type="password"
                      placeholder="Enter 6-digit safety PIN..."
                      maxLength={6}
                      pattern="\d{6}"
                      value={faPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 6) {
                          setFaPin(val);
                        }
                      }}
                      className={`w-full rounded border py-2.5 px-3 outline-none focus:border-sky-500/50 text-center tracking-widest font-mono text-sm ${
                        isLight ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-[#0F1117] border-white/10 text-white'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 3: Audit Summary */}
            {faStep === 3 && (
              <div className="space-y-4">
                <div className="text-center">
                  <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center justify-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-700 flex-shrink-0" />
                    <span className="truncate">Step 3: Audit Summary</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed overflow-wrap-anywhere">
                    Verify that physical cabin tallies represent actual on-board counts accurately.
                  </p>
                </div>

                <div className={`rounded border p-3.5 text-xs space-y-2.5 ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#0F1117] border-white/10'
                }`}>
                  <div className={`text-slate-500 font-bold border-b pb-1 uppercase tracking-wider text-[9px] ${
                    isLight ? 'border-slate-200' : 'border-white/5'
                  }`}>
                    Final Passenger Census Summary
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4 text-xs">
                    <div className="min-w-0">
                      <span className="text-slate-500 block sm:inline">Flight Code:</span>{' '}
                      <strong className={`uppercase truncate block sm:inline ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentFlight.flightNumber}</strong>
                    </div>
                    <div className="min-w-0">
                      <span className="text-slate-500 block sm:inline">Flight Attendant:</span>{' '}
                      <strong className={`truncate block sm:inline ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {SYNTHETIC_EMPLOYEES[faEmpId]?.name || currentFlight?.crewRoster?.find(c => c.employeeId === faEmpId)?.name || 'Attendant'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Actual Passenger Count:</span>{' '}
                      <strong className={`font-mono ml-1 ${isLight ? 'text-sky-800' : 'text-sky-400'}`}>
                        {currentCount.total}
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-500">Extra Crew:</span>{' '}
                      <strong className={`font-mono ml-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{currentAPB.extraCrew}</strong>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* STICKY FOOTER ACTIONS */}
        <div className={`sticky bottom-0 z-10 border-t p-4 flex flex-col sm:flex-row gap-3 items-center justify-between flex-shrink-0 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0F1117] border-white/10'
        }`}>
          <button
            onClick={handleCancelClose}
            className={`w-full sm:w-auto rounded border px-5 py-2.5 text-xs font-bold transition uppercase tracking-wider flex-shrink-0 cursor-pointer text-center ${
              isLight ? 'bg-slate-200 hover:bg-slate-300 border-slate-300 text-slate-800' : 'border-white/10 text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            Cancel / Close
          </button>

          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2.5 justify-end">
            {faStep === 1 && faCrewStatus && (
              <button
                onClick={() => setFaStep(2)}
                className="w-full sm:w-auto rounded bg-rose-600 hover:bg-rose-700 text-white font-black py-2.5 px-6 text-xs uppercase transition shadow-sm flex-shrink-0 cursor-pointer text-center"
              >
                Continue to Security
              </button>
            )}

            {faStep === 2 && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setFaStep(1)}
                  className={`flex-1 sm:flex-none rounded border py-2.5 px-4 text-xs font-bold transition uppercase flex-shrink-0 cursor-pointer text-center ${
                    isLight ? 'border-slate-300 text-slate-700 bg-slate-200 hover:bg-slate-300' : 'border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  Back
                </button>
                <button
                  onClick={verifyFALogin}
                  className="flex-1 sm:flex-none rounded bg-rose-600 hover:bg-rose-700 text-white py-2.5 px-5 text-xs font-black uppercase transition shadow-sm flex-shrink-0 cursor-pointer text-center"
                >
                  Verify & Continue
                </button>
              </div>
            )}

            {faStep === 3 && (
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setFaStep(2)}
                  className={`flex-1 sm:flex-none rounded border py-2.5 px-4 text-xs font-bold transition uppercase flex-shrink-0 cursor-pointer text-center ${
                    isLight ? 'border-slate-300 text-slate-700 bg-slate-200 hover:bg-slate-300' : 'border-white/10 text-slate-400 hover:bg-white/5'
                  }`}
                >
                  Back & Adjust
                </button>
                <button
                  onClick={handleFAFinalSubmit}
                  className="flex-1 sm:flex-none rounded bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-5 text-xs font-black uppercase transition shadow-sm flex-shrink-0 cursor-pointer text-center"
                >
                  Final Submit
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
