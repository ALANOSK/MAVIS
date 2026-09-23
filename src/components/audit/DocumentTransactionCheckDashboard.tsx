/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ManifestAuditCase,
  ManifestAuditCheckType,
  ManifestAuditStatus,
  AuditSeverity,
  AuditSourceType,
  AuditKPIStats,
} from '../../types/manifestAudit';
import {
  getStoredAuditCases,
  saveStoredAuditCases,
  resetAuditCasesToDefault,
  calculateAuditKPIs,
} from '../../lib/auditMatchingEngine';
import AuditCaseDetailModal from './AuditCaseDetailModal';
import AuditExcelImportModal from './AuditExcelImportModal';
import AuditDocumentUploadModal from './AuditDocumentUploadModal';
import {
  FileCheck,
  Briefcase,
  Shield,
  Search,
  Filter,
  FileSpreadsheet,
  UploadCloud,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Eye,
  Database,
  Radio,
  FileText,
  SlidersHorizontal,
} from 'lucide-react';

interface DocumentTransactionCheckDashboardProps {
  theme: 'light' | 'dark';
  addToast: (msg: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

export default function DocumentTransactionCheckDashboard({
  theme,
  addToast,
}: DocumentTransactionCheckDashboardProps) {
  const isLight = theme === 'light';

  // Isolated store state
  const [cases, setCases] = useState<ManifestAuditCase[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | ManifestAuditCheckType>('ALL');

  // Filters (Isolated purely to this module)
  const [searchQuery, setSearchQuery] = useState('');
  const [stationFilter, setStationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');

  // Active Modals state
  const [selectedCaseForDetail, setSelectedCaseForDetail] = useState<ManifestAuditCase | null>(null);
  const [selectedCaseForUpload, setSelectedCaseForUpload] = useState<ManifestAuditCase | null>(null);
  const [isExcelImportOpen, setIsExcelImportOpen] = useState(false);

  // Load isolated cases on mount
  useEffect(() => {
    const loaded = getStoredAuditCases();
    setCases(loaded);
  }, []);

  const handleUpdateCase = (updated: ManifestAuditCase) => {
    const nextCases = cases.map((c) => (c.id === updated.id ? updated : c));
    setCases(nextCases);
    saveStoredAuditCases(nextCases);
    setSelectedCaseForDetail(null);
    addToast(`Audit Case ${updated.id} status updated to ${updated.status}.`, 'success');
  };

  const handleSaveDocumentEvidence = (updated: ManifestAuditCase, msg: string) => {
    const nextCases = cases.map((c) => (c.id === updated.id ? updated : c));
    setCases(nextCases);
    saveStoredAuditCases(nextCases);
    setSelectedCaseForUpload(null);
    if (selectedCaseForDetail && selectedCaseForDetail.id === updated.id) {
      setSelectedCaseForDetail(updated);
    }
    addToast(msg, 'success');
  };

  const handleImportCompleted = (importedCases: ManifestAuditCase[], message: string) => {
    setCases(importedCases);
    saveStoredAuditCases(importedCases);
    setIsExcelImportOpen(false);
    addToast(message, 'success');
  };

  const handleResetData = () => {
    const res = resetAuditCasesToDefault();
    setCases(res);
    addToast('Audit cases reset to initial synthetic baseline.', 'info');
  };

  // KPIs for the 3 categories
  const checkInKpi = calculateAuditKPIs(cases, 'CHECK_IN_IR');
  const excessBagKpi = calculateAuditKPIs(cases, 'EXCESS_BAGGAGE');
  const limitedReleaseKpi = calculateAuditKPIs(cases, 'LIMITED_RELEASE');
  const overallKpi = calculateAuditKPIs(cases);

  // Filtered list
  const filteredCases = cases.filter((c) => {
    if (selectedCategory !== 'ALL' && c.checkType !== selectedCategory) return false;
    if (stationFilter !== 'ALL' && c.station !== stationFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    if (severityFilter !== 'ALL' && c.severity !== severityFilter) return false;
    if (sourceFilter !== 'ALL' && c.systemSource.type !== sourceFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchId = c.id.toLowerCase().includes(q);
      const matchPnr = c.pnr.toLowerCase().includes(q);
      const matchPax = c.passengerName.toLowerCase().includes(q);
      const matchFlt = c.flightNumber.toLowerCase().includes(q);
      const matchBag =
        c.excessBaggage?.bagTag.toLowerCase().includes(q) ||
        c.limitedRelease?.bagTag.toLowerCase().includes(q);
      if (!matchId && !matchPnr && !matchPax && !matchFlt && !matchBag) return false;
    }

    return true;
  });

  const getStatusBadgeClass = (st: ManifestAuditStatus) => {
    switch (st) {
      case 'MATCHED':
        return isLight
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'DISCREPANCY':
        return isLight
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse';
      case 'MISSING_EVIDENCE':
        return isLight
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'UNDER_REVIEW':
        return isLight
          ? 'bg-sky-100 text-sky-800 border-sky-300'
          : 'bg-sky-500/10 text-sky-400 border-sky-500/20';
      case 'RESOLVED':
        return isLight
          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
      default:
        return isLight
          ? 'bg-slate-100 text-slate-700 border-slate-300'
          : 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. DATA SOURCE CONTROL HEADER */}
      <div
        className={`p-4 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0F1117] border-white/10'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg border ${
                isLight ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              <Database className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xs uppercase tracking-wider">Sabre / System Feed</span>
                <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  SIMULATED BASELINE
                </span>
              </div>
              <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Source-agnostic framework ready for API or data bridge
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-2">
            <span
              className={`p-1.5 rounded-lg border ${
                isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              <Radio className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs uppercase">API Connector</span>
                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-500/10 text-slate-400 border border-slate-500/20 font-bold">
                  SIMULATED / FUTURE
                </span>
              </div>
              <p className={`text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                Endpoints abstracted behind domain interface
              </p>
            </div>
          </div>
        </div>

        {/* Source Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => setIsExcelImportOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" /> Upload Excel
          </button>
          <button
            onClick={() => {
              if (cases.length > 0) setSelectedCaseForUpload(cases[0]);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer ${
              isLight
                ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" /> Upload Document
          </button>
          <button
            onClick={handleResetData}
            title="Reset to synthetic demo dataset"
            className={`p-1.5 rounded-lg border transition cursor-pointer ${
              isLight
                ? 'border-slate-200 text-slate-500 hover:bg-slate-100'
                : 'border-white/10 text-slate-400 hover:bg-white/5 hover:text-white'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MODULE LANDING PAGE - 3 PRIMARY AUDIT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: CHECK-IN IR */}
        <div
          className={`p-4 rounded-xl border transition duration-200 flex flex-col justify-between ${
            selectedCategory === 'CHECK_IN_IR'
              ? 'ring-2 ring-blue-500 border-transparent'
              : isLight
              ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              : 'bg-[#0F1117] border-white/10 hover:border-white/20'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Check-In IR</h3>
                  <span className="text-[10px] text-slate-400">Configurable Scenario Audit</span>
                </div>
              </div>
              <span className="font-mono font-black text-xl text-blue-400">{checkInKpi.totalCases}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Pending</span>
                <span className="font-mono font-bold text-xs text-sky-400">{checkInKpi.pending + checkInKpi.underReview}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Discrepancy</span>
                <span className="font-mono font-bold text-xs text-rose-400">{checkInKpi.discrepancies}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Matched</span>
                <span className="font-mono font-bold text-xs text-emerald-400">{checkInKpi.matched}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedCategory(selectedCategory === 'CHECK_IN_IR' ? 'ALL' : 'CHECK_IN_IR')}
            className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedCategory === 'CHECK_IN_IR'
                ? 'bg-blue-600 text-white shadow-sm'
                : isLight
                ? 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
            }`}
          >
            {selectedCategory === 'CHECK_IN_IR' ? 'Active Filter Selected' : 'Open Check'}{' '}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 2: EXCESS BAGGAGE */}
        <div
          className={`p-4 rounded-xl border transition duration-200 flex flex-col justify-between ${
            selectedCategory === 'EXCESS_BAGGAGE'
              ? 'ring-2 ring-amber-500 border-transparent'
              : isLight
              ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              : 'bg-[#0F1117] border-white/10 hover:border-white/20'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Excess Baggage</h3>
                  <span className="text-[10px] text-slate-400">Scale Weight & EBT Receipt</span>
                </div>
              </div>
              <span className="font-mono font-black text-xl text-amber-400">{excessBagKpi.totalCases}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Pending</span>
                <span className="font-mono font-bold text-xs text-sky-400">{excessBagKpi.pending + excessBagKpi.underReview}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Discrepancy</span>
                <span className="font-mono font-bold text-xs text-rose-400">{excessBagKpi.discrepancies}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Missing Evd</span>
                <span className="font-mono font-bold text-xs text-amber-400">{excessBagKpi.missingEvidence}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedCategory(selectedCategory === 'EXCESS_BAGGAGE' ? 'ALL' : 'EXCESS_BAGGAGE')}
            className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedCategory === 'EXCESS_BAGGAGE'
                ? 'bg-amber-600 text-white shadow-sm'
                : isLight
                ? 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
            }`}
          >
            {selectedCategory === 'EXCESS_BAGGAGE' ? 'Active Filter Selected' : 'Open Check'}{' '}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Card 3: LIMITED RELEASE */}
        <div
          className={`p-4 rounded-xl border transition duration-200 flex flex-col justify-between ${
            selectedCategory === 'LIMITED_RELEASE'
              ? 'ring-2 ring-purple-500 border-transparent'
              : isLight
              ? 'bg-white border-slate-200 shadow-xs hover:border-slate-300'
              : 'bg-[#0F1117] border-white/10 hover:border-white/20'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">Limited Release</h3>
                  <span className="text-[10px] text-slate-400">Signed Indemnity Waiver</span>
                </div>
              </div>
              <span className="font-mono font-black text-xl text-purple-400">{limitedReleaseKpi.totalCases}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 text-center">
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Pending</span>
                <span className="font-mono font-bold text-xs text-sky-400">{limitedReleaseKpi.pending + limitedReleaseKpi.underReview}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Discrepancy</span>
                <span className="font-mono font-bold text-xs text-rose-400">{limitedReleaseKpi.discrepancies}</span>
              </div>
              <div>
                <span className="text-[9px] uppercase font-bold text-slate-400 block">Missing Doc</span>
                <span className="font-mono font-bold text-xs text-amber-400">{limitedReleaseKpi.missingEvidence}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setSelectedCategory(selectedCategory === 'LIMITED_RELEASE' ? 'ALL' : 'LIMITED_RELEASE')}
            className={`mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
              selectedCategory === 'LIMITED_RELEASE'
                ? 'bg-purple-600 text-white shadow-sm'
                : isLight
                ? 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                : 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
            }`}
          >
            {selectedCategory === 'LIMITED_RELEASE' ? 'Active Filter Selected' : 'Open Check'}{' '}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. ISOLATED WORKSPACE CONTROLS & FILTER BAR */}
      <div
        className={`p-3.5 rounded-xl border space-y-3 ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0F1117] border-white/10'
        }`}
      >
        {/* Category Tab Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 pb-3">
          <div className="flex flex-wrap items-center gap-1 text-[11px] font-bold uppercase">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedCategory === 'ALL'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              All Categories ({cases.length})
            </button>
            <button
              onClick={() => setSelectedCategory('CHECK_IN_IR')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedCategory === 'CHECK_IN_IR'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Check-In IR ({checkInKpi.totalCases})
            </button>
            <button
              onClick={() => setSelectedCategory('EXCESS_BAGGAGE')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedCategory === 'EXCESS_BAGGAGE'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Excess Baggage ({excessBagKpi.totalCases})
            </button>
            <button
              onClick={() => setSelectedCategory('LIMITED_RELEASE')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer ${
                selectedCategory === 'LIMITED_RELEASE'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-700 hover:bg-slate-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Limited Release ({limitedReleaseKpi.totalCases})
            </button>
          </div>

          <span className="text-[11px] font-mono text-slate-400 font-semibold">
            Showing <strong>{filteredCases.length}</strong> of {cases.length} records
          </span>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          {/* Search Box */}
          <div className="relative md:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search PNR, Passenger, Bag Tag, Case ID, Flight..."
              className={`w-full rounded-lg border py-2 pl-9 pr-3 text-xs outline-none focus:border-sky-500 ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400'
                  : 'bg-[#161922] border-white/10 text-white placeholder-slate-500 focus:border-sky-500/50'
              }`}
            />
          </div>

          {/* Station Filter */}
          <div>
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#161922] border-white/10 text-white'
              }`}
            >
              <option value="ALL">All Stations</option>
              <option value="CGK">CGK (Jakarta)</option>
              <option value="DPS">DPS (Denpasar)</option>
              <option value="SUB">SUB (Surabaya)</option>
              <option value="UPG">UPG (Makassar)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#161922] border-white/10 text-white'
              }`}
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING</option>
              <option value="UNDER_REVIEW">UNDER REVIEW</option>
              <option value="MATCHED">MATCHED</option>
              <option value="DISCREPANCY">DISCREPANCY</option>
              <option value="MISSING_EVIDENCE">MISSING EVIDENCE</option>
              <option value="RESOLVED">RESOLVED</option>
            </select>
          </div>

          {/* Severity Filter */}
          <div>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className={`w-full rounded-lg border px-3 py-2 text-xs outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#161922] border-white/10 text-white'
              }`}
            >
              <option value="ALL">All Severities</option>
              <option value="HIGH">HIGH & CRITICAL</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>
          </div>
        </div>
      </div>

      {/* 4. AUDIT CASES MASTER TABLE */}
      <div
        className={`rounded-xl border overflow-hidden ${
          isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#0F1117] border-white/10'
        }`}
      >
        <div className="w-full overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr
                className={`uppercase font-bold text-[10px] tracking-wider border-b ${
                  isLight
                    ? 'bg-slate-100/90 text-slate-700 border-slate-200'
                    : 'bg-[#161922] text-slate-400 border-white/10'
                }`}
              >
                <th className="px-3 py-3 whitespace-nowrap">Case ID / Check Type</th>
                <th className="px-3 py-3 whitespace-nowrap">Flight / Route / Date</th>
                <th className="px-3 py-3 whitespace-nowrap">Passenger & PNR</th>
                <th className="px-3 py-3 whitespace-nowrap">System Source vs Evidence</th>
                <th className="px-3 py-3 whitespace-nowrap">Audit Findings</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Status</th>
                <th className="px-3 py-3 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200 text-slate-800' : 'divide-white/5 text-slate-300'}`}>
              {filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    <p className="font-bold text-xs">No audit cases match the selected filter criteria.</p>
                    <button
                      onClick={() => {
                        setSelectedCategory('ALL');
                        setStationFilter('ALL');
                        setStatusFilter('ALL');
                        setSearchQuery('');
                      }}
                      className="mt-2 text-[11px] text-sky-400 hover:underline cursor-pointer"
                    >
                      Clear all filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredCases.map((ac) => {
                  const hasEvidence = ac.evidenceSources.length > 0;

                  return (
                    <tr
                      key={ac.id}
                      onClick={() => setSelectedCaseForDetail(ac)}
                      className={`cursor-pointer transition duration-150 ${
                        isLight ? 'hover:bg-slate-50' : 'hover:bg-[#161922]'
                      }`}
                    >
                      {/* Case ID & Check Type */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs">{ac.id}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase border ${
                              ac.checkType === 'CHECK_IN_IR'
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : ac.checkType === 'EXCESS_BAGGAGE'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            }`}
                          >
                            {ac.checkType === 'CHECK_IN_IR'
                              ? 'CHECK-IN IR'
                              : ac.checkType === 'EXCESS_BAGGAGE'
                              ? 'EXCESS BAG'
                              : 'LTD RELEASE'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Station: <strong>{ac.station}</strong> • Sev: {ac.severity}
                        </div>
                      </td>

                      {/* Flight / Route / Date */}
                      <td className="px-3 py-3">
                        <div className="font-bold text-xs font-mono">{ac.flightNumber}</div>
                        <div className="text-[10px] text-slate-400">
                          {ac.route} • {ac.flightDate}
                        </div>
                      </td>

                      {/* Passenger & PNR */}
                      <td className="px-3 py-3">
                        <div className="font-bold text-xs truncate max-w-[150px]">{ac.passengerName}</div>
                        <div className="font-mono text-[10px] text-sky-400 font-bold">PNR: {ac.pnr}</div>
                      </td>

                      {/* System Source vs Evidence */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="font-bold font-mono text-indigo-400">SYS: {ac.systemSource.type}</span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-400 truncate max-w-[100px]">
                              {ac.systemSource.referenceId || 'SYNCED'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px]">
                            {hasEvidence ? (
                              <span className="text-emerald-400 font-bold flex items-center gap-1">
                                <FileText className="w-3 h-3" /> {ac.evidenceSources.length} Evidence Attached
                              </span>
                            ) : (
                              <span className="text-amber-400 font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Missing Evidence
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Audit Findings */}
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {ac.findings.map((f, i) => (
                            <span
                              key={i}
                              className={`px-1.5 py-0.2 rounded text-[9px] font-mono font-bold border ${
                                f === 'MATCHED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                              }`}
                            >
                              {f.replace(/_/g, ' ')}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusBadgeClass(
                            ac.status
                          )}`}
                        >
                          {ac.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-3 py-3 text-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCaseForDetail(ac);
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-bold border transition cursor-pointer flex items-center gap-1 mx-auto ${
                            isLight
                              ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                              : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white'
                          }`}
                        >
                          <Eye className="w-3 h-3" /> Audit
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. MODALS & SUB-FLOWS */}
      {selectedCaseForDetail && (
        <AuditCaseDetailModal
          auditCase={selectedCaseForDetail}
          isOpen={!!selectedCaseForDetail}
          onClose={() => setSelectedCaseForDetail(null)}
          onSaveCase={handleUpdateCase}
          onOpenUploadDoc={(c) => {
            setSelectedCaseForDetail(null);
            setSelectedCaseForUpload(c);
          }}
          theme={theme}
        />
      )}

      {selectedCaseForUpload && (
        <AuditDocumentUploadModal
          auditCase={selectedCaseForUpload}
          isOpen={!!selectedCaseForUpload}
          onClose={() => setSelectedCaseForUpload(null)}
          onSaveCase={handleSaveDocumentEvidence}
          theme={theme}
        />
      )}

      {isExcelImportOpen && (
        <AuditExcelImportModal
          isOpen={isExcelImportOpen}
          onClose={() => setIsExcelImportOpen(false)}
          onImportCompleted={handleImportCompleted}
          existingCases={cases}
          theme={theme}
        />
      )}
    </div>
  );
}
