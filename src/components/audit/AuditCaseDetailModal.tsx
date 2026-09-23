/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  ManifestAuditCase,
  ManifestAuditStatus,
} from '../../types/manifestAudit';
import {
  X,
  Shield,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  HelpCircle,
  UploadCloud,
  FileCheck,
  UserCheck,
  Save,
  Tag,
  Scale,
  DollarSign,
  Briefcase,
} from 'lucide-react';

interface AuditCaseDetailModalProps {
  auditCase: ManifestAuditCase;
  isOpen: boolean;
  onClose: () => void;
  onSaveCase: (updated: ManifestAuditCase) => void;
  onOpenUploadDoc: (auditCase: ManifestAuditCase) => void;
  theme: 'light' | 'dark';
}

export default function AuditCaseDetailModal({
  auditCase,
  isOpen,
  onClose,
  onSaveCase,
  onOpenUploadDoc,
  theme,
}: AuditCaseDetailModalProps) {
  if (!isOpen) return null;

  const isLight = theme === 'light';

  const [status, setStatus] = useState<ManifestAuditStatus>(auditCase.status);
  const [reviewer, setReviewer] = useState(auditCase.reviewer || 'HQ Operations Auditor');
  const [reviewerNotes, setReviewerNotes] = useState(auditCase.reviewerNotes || '');
  const [activeTab, setActiveTab] = useState<'COMPARISON' | 'EVIDENCE' | 'INVESTIGATION'>('COMPARISON');

  const handleSave = () => {
    const updated: ManifestAuditCase = {
      ...auditCase,
      status,
      reviewer,
      reviewerNotes,
      reviewedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onSaveCase(updated);
  };

  const getStatusBadge = (st: ManifestAuditStatus) => {
    switch (st) {
      case 'MATCHED':
        return isLight
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DISCREPANCY':
        return isLight
          ? 'bg-rose-100 text-rose-800 border-rose-300'
          : 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse';
      case 'MISSING_EVIDENCE':
        return isLight
          ? 'bg-amber-100 text-amber-800 border-amber-300'
          : 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'UNDER_REVIEW':
        return isLight
          ? 'bg-sky-100 text-sky-800 border-sky-300'
          : 'bg-sky-500/10 text-sky-400 border-sky-500/30';
      case 'RESOLVED':
        return isLight
          ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
          : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      default:
        return isLight
          ? 'bg-slate-100 text-slate-700 border-slate-300'
          : 'bg-white/5 text-slate-400 border-white/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-4xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0F1117] border-white/15 text-white'
        }`}
      >
        {/* Modal Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#161922] border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-lg border ${
                auditCase.checkType === 'CHECK_IN_IR'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : auditCase.checkType === 'EXCESS_BAGGAGE'
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-purple-500/10 text-purple-400 border-purple-500/20'
              }`}
            >
              {auditCase.checkType === 'CHECK_IN_IR' && <FileCheck className="w-5 h-5" />}
              {auditCase.checkType === 'EXCESS_BAGGAGE' && <Briefcase className="w-5 h-5" />}
              {auditCase.checkType === 'LIMITED_RELEASE' && <Shield className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-black tracking-wider">{auditCase.id}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-black uppercase border ${getStatusBadge(
                    auditCase.status
                  )}`}
                >
                  {auditCase.status.replace('_', ' ')}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${
                    auditCase.severity === 'CRITICAL' || auditCase.severity === 'HIGH'
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                      : auditCase.severity === 'MEDIUM'
                      ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  }`}
                >
                  SEV: {auditCase.severity}
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {auditCase.checkType.replace(/_/g, ' ')} • Flight {auditCase.flightNumber} ({auditCase.route}) •{' '}
                {auditCase.flightDate}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition ${
              isLight ? 'hover:bg-slate-200 text-slate-500' : 'hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body with Scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Section 1: Context Banner */}
          <div
            className={`grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-lg border text-xs ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-white/10'
            }`}
          >
            <div>
              <span className={`block font-bold text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Passenger Name
              </span>
              <span className="font-bold text-xs font-mono">{auditCase.passengerName}</span>
            </div>
            <div>
              <span className={`block font-bold text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                PNR / Booking Ref
              </span>
              <span className="font-bold text-xs font-mono text-sky-400">{auditCase.pnr}</span>
            </div>
            <div>
              <span className={`block font-bold text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                Station & Route
              </span>
              <span className="font-bold text-xs">
                {auditCase.station} ({auditCase.route})
              </span>
            </div>
            <div>
              <span className={`block font-bold text-[10px] uppercase ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
                System Source Feed
              </span>
              <span className="font-bold text-xs font-mono text-indigo-400">
                {auditCase.systemSource.type} ({auditCase.systemSource.sourceLabel})
              </span>
            </div>
          </div>

          {/* Section 2: Source Separation View (System Source vs Supporting Evidence) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* System Source Card */}
            <div
              className={`p-4 rounded-lg border space-y-2.5 ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#12151D] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">System Source Record</h4>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-bold">
                  {auditCase.systemSource.type}
                </span>
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Reference ID:</span>
                  <span className="font-mono font-bold">{auditCase.systemSource.referenceId || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Sync Timestamp:</span>
                  <span className="font-mono text-[11px]">
                    {new Date(auditCase.systemSource.lastSyncTimestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}{' '}
                    UTC
                  </span>
                </div>
                {auditCase.systemSource.details && (
                  <div
                    className={`mt-2 p-2 rounded text-[11px] font-mono space-y-1 ${
                      isLight ? 'bg-slate-100 text-slate-800' : 'bg-[#1A1D27] text-slate-300'
                    }`}
                  >
                    {Object.entries(auditCase.systemSource.details).map(([k, v]) => (
                      <div key={k} className="flex justify-between">
                        <span className="text-slate-500">{k}:</span>
                        <span className="font-bold">{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Supporting Evidence Card */}
            <div
              className={`p-4 rounded-lg border space-y-2.5 ${
                isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#12151D] border-white/10'
              }`}
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider">Supporting Evidence</h4>
                </div>
                <button
                  onClick={() => onOpenUploadDoc(auditCase)}
                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  <UploadCloud className="w-3 h-3" /> Attach Document
                </button>
              </div>

              {auditCase.evidenceSources.length === 0 ? (
                <div
                  className={`p-4 rounded-lg text-center text-xs space-y-2 ${
                    isLight ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  <AlertTriangle className="w-5 h-5 mx-auto" />
                  <p className="font-bold">No physical or spreadsheet evidence attached.</p>
                  <p className="text-[10px] opacity-80">
                    Upload receipt, scanned baggage voucher, or Excel station log to verify.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {auditCase.evidenceSources.map((evd) => (
                    <div
                      key={evd.id}
                      className={`p-2.5 rounded-lg border text-xs space-y-1 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D27] border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold truncate max-w-[200px]">
                          <FileText className="w-3.5 h-3.5 text-sky-400" />
                          <span className="truncate">{evd.filename || 'Evidence Record'}</span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">{evd.status}</span>
                      </div>
                      <div className={`text-[10px] flex justify-between ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                        <span>By: {evd.uploadedBy || 'Station Staff'}</span>
                        <span>{evd.fileSize || 'Standard Document'}</span>
                      </div>
                      {evd.note && (
                        <p className={`text-[11px] italic mt-1 ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                          "{evd.note}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Detailed Field-by-Field Matching Comparison Table */}
          <div
            className={`p-4 rounded-lg border space-y-3 ${
              isLight ? 'bg-white border-slate-200 shadow-xs' : 'bg-[#12151D] border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                <Tag className="w-4 h-4 text-sky-400" /> Field-by-Field Matching & Discrepancy Matrix
              </h4>
              <div className="flex items-center gap-1.5">
                {auditCase.findings.map((f, idx) => (
                  <span
                    key={idx}
                    className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold border ${
                      f === 'MATCHED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}
                  >
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Check Type Specific Field Comparison Table */}
            {auditCase.checkType === 'EXCESS_BAGGAGE' && auditCase.excessBaggage && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr
                      className={`text-[10px] uppercase font-bold border-b ${
                        isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-[#1A1D27] text-slate-400 border-white/10'
                      }`}
                    >
                      <th className="px-3 py-2">Verification Field</th>
                      <th className="px-3 py-2">System Record (Sabre)</th>
                      <th className="px-3 py-2">Supporting Evidence (Receipt / Scale)</th>
                      <th className="px-3 py-2 text-center">Result</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Bag Tag #</td>
                      <td className="px-3 py-2">{auditCase.excessBaggage.bagTag}</td>
                      <td className="px-3 py-2">{auditCase.excessBaggage.bagTag}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-[10px] font-bold text-emerald-400">MATCH</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Pieces (Bags)</td>
                      <td className="px-3 py-2">{auditCase.excessBaggage.pieces} PC</td>
                      <td className="px-3 py-2">
                        {auditCase.excessBaggage.evidencePieces !== undefined
                          ? `${auditCase.excessBaggage.evidencePieces} PC`
                          : 'PENDING'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {auditCase.excessBaggage.evidencePieces === auditCase.excessBaggage.pieces ? (
                          <span className="text-[10px] font-bold text-emerald-400">MATCH</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400">MISMATCH</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Actual Weight</td>
                      <td className="px-3 py-2">{auditCase.excessBaggage.actualWeightKg} KG</td>
                      <td className="px-3 py-2 font-bold">
                        {auditCase.excessBaggage.evidenceWeightKg !== undefined
                          ? `${auditCase.excessBaggage.evidenceWeightKg} KG`
                          : 'PENDING'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {auditCase.excessBaggage.evidenceWeightKg === undefined ? (
                          <span className="text-[10px] font-bold text-amber-400">NO EVIDENCE</span>
                        ) : auditCase.excessBaggage.evidenceWeightKg === auditCase.excessBaggage.actualWeightKg ? (
                          <span className="text-[10px] font-bold text-emerald-400">MATCH</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 animate-pulse">DISCREPANCY</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Excess Weight</td>
                      <td className="px-3 py-2">{auditCase.excessBaggage.excessKg} KG</td>
                      <td className="px-3 py-2">
                        {auditCase.excessBaggage.evidenceExcessKg !== undefined
                          ? `${auditCase.excessBaggage.evidenceExcessKg} KG`
                          : 'PENDING'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {auditCase.excessBaggage.evidenceExcessKg === auditCase.excessBaggage.excessKg ? (
                          <span className="text-[10px] font-bold text-emerald-400">MATCH</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400">MISMATCH</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Charge Amount</td>
                      <td className="px-3 py-2">
                        {auditCase.excessBaggage.currency} {auditCase.excessBaggage.chargeAmount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-bold">
                        {auditCase.excessBaggage.evidenceChargeAmount !== undefined
                          ? `${auditCase.excessBaggage.currency} ${auditCase.excessBaggage.evidenceChargeAmount.toLocaleString()}`
                          : 'PENDING'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {auditCase.excessBaggage.evidenceChargeAmount === undefined ? (
                          <span className="text-[10px] font-bold text-amber-400">NO EVIDENCE</span>
                        ) : auditCase.excessBaggage.evidenceChargeAmount === auditCase.excessBaggage.chargeAmount ? (
                          <span className="text-[10px] font-bold text-emerald-400">MATCH</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 animate-pulse">DISCREPANCY</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Receipt / EBT #</td>
                      <td className="px-3 py-2">{auditCase.excessBaggage.receiptNo || 'MISSING'}</td>
                      <td className="px-3 py-2">{auditCase.excessBaggage.evidenceReceiptNo || 'MISSING'}</td>
                      <td className="px-3 py-2 text-center">
                        {auditCase.excessBaggage.evidenceReceiptNo ? (
                          <span className="text-[10px] font-bold text-emerald-400">VERIFIED</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400">MISSING PAYMENT</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Limited Release Specific Comparison Table */}
            {auditCase.checkType === 'LIMITED_RELEASE' && auditCase.limitedRelease && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr
                      className={`text-[10px] uppercase font-bold border-b ${
                        isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-[#1A1D27] text-slate-400 border-white/10'
                      }`}
                    >
                      <th className="px-3 py-2">Verification Item</th>
                      <th className="px-3 py-2">System Standard Requirement</th>
                      <th className="px-3 py-2">Ground Evidence Assessment</th>
                      <th className="px-3 py-2 text-center">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Limited Release Tag</td>
                      <td className="px-3 py-2">{auditCase.limitedRelease.bagTag}</td>
                      <td className="px-3 py-2">{auditCase.limitedRelease.bagTag}</td>
                      <td className="px-3 py-2 text-center">
                        {auditCase.limitedRelease.bagTagMatch ? (
                          <span className="text-[10px] font-bold text-emerald-400">CONFIRMED</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400">TAG MISMATCH</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Waiver Reason</td>
                      <td className="px-3 py-2">{auditCase.limitedRelease.reason}</td>
                      <td className="px-3 py-2">{auditCase.limitedRelease.reasonDescription || 'Standard Category'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="text-[10px] font-bold text-sky-400">VALID CATEGORY</span>
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Physical Form Attached</td>
                      <td className="px-3 py-2">MANDATORY (PDF / Scan)</td>
                      <td className="px-3 py-2">
                        {auditCase.limitedRelease.documentAttached ? 'Document Uploaded' : 'MISSING FROM PACKET'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {auditCase.limitedRelease.documentAttached ? (
                          <span className="text-[10px] font-bold text-emerald-400">PRESENT</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 animate-pulse">MISSING</span>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 font-sans font-bold">Passenger Signature</td>
                      <td className="px-3 py-2">MANDATORY INDEMNITY</td>
                      <td className="px-3 py-2">
                        {auditCase.limitedRelease.signatureConfirmed ? 'Signature Verified' : 'UNSIGNED / INCOMPLETE'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {auditCase.limitedRelease.signatureConfirmed ? (
                          <span className="text-[10px] font-bold text-emerald-400">CONFIRMED</span>
                        ) : (
                          <span className="text-[10px] font-bold text-rose-400 animate-pulse">MISSING SIGNATURE</span>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* Check-In IR Specific Comparison Table */}
            {auditCase.checkType === 'CHECK_IN_IR' && auditCase.checkInIR && (
              <div className="space-y-3">
                <div
                  className={`p-3 rounded-lg border text-xs space-y-1.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#1A1D27] border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sky-400">
                      Scenario [{auditCase.checkInIR.scenarioId}]: {auditCase.checkInIR.scenarioName}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-400">Configurable Candidate Model</span>
                  </div>
                  <p className={`text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {auditCase.checkInIR.discrepancyDescription}
                  </p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr
                        className={`text-[10px] uppercase font-bold border-b ${
                          isLight ? 'bg-slate-100 text-slate-600 border-slate-200' : 'bg-[#1A1D27] text-slate-400 border-white/10'
                        }`}
                      >
                        <th className="px-3 py-2">IR Parameter</th>
                        <th className="px-3 py-2">Central Sabre Feed</th>
                        <th className="px-3 py-2">Gate / Station Record</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-mono ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                      <tr>
                        <td className="px-3 py-2 font-sans font-bold">Check-In Status</td>
                        <td className="px-3 py-2">{auditCase.checkInIR.systemStatus}</td>
                        <td className="px-3 py-2">{auditCase.checkInIR.evidenceStatus}</td>
                        <td className="px-3 py-2 text-center">
                          {auditCase.checkInIR.systemStatus === auditCase.checkInIR.evidenceStatus ? (
                            <span className="text-[10px] font-bold text-emerald-400">MATCH</span>
                          ) : (
                            <span className="text-[10px] font-bold text-rose-400">MISMATCH</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-sans font-bold">Sequence & Seat</td>
                        <td className="px-3 py-2">
                          Seq: {auditCase.systemSource.details?.sequence || 'N/A'} | Seat:{' '}
                          {auditCase.systemSource.details?.seat || 'N/A'}
                        </td>
                        <td className="px-3 py-2">
                          Seq: {auditCase.checkInIR.checkInSequence || 'N/A'} | Seat:{' '}
                          {auditCase.checkInIR.seat || 'N/A'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {auditCase.checkInIR.seat === auditCase.systemSource.details?.seat ? (
                            <span className="text-[10px] font-bold text-emerald-400">MATCH</span>
                          ) : (
                            <span className="text-[10px] font-bold text-amber-400">VARIATION</span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="px-3 py-2 font-sans font-bold">Transaction Ref</td>
                        <td className="px-3 py-2">{auditCase.checkInIR.systemTransactionRef || 'N/A'}</td>
                        <td className="px-3 py-2">{auditCase.checkInIR.evidenceTransactionRef || 'N/A'}</td>
                        <td className="px-3 py-2 text-center">
                          <span className="text-[10px] font-bold text-sky-400">RECORDED</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {auditCase.checkInIR.investigationSteps && (
                  <div className="space-y-1 text-xs">
                    <span className="font-bold text-[10px] uppercase text-slate-400">Recommended Next Steps:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-300">
                      {auditCase.checkInIR.investigationSteps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 4: Review & Audit Workflow Action Panel */}
          <div
            className={`p-4 rounded-lg border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-white/10'
            }`}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" /> Audit Resolution & Reviewer Notes
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                  Update Audit Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ManifestAuditStatus)}
                  className={`w-full rounded border px-3 py-2 text-xs font-bold outline-none ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#1F2430] border-white/15 text-white'
                  }`}
                >
                  <option value="PENDING">PENDING</option>
                  <option value="UNDER_REVIEW">UNDER REVIEW</option>
                  <option value="MATCHED">MATCHED (VERIFIED)</option>
                  <option value="DISCREPANCY">DISCREPANCY (EXCEPTION)</option>
                  <option value="MISSING_EVIDENCE">MISSING EVIDENCE</option>
                  <option value="RESOLVED">RESOLVED (OVERRIDDEN / CLOSED)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">Reviewer Name / ID</label>
                <input
                  type="text"
                  value={reviewer}
                  onChange={(e) => setReviewer(e.target.value)}
                  placeholder="e.g. Audit Lead CGK"
                  className={`w-full rounded border px-3 py-2 text-xs outline-none ${
                    isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#1F2430] border-white/15 text-white'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">Reviewer Assessment Remarks</label>
              <textarea
                rows={3}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Enter audit reconciliation notes, discrepancy root cause, or waiver references..."
                className={`w-full rounded border p-2.5 text-xs outline-none resize-none ${
                  isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#1F2430] border-white/15 text-white'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#161922] border-white/10'
          }`}
        >
          <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Audit Case ID: <strong className="font-mono text-white">{auditCase.id}</strong> • Last Updated:{' '}
            {new Date(auditCase.updatedAt).toLocaleTimeString()}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className={`px-3 py-1.5 rounded text-xs font-bold border transition cursor-pointer ${
                isLight
                  ? 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-sky-600 text-white hover:bg-sky-500 shadow-sm transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Save Audit Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
