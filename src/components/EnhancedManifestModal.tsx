/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enhanced Passenger Manifest Modal / Drawer Component for MAVIS.
 * Read-only synthetic manifest view with instant tab-separated Excel text export.
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Plane,
  Luggage,
  Users,
  ShieldAlert,
} from 'lucide-react';
import {
  EnhancedManifestData,
  downloadEnhancedManifestTxt,
} from '../lib/enhancedManifestGenerator';

interface EnhancedManifestModalProps {
  manifest: EnhancedManifestData;
  isOpen: boolean;
  onClose: () => void;
  isLight?: boolean;
}

export const EnhancedManifestModal: React.FC<EnhancedManifestModalProps> = ({
  manifest,
  isOpen,
  onClose,
  isLight = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'ADT' | 'CHD' | 'INF'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  if (!isOpen) return null;

  // Filter passengers based on search and filters
  const filteredPassengers = useMemo(() => {
    return manifest.passengers.filter((p) => {
      const matchesSearch =
        !searchTerm ||
        p.passengerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.ticketNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.seat.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.bagTag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.seq.includes(searchTerm);

      const matchesType = typeFilter === 'ALL' || p.type === typeFilter;

      let matchesStatus = true;
      if (statusFilter === 'BOARDED') {
        matchesStatus = p.boardingStatus === 'BOARDED';
      } else if (statusFilter === 'OFFLOADED') {
        matchesStatus = p.boardingStatus === 'OFFLOADED';
      } else if (statusFilter === 'NO-SHOW') {
        matchesStatus = p.checkInStatus === 'NO-SHOW';
      } else if (statusFilter === 'VARIANCE') {
        matchesStatus = p.apbStatus === 'APB RECONCILIATION PENDING';
      }

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [manifest.passengers, searchTerm, typeFilter, statusFilter]);

  const totalPax = manifest.passengers.length;
  const isMatch = manifest.variance === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
      <div
        className={`w-full max-w-6xl max-h-[92vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 shadow-slate-400/20'
            : 'bg-[#12141A] border-white/10 text-slate-100 shadow-black/80'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`p-4 sm:p-5 border-b flex flex-wrap items-start justify-between gap-4 ${
            isLight ? 'bg-slate-50/80 border-slate-200' : 'bg-[#161922] border-white/10'
          }`}
        >
          <div className="space-y-1.5 flex-1 min-w-[280px]">
            <div className="flex items-center gap-2">
              <span className="bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                Enhanced Passenger Manifest
              </span>
              <span className="text-[10px] font-bold text-slate-500 uppercase">
                (Synthetic Demo View)
              </span>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h2 className="text-xl sm:text-2xl font-black tracking-tight font-mono text-sky-400">
                {manifest.flightNumber}
              </h2>
              <span className="text-sm font-bold text-slate-400">
                {manifest.route}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Date: {manifest.flightDate}
              </span>
              <span className="text-xs font-mono text-slate-500">
                STD: {manifest.std} | ETD: {manifest.etd}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-mono text-slate-400">
              <span>
                Aircraft: <strong className={isLight ? 'text-slate-800' : 'text-white'}>{manifest.aircraftType}</strong> ({manifest.aircraftRegistration})
              </span>
              <span>
                Capacity: <strong className={isLight ? 'text-slate-800' : 'text-white'}>{manifest.capacity}</strong>
              </span>
              <span>
                Total Records: <strong className="text-sky-400">{totalPax}</strong>
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadEnhancedManifestTxt(manifest)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider rounded-lg bg-sky-500 hover:bg-sky-600 text-white transition shadow-sm"
              title="Download Tab-Separated Manifest for Excel"
            >
              <Download className="h-4 w-4" />
              <span>Download TXT</span>
            </button>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg transition ${
                isLight
                  ? 'hover:bg-slate-200 text-slate-600'
                  : 'hover:bg-white/10 text-slate-400 hover:text-white'
              }`}
              title="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Source Labels Strip */}
        <div
          className={`px-4 sm:px-5 py-2 text-[10px] font-mono border-b flex flex-wrap items-center justify-between gap-2 ${
            isLight ? 'bg-slate-100/60 border-slate-200 text-slate-600' : 'bg-[#0E1015] border-white/5 text-slate-400'
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              Pax Data: <strong className="text-sky-400">{manifest.sourceLabels.passengerData}</strong>
            </span>
            <span>
              Flight/Ops: <strong className="text-indigo-400">{manifest.sourceLabels.flightAircraft}</strong>
            </span>
            <span>
              Processing: <strong className="text-emerald-400">{manifest.sourceLabels.manifestProcessing}</strong>
            </span>
          </div>
          <span className="text-slate-500 uppercase font-bold tracking-widest">
            {manifest.sourceLabels.dataClassification}
          </span>
        </div>

        {/* Canonical Count Reconciliation Strip */}
        <div
          className={`p-3 sm:p-4 border-b ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#151820] border-white/5'
          }`}
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 text-center">
            <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
              <div className="text-[9px] uppercase font-black text-slate-500 tracking-wider">SALES</div>
              <div className="text-base font-black font-mono text-slate-300">{manifest.salesCount}</div>
            </div>
            <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
              <div className="text-[9px] uppercase font-black text-slate-500 tracking-wider">CHECK-IN</div>
              <div className="text-base font-black font-mono text-slate-300">{manifest.checkInCount}</div>
            </div>
            <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
              <div className="text-[9px] uppercase font-black text-slate-500 tracking-wider">BOARDED</div>
              <div className="text-base font-black font-mono text-emerald-400">{manifest.boardedCount}</div>
            </div>
            <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
              <div className="text-[9px] uppercase font-black text-slate-500 tracking-wider">FINAL APB</div>
              <div className="text-base font-black font-mono text-indigo-400">{manifest.finalApbCount}</div>
            </div>
            <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
              <div className="text-[9px] uppercase font-black text-slate-500 tracking-wider">NO-SHOW</div>
              <div className="text-base font-black font-mono text-slate-400">{manifest.noShowCount}</div>
            </div>
            <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
              <div className="text-[9px] uppercase font-black text-slate-500 tracking-wider">OFFLOADED</div>
              <div className="text-base font-black font-mono text-amber-400">{manifest.offloadedCount}</div>
            </div>
            <div className={`p-2 rounded border ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/5'}`}>
              <div className="text-[9px] uppercase font-black text-slate-500 tracking-wider">VARIANCE</div>
              <div
                className={`text-base font-black font-mono ${
                  manifest.variance === 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {manifest.variance > 0 ? `+${manifest.variance}` : manifest.variance}
              </div>
            </div>
            <div
              className={`p-2 rounded border flex flex-col items-center justify-center ${
                isMatch
                  ? isLight
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                    : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
              }`}
            >
              <div className="text-[9px] uppercase font-black tracking-wider flex items-center gap-1">
                {isMatch ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
                STATUS
              </div>
              <div className="text-xs font-black uppercase font-mono mt-0.5">
                {manifest.status}
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div
          className={`p-3 sm:px-5 border-b flex flex-wrap items-center justify-between gap-3 ${
            isLight ? 'bg-slate-100/70 border-slate-200' : 'bg-[#101218] border-white/5'
          }`}
        >
          <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search name, ticket, seat, tag, seq..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full pl-8 pr-3 py-1.5 text-xs font-mono rounded-md border outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400'
                    : 'bg-white/5 border-white/10 text-white placeholder:text-slate-500'
                }`}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Passenger Type Filter */}
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span className="text-slate-500 uppercase text-[10px] mr-1">Type:</span>
              {(['ALL', 'ADT', 'CHD', 'INF'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTypeFilter(t)}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                    typeFilter === t
                      ? 'bg-sky-500 text-white'
                      : isLight
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 text-[11px] font-bold">
              <span className="text-slate-500 uppercase text-[10px] mr-1">Status:</span>
              {(['ALL', 'BOARDED', 'OFFLOADED', 'NO-SHOW', 'VARIANCE'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition ${
                    statusFilter === s
                      ? 'bg-sky-500 text-white'
                      : isLight
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Passenger Table Container */}
        <div className="flex-1 overflow-auto min-h-[320px]">
          <table className="w-full text-left text-xs border-collapse font-mono">
            <thead
              className={`sticky top-0 z-10 text-[10px] font-black uppercase tracking-wider border-b ${
                isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-300'
                  : 'bg-[#181B24] text-slate-400 border-white/10'
              }`}
            >
              <tr>
                <th className="py-2.5 px-3 text-center">SEQ</th>
                <th className="py-2.5 px-3">TICKET NO</th>
                <th className="py-2.5 px-3">PASSENGER NAME</th>
                <th className="py-2.5 px-2 text-center">TYPE</th>
                <th className="py-2.5 px-2 text-center">SEAT</th>
                <th className="py-2.5 px-2 text-center">BAG PCS</th>
                <th className="py-2.5 px-2 text-center">BAG KG</th>
                <th className="py-2.5 px-3">BAG TAG</th>
                <th className="py-2.5 px-3 text-center">CHECK-IN</th>
                <th className="py-2.5 px-3 text-center">BOARDING</th>
                <th className="py-2.5 px-3 text-center">APB STATUS</th>
                <th className="py-2.5 px-3">REMARKS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPassengers.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500 font-sans">
                    No matching passengers found in this manifest filter.
                  </td>
                </tr>
              ) : (
                filteredPassengers.map((p) => {
                  return (
                    <tr
                      key={p.seq + p.ticketNo}
                      className={`transition-colors ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className="py-2 px-3 text-center font-bold text-slate-500">
                        {p.seq}
                      </td>
                      <td className="py-2 px-3 font-bold text-sky-400">
                        {p.ticketNo}
                      </td>
                      <td className={`py-2 px-3 font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                        {p.passengerName}
                      </td>
                      <td className="py-2 px-2 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            p.type === 'ADT'
                              ? 'bg-slate-500/10 text-slate-400'
                              : p.type === 'CHD'
                              ? 'bg-indigo-500/10 text-indigo-400'
                              : 'bg-purple-500/10 text-purple-400'
                          }`}
                        >
                          {p.type}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center font-bold">
                        {p.seat}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400">
                        {p.bagPcs}
                      </td>
                      <td className="py-2 px-2 text-center text-slate-400">
                        {p.bagKg > 0 ? `${p.bagKg} kg` : '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">
                        {p.bagTag}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            p.checkInStatus === 'CHECKED-IN'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {p.checkInStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            p.boardingStatus === 'BOARDED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : p.boardingStatus === 'OFFLOADED'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {p.boardingStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                            p.apbStatus === 'VERIFIED'
                              ? 'bg-emerald-500/10 text-emerald-400'
                              : p.apbStatus === 'APB RECONCILIATION PENDING'
                              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/20'
                              : p.apbStatus === 'OFFLOADED'
                              ? 'bg-amber-500/10 text-amber-400'
                              : 'bg-slate-500/10 text-slate-400'
                          }`}
                        >
                          {p.apbStatus}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-[11px] text-slate-400 italic">
                        {p.remarks}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div
          className={`p-3 sm:px-5 border-t flex flex-wrap items-center justify-between gap-3 text-xs ${
            isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-[#161922] border-white/10 text-slate-400'
          }`}
        >
          <div className="text-[11px] font-mono">
            Showing {filteredPassengers.length} of {totalPax} passenger records. Reconciles with canonical flight data.
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadEnhancedManifestTxt(manifest)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded bg-sky-500 hover:bg-sky-600 text-white transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export TXT</span>
            </button>
            <button
              onClick={onClose}
              className={`px-3 py-1.5 text-xs font-bold uppercase rounded border transition ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
              }`}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
