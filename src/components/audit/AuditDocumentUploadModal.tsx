/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ManifestAuditCase,
  AuditEvidenceSource,
} from '../../types/manifestAudit';
import {
  evaluateLimitedReleaseMatch,
  evaluateExcessBaggageMatch,
} from '../../lib/auditMatchingEngine';
import {
  X,
  FileText,
  Upload,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Shield,
  Save,
} from 'lucide-react';

interface AuditDocumentUploadModalProps {
  auditCase: ManifestAuditCase;
  isOpen: boolean;
  onClose: () => void;
  onSaveCase: (updatedCase: ManifestAuditCase, message: string) => void;
  theme: 'light' | 'dark';
}

export default function AuditDocumentUploadModal({
  auditCase,
  isOpen,
  onClose,
  onSaveCase,
  theme,
}: AuditDocumentUploadModalProps) {
  if (!isOpen) return null;

  const isLight = theme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: string;
    type: string;
  } | null>(null);

  const [evidenceType, setEvidenceType] = useState<
    'DOCUMENT' | 'RECEIPT' | 'SIGNED_RELEASE' | 'MANUAL_STATION_FORM'
  >(
    auditCase.checkType === 'LIMITED_RELEASE'
      ? 'SIGNED_RELEASE'
      : auditCase.checkType === 'EXCESS_BAGGAGE'
      ? 'RECEIPT'
      : 'DOCUMENT'
  );

  // Manual verification fields
  const [documentAttached, setDocumentAttached] = useState(true);
  const [passengerRefMatch, setPassengerRefMatch] = useState(true);
  const [bagTagMatch, setBagTagMatch] = useState(true);
  const [signatureConfirmed, setSignatureConfirmed] = useState(
    auditCase.checkType === 'LIMITED_RELEASE' ? true : false
  );
  const [evidenceNote, setEvidenceNote] = useState('');
  const [uploaderName, setUploaderName] = useState('Station Document Officer');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate supported formats
    const validExtensions = ['pdf', 'jpg', 'jpeg', 'png'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!validExtensions.includes(ext)) {
      setErrorMessage('Unsupported evidence format. Please upload PDF, JPG, or PNG files.');
      setSelectedFile(null);
      return;
    }

    setErrorMessage(null);
    setSelectedFile({
      name: file.name,
      size: `${Math.round(file.size / 1024) || 1} KB`,
      type: file.type || 'application/octet-stream',
    });
  };

  const handleSaveEvidence = () => {
    if (!selectedFile && !documentAttached) {
      setErrorMessage('Evidence required before this case can be marked verified.');
      return;
    }

    const now = new Date().toISOString();
    const fileName =
      selectedFile?.name ||
      `${auditCase.station}_${auditCase.checkType}_${auditCase.flightNumber}_Evidence.pdf`;

    const newEvidence: AuditEvidenceSource = {
      id: `EVD-DOC-${Date.now()}`,
      type: evidenceType,
      filename: fileName,
      fileSize: selectedFile?.size || '520 KB',
      fileType: selectedFile?.type || 'application/pdf',
      uploadedAt: now,
      uploadedBy: uploaderName,
      status: documentAttached && passengerRefMatch && (auditCase.checkType !== 'LIMITED_RELEASE' || signatureConfirmed) ? 'VALID' : 'UNVERIFIED',
      note: evidenceNote || `Station evidence uploaded for ${auditCase.passengerName}`,
      documentAttached,
      passengerRefMatch,
      bagTagMatch,
      signatureConfirmed,
    };

    let updatedCase: ManifestAuditCase = {
      ...auditCase,
      evidenceSources: [...auditCase.evidenceSources, newEvidence],
      updatedAt: now,
    };

    // Re-evaluate matching result based on updated evidence
    if (auditCase.checkType === 'LIMITED_RELEASE' && auditCase.limitedRelease) {
      const updatedLR = {
        ...auditCase.limitedRelease,
        documentAttached,
        passengerRefMatch,
        bagTagMatch,
        signatureConfirmed,
        waiverAcceptedDate: signatureConfirmed ? now : auditCase.limitedRelease.waiverAcceptedDate,
      };

      const matchResult = evaluateLimitedReleaseMatch(updatedLR);
      updatedCase = {
        ...updatedCase,
        limitedRelease: updatedLR,
        findings: matchResult.findings,
        status: matchResult.status,
      };
    } else if (auditCase.checkType === 'EXCESS_BAGGAGE' && auditCase.excessBaggage) {
      const matchResult = evaluateExcessBaggageMatch(auditCase.excessBaggage, documentAttached);
      updatedCase = {
        ...updatedCase,
        findings: matchResult.findings,
        status: matchResult.status,
      };
    }

    onSaveCase(updatedCase, `Evidence document successfully attached to Case ${auditCase.id}.`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
          isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-[#0F1117] border-white/15 text-white'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#161922] border-white/10'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Attach Supporting Document Evidence</h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Case {auditCase.id} • {auditCase.passengerName}
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {/* File Picker */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition ${
              isLight
                ? 'border-slate-300 hover:border-sky-500 bg-slate-50/50 hover:bg-sky-50/20'
                : 'border-white/15 hover:border-sky-500/50 bg-[#161922]/50 hover:bg-sky-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              className="hidden"
            />
            <Upload className="w-6 h-6 mx-auto text-sky-400 mb-1.5" />
            {selectedFile ? (
              <div className="space-y-0.5">
                <span className="font-bold text-xs text-emerald-400">{selectedFile.name}</span>
                <p className="text-[10px] text-slate-400">
                  Size: {selectedFile.size} • Type: {selectedFile.type}
                </p>
              </div>
            ) : (
              <div>
                <p className="font-bold text-xs">Upload Scanned Document (PDF, JPG, PNG)</p>
                <p className={`text-[10px] mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  Signed Limited Release, EBT payment receipt, or counter form
                </p>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">Evidence Category</label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value as any)}
                className={`w-full rounded border px-3 py-2 text-xs font-bold outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1F2430] border-white/15 text-white'
                }`}
              >
                <option value="SIGNED_RELEASE">SIGNED LIMITED RELEASE FORM</option>
                <option value="RECEIPT">EBT / PAYMENT EDC RECEIPT</option>
                <option value="MANUAL_STATION_FORM">STATION MANUAL FORM / VOUCHER</option>
                <option value="DOCUMENT">GENERAL SUPPORTING DOCUMENT</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">Uploader Officer / Role</label>
              <input
                type="text"
                value={uploaderName}
                onChange={(e) => setUploaderName(e.target.value)}
                className={`w-full rounded border px-3 py-2 text-xs outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1F2430] border-white/15 text-white'
                }`}
              />
            </div>
          </div>

          {/* Manual Verification Checkboxes */}
          <div
            className={`p-3.5 rounded-lg border space-y-2.5 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#161922] border-white/10'
            }`}
          >
            <span className="block font-bold text-[10px] uppercase text-slate-400">
              Manual Evidence Verification Protocol
            </span>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={documentAttached}
                  onChange={(e) => setDocumentAttached(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0"
                />
                <span className="font-semibold">Document Attached & Legible</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={passengerRefMatch}
                  onChange={(e) => setPassengerRefMatch(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0"
                />
                <span className="font-semibold">Passenger & PNR Reference Match</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bagTagMatch}
                  onChange={(e) => setBagTagMatch(e.target.checked)}
                  className="rounded text-sky-500 focus:ring-0"
                />
                <span className="font-semibold">Baggage Tag # Matched</span>
              </label>

              {auditCase.checkType === 'LIMITED_RELEASE' && (
                <label className="flex items-center gap-2 cursor-pointer text-amber-400 font-bold">
                  <input
                    type="checkbox"
                    checked={signatureConfirmed}
                    onChange={(e) => setSignatureConfirmed(e.target.checked)}
                    className="rounded text-amber-500 focus:ring-0"
                  />
                  <span>Passenger Physical Signature Confirmed</span>
                </label>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">Verification Notes</label>
            <textarea
              rows={2}
              value={evidenceNote}
              onChange={(e) => setEvidenceNote(e.target.value)}
              placeholder="e.g. Scanned copy verified against station file pouch."
              className={`w-full rounded border p-2.5 text-xs outline-none resize-none ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1F2430] border-white/15 text-white'
              }`}
            />
          </div>
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#161922] border-white/10'
          }`}
        >
          <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Evidence acts as supporting proof
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
              onClick={handleSaveEvidence}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" /> Attach & Re-Verify Case
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
