/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  ManifestAuditCase,
  ManifestAuditCheckType,
  AuditEvidenceSource,
} from '../../types/manifestAudit';
import {
  parseSpreadsheetText,
  SpreadsheetParseResult,
  evaluateExcessBaggageMatch,
} from '../../lib/auditMatchingEngine';
import {
  X,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Database,
  RefreshCw,
} from 'lucide-react';

interface AuditExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportCompleted: (importedCases: ManifestAuditCase[], message: string) => void;
  existingCases: ManifestAuditCase[];
  theme: 'light' | 'dark';
}

const SAMPLE_EXCESS_BAGGAGE_CSV = `Flight,Date,Station,PNR,Passenger,BagTag,Pieces,Weight,ExcessKG,Amount,ReceiptNo
JT-610,2026-08-27,CGK,B4K88Z,TANUWIJAYA / HARRY MR,JT-889102,2,32,12,600000,EBT-CGK-20260827-091
JT-712,2026-08-27,DPS,R5T66W,LESTARI / MAYA MS,JT-993214,1,31,11,550000,EBT-DPS-20260827-014
JT-530,2026-08-27,SUB,H3N88P,PRATAMA / REZA MR,JT-771203,2,29,9,350000,MAN-RCT-SUB-1082
JT-610,2026-08-27,CGK,Z9L33K,DARMAWAN / BUDI MR,JT-889128,1,28,8,400000,EBT-CGK-20260827-105`;

export default function AuditExcelImportModal({
  isOpen,
  onClose,
  onImportCompleted,
  existingCases,
  theme,
}: AuditExcelImportModalProps) {
  if (!isOpen) return null;

  const isLight = theme === 'light';
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [targetCategory, setTargetCategory] = useState<ManifestAuditCheckType>('EXCESS_BAGGAGE');
  const [parseResult, setParseResult] = useState<SpreadsheetParseResult | null>(null);
  const [rawText, setRawText] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMessage(null);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        if (!content || content.trim().length === 0) {
          setErrorMessage('Unable to read this file. File appears empty.');
          return;
        }
        setRawText(content);
        const result = parseSpreadsheetText(content, file.name, targetCategory);
        setParseResult(result);
      } catch (err) {
        setErrorMessage('Unable to read this file. Verify the spreadsheet format.');
      }
    };

    reader.onerror = () => {
      setErrorMessage('Failed to read file from disk.');
    };

    reader.readAsText(file);
  };

  const handleLoadSample = () => {
    setRawText(SAMPLE_EXCESS_BAGGAGE_CSV);
    const result = parseSpreadsheetText(SAMPLE_EXCESS_BAGGAGE_CSV, 'Sample_Excess_Baggage_Station_Log.csv', targetCategory);
    setParseResult(result);
    setErrorMessage(null);
  };

  const handleProcessImport = () => {
    if (!parseResult || parseResult.validRows === 0) {
      setErrorMessage('No valid rows found to import.');
      return;
    }

    setIsProcessing(true);

    try {
      const now = new Date().toISOString();
      const updatedCases: ManifestAuditCase[] = [...existingCases];
      let newCount = 0;
      let matchedCount = 0;

      parseResult.rows
        .filter((r) => r.isValid)
        .forEach((row, idx) => {
          // Check if case exists for this PNR or BagTag
          const existingIdx = updatedCases.findIndex(
            (c) =>
              c.checkType === targetCategory &&
              ((row.pnr && c.pnr.toUpperCase() === row.pnr.toUpperCase()) ||
                (row.bagTag &&
                  c.excessBaggage?.bagTag &&
                  c.excessBaggage.bagTag.toUpperCase() === row.bagTag.toUpperCase()))
          );

          const evidenceSource: AuditEvidenceSource = {
            id: `EVD-IMP-${Date.now()}-${idx}`,
            type: 'EXCEL',
            filename: parseResult.fileName,
            fileSize: `${Math.round(rawText.length / 1024) || 1} KB`,
            fileType: 'text/csv',
            uploadedAt: now,
            uploadedBy: 'HQ Excel Import Tool',
            status: 'VALID',
            note: `Imported via spreadsheet batch: ${parseResult.fileName}`,
            documentAttached: true,
            passengerRefMatch: true,
            bagTagMatch: true,
            evidenceData: row.raw,
          };

          if (existingIdx !== -1) {
            // Update existing case with new evidence and re-evaluate match
            const current = updatedCases[existingIdx];
            const updatedEb = current.excessBaggage
              ? {
                  ...current.excessBaggage,
                  evidencePieces: row.pieces,
                  evidenceWeightKg: row.weightKg,
                  evidenceExcessKg: row.excessKg,
                  evidenceChargeAmount: row.amount,
                  evidenceReceiptNo: row.receiptNo,
                }
              : undefined;

            const matchEval = updatedEb ? evaluateExcessBaggageMatch(updatedEb, true) : null;

            updatedCases[existingIdx] = {
              ...current,
              evidenceSources: [...current.evidenceSources, evidenceSource],
              excessBaggage: updatedEb,
              findings: matchEval ? matchEval.findings : current.findings,
              status: matchEval ? matchEval.status : current.status,
              updatedAt: now,
            };
            matchedCount++;
          } else {
            // Create new audit case from spreadsheet row
            const newCaseId = `AUD-IMP-${Date.now().toString().slice(-4)}-${idx + 1}`;
            const excessDetails = {
              bagTag: row.bagTag || `JT-IMP-${idx + 100}`,
              pieces: row.pieces || 1,
              allowanceKg: 20,
              actualWeightKg: row.weightKg || 25,
              excessKg: row.excessKg || 5,
              chargeAmount: row.amount || 250000,
              currency: 'IDR',
              receiptNo: row.receiptNo,
              evidencePieces: row.pieces,
              evidenceWeightKg: row.weightKg,
              evidenceExcessKg: row.excessKg,
              evidenceChargeAmount: row.amount,
              evidenceReceiptNo: row.receiptNo,
            };

            const matchEval = evaluateExcessBaggageMatch(excessDetails, true);

            const newCase: ManifestAuditCase = {
              id: newCaseId,
              checkType: targetCategory,
              flightNumber: row.flight || 'JT-610',
              flightDate: row.date || '2026-08-27',
              station: row.station || 'CGK',
              route: `${row.station || 'CGK'} ➔ DPS`,
              pnr: row.pnr || 'PNR-NEW',
              passengerName: row.passenger || 'PASSENGER NAME',
              systemSource: {
                type: 'EXCEL_UPLOAD',
                sourceLabel: 'Station Counter Import Log',
                referenceId: `IMP-ROW-${row.rowNumber}`,
                lastSyncTimestamp: now,
                details: row.raw,
              },
              evidenceSources: [evidenceSource],
              findings: matchEval.findings,
              status: matchEval.status,
              severity: matchEval.status === 'DISCREPANCY' ? 'HIGH' : 'LOW',
              reviewer: 'Auto-Audit Import Engine',
              reviewerNotes: 'Generated from station spreadsheet batch.',
              createdAt: now,
              updatedAt: now,
              excessBaggage: excessDetails,
            };

            updatedCases.unshift(newCase);
            newCount++;
          }
        });

      setIsProcessing(false);
      onImportCompleted(
        updatedCases,
        `Excel Import Successful: Updated ${matchedCount} existing case(s) and created ${newCount} new audit record(s).`
      );
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(`Import execution failed: ${(err as Error)?.message || 'Unknown parsing error'}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className={`w-full max-w-3xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden ${
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
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-sm uppercase tracking-wider">Excel / Spreadsheet Evidence Import</h3>
              <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Phase-1 isolated tabular import parser & auto-matching engine
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
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Target category & options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Target Verification Category
              </label>
              <select
                value={targetCategory}
                onChange={(e) => setTargetCategory(e.target.value as ManifestAuditCheckType)}
                className={`w-full rounded border px-3 py-2 text-xs font-bold outline-none ${
                  isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-[#1F2430] border-white/15 text-white'
                }`}
              >
                <option value="EXCESS_BAGGAGE">EXCESS BAGGAGE (Scale & EBT Log)</option>
                <option value="CHECK_IN_IR">CHECK-IN IR (Counter & Gate Log)</option>
                <option value="LIMITED_RELEASE">LIMITED RELEASE (Station Form Log)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase mb-1 text-slate-400">
                Fast Prototype Data Helper
              </label>
              <button
                type="button"
                onClick={handleLoadSample}
                className={`w-full py-2 px-3 rounded border text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                    : 'border-white/10 bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                <RefreshCw className="w-3.5 h-3.5" /> Load Sample Station Spreadsheet
              </button>
            </div>
          </div>

          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition ${
              isLight
                ? 'border-slate-300 hover:border-sky-500 bg-slate-50/50 hover:bg-sky-50/20'
                : 'border-white/15 hover:border-sky-500/50 bg-[#161922]/50 hover:bg-sky-500/5'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt,.tsv,.xlsx"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Upload className="w-8 h-8 mx-auto text-sky-400 mb-2" />
            <p className="font-bold text-xs">Click to browse or drop station spreadsheet (.csv, .tsv, .xlsx)</p>
            <p className={`text-[10px] mt-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              Expected columns: Flight, Date, PNR, Passenger, BagTag, Pieces, Weight, ExcessKG, Amount, ReceiptNo
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Preview Table */}
          {parseResult && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" /> {parseResult.summaryMessage}
                </span>
                <span className="text-[10px] font-mono text-slate-400">
                  File: <strong>{parseResult.fileName}</strong>
                </span>
              </div>

              <div className="border border-white/10 rounded-lg overflow-x-auto max-h-56">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr
                      className={`text-[10px] uppercase font-bold border-b ${
                        isLight ? 'bg-slate-100 text-slate-600' : 'bg-[#1A1D27] text-slate-400'
                      }`}
                    >
                      <th className="px-2.5 py-1.5">Row</th>
                      <th className="px-2.5 py-1.5">Flight</th>
                      <th className="px-2.5 py-1.5">PNR</th>
                      <th className="px-2.5 py-1.5">Passenger</th>
                      <th className="px-2.5 py-1.5">Tag</th>
                      <th className="px-2.5 py-1.5 text-right">Weight</th>
                      <th className="px-2.5 py-1.5 text-right">Excess</th>
                      <th className="px-2.5 py-1.5 text-right">Amount</th>
                      <th className="px-2.5 py-1.5">Receipt #</th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y font-mono text-[11px] ${isLight ? 'divide-slate-200' : 'divide-white/5'}`}>
                    {parseResult.rows.map((row) => (
                      <tr
                        key={row.rowNumber}
                        className={
                          !row.isValid
                            ? 'bg-rose-500/10 text-rose-300'
                            : isLight
                            ? 'hover:bg-slate-50'
                            : 'hover:bg-white/5'
                        }
                      >
                        <td className="px-2.5 py-1.5 font-bold">{row.rowNumber}</td>
                        <td className="px-2.5 py-1.5 font-sans">{row.flight}</td>
                        <td className="px-2.5 py-1.5 text-sky-400 font-bold">{row.pnr}</td>
                        <td className="px-2.5 py-1.5 font-sans truncate max-w-[140px]">{row.passenger}</td>
                        <td className="px-2.5 py-1.5">{row.bagTag}</td>
                        <td className="px-2.5 py-1.5 text-right">{row.weightKg} kg</td>
                        <td className="px-2.5 py-1.5 text-right">{row.excessKg} kg</td>
                        <td className="px-2.5 py-1.5 text-right">IDR {row.amount?.toLocaleString()}</td>
                        <td className="px-2.5 py-1.5 truncate max-w-[120px]">{row.receiptNo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className={`flex items-center justify-between px-5 py-3 border-t ${
            isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#161922] border-white/10'
          }`}
        >
          <span className={`text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            Safe Isolated Import • APB records unaffected
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
              onClick={handleProcessImport}
              disabled={!parseResult || parseResult.validRows === 0 || isProcessing}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-bold text-white transition shadow-sm cursor-pointer ${
                !parseResult || parseResult.validRows === 0 || isProcessing
                  ? 'bg-slate-600 opacity-50 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-500'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              {isProcessing ? 'Processing...' : 'Run Auto-Match & Import'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
