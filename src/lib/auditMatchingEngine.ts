/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  ManifestAuditCase,
  ManifestAuditCheckType,
  ManifestAuditStatus,
  AuditKPIStats,
  ExcessBaggageDetails,
  LimitedReleaseDetails,
} from '../types/manifestAudit';
import { INITIAL_MANIFEST_AUDIT_CASES } from '../data/syntheticAuditData';

const AUDIT_STORAGE_KEY = 'mavis_manifest_audit_cases_v1';

/**
 * Isolated persistence layer for Document & Transaction Check module.
 * Strictly does not touch DigitalAPB or Flight IndexedDB stores.
 */
export function getStoredAuditCases(): ManifestAuditCase[] {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_MANIFEST_AUDIT_CASES));
      return INITIAL_MANIFEST_AUDIT_CASES;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return INITIAL_MANIFEST_AUDIT_CASES;
  } catch (err) {
    console.warn('Could not read isolated audit cases from localStorage, using initial dataset:', err);
    return INITIAL_MANIFEST_AUDIT_CASES;
  }
}

export function saveStoredAuditCases(cases: ManifestAuditCase[]): void {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(cases));
  } catch (err) {
    console.warn('Could not save isolated audit cases to localStorage:', err);
  }
}

export function resetAuditCasesToDefault(): ManifestAuditCase[] {
  try {
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(INITIAL_MANIFEST_AUDIT_CASES));
  } catch (err) {
    console.warn('Could not reset audit cases:', err);
  }
  return INITIAL_MANIFEST_AUDIT_CASES;
}

/**
 * Calculates domain KPIs strictly from audit cases (independent of APB stats)
 */
export function calculateAuditKPIs(
  cases: ManifestAuditCase[],
  checkType?: ManifestAuditCheckType
): AuditKPIStats {
  const filtered = checkType ? cases.filter((c) => c.checkType === checkType) : cases;

  return {
    totalCases: filtered.length,
    pending: filtered.filter((c) => c.status === 'PENDING').length,
    underReview: filtered.filter((c) => c.status === 'UNDER_REVIEW').length,
    discrepancies: filtered.filter((c) => c.status === 'DISCREPANCY').length,
    matched: filtered.filter((c) => c.status === 'MATCHED').length,
    missingEvidence: filtered.filter((c) => c.status === 'MISSING_EVIDENCE').length,
    resolved: filtered.filter((c) => c.status === 'RESOLVED').length,
  };
}

/**
 * Deterministic matching engine for Excess Baggage
 */
export function evaluateExcessBaggageMatch(details: ExcessBaggageDetails, evidenceAvailable: boolean): {
  findings: string[];
  status: ManifestAuditStatus;
  discrepancyCount: number;
} {
  const findings: string[] = [];

  if (!evidenceAvailable) {
    findings.push('MISSING_DOCUMENT');
    if (!details.receiptNo || details.receiptNo === 'PENDING_DOCUMENT') {
      findings.push('MISSING_PAYMENT');
    }
    return { findings, status: 'MISSING_EVIDENCE', discrepancyCount: findings.length };
  }

  let hasDiscrepancy = false;

  // Weight check
  if (details.evidenceWeightKg !== undefined && details.evidenceWeightKg !== details.actualWeightKg) {
    findings.push('WEIGHT_MISMATCH');
    hasDiscrepancy = true;
  }

  // Charge / Collection check
  if (details.evidenceChargeAmount !== undefined && details.evidenceChargeAmount !== details.chargeAmount) {
    findings.push('CHARGE_MISMATCH');
    hasDiscrepancy = true;
  }

  // Pieces check
  if (details.evidencePieces !== undefined && details.evidencePieces !== details.pieces) {
    findings.push('PIECES_MISMATCH');
    hasDiscrepancy = true;
  }

  // Payment Receipt reference check
  if (!details.evidenceReceiptNo && !details.receiptNo) {
    findings.push('MISSING_PAYMENT');
    hasDiscrepancy = true;
  }

  if (findings.length === 0) {
    findings.push('MATCHED');
    return { findings, status: 'MATCHED', discrepancyCount: 0 };
  }

  return { findings, status: 'DISCREPANCY', discrepancyCount: findings.length };
}

/**
 * Deterministic evidence-centric review evaluator for Limited Release
 */
export function evaluateLimitedReleaseMatch(details: LimitedReleaseDetails): {
  findings: string[];
  status: ManifestAuditStatus;
  discrepancyCount: number;
} {
  const findings: string[] = [];

  if (!details.documentAttached) {
    findings.push('MISSING_DOCUMENT');
    findings.push('MISSING_RELEASE');
    return { findings, status: 'MISSING_EVIDENCE', discrepancyCount: findings.length };
  }

  if (!details.signatureConfirmed) {
    findings.push('MISSING_SIGNATURE');
  }

  if (!details.passengerRefMatch) {
    findings.push('PASSENGER_MISMATCH');
  }

  if (!details.bagTagMatch) {
    findings.push('TAG_MISMATCH');
  }

  if (findings.length === 0) {
    findings.push('MATCHED');
    return { findings, status: 'MATCHED', discrepancyCount: 0 };
  }

  return { findings, status: 'DISCREPANCY', discrepancyCount: findings.length };
}

/**
 * Lightweight Tabular / CSV Spreadsheet Parser for Phase 1 Excel Import
 */
export interface ParsedSpreadsheetRow {
  rowNumber: number;
  flight?: string;
  date?: string;
  pnr?: string;
  passenger?: string;
  bagTag?: string;
  pieces?: number;
  weightKg?: number;
  excessKg?: number;
  amount?: number;
  receiptNo?: string;
  station?: string;
  notes?: string;
  raw: Record<string, string>;
  isValid: boolean;
  validationError?: string;
}

export interface SpreadsheetParseResult {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  rows: ParsedSpreadsheetRow[];
  headers: string[];
  detectedCheckType: ManifestAuditCheckType;
  summaryMessage: string;
}

export function parseSpreadsheetText(
  text: string,
  fileName: string,
  targetCheckType: ManifestAuditCheckType = 'EXCESS_BAGGAGE'
): SpreadsheetParseResult {
  const lines = text
    .split(/\r\n|\n|\r/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      fileName,
      totalRows: 0,
      validRows: 0,
      invalidRows: 0,
      rows: [],
      headers: [],
      detectedCheckType: targetCheckType,
      summaryMessage: 'Unable to read this file. File is empty.',
    };
  }

  // Detect delimiter: comma, semicolon, tab
  const headerLine = lines[0];
  let delimiter = ',';
  if (headerLine.includes('\t')) delimiter = '\t';
  else if (headerLine.includes(';') && !headerLine.includes(',')) delimiter = ';';

  const rawHeaders = headerLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));
  const normalizedHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

  // Header mapping helper
  const findHeaderIdx = (patterns: string[]) => {
    return normalizedHeaders.findIndex((h) => patterns.some((p) => h.includes(p)));
  };

  const flightIdx = findHeaderIdx(['flight', 'flt', 'flightno']);
  const dateIdx = findHeaderIdx(['date', 'flightdate', 'fltdate']);
  const pnrIdx = findHeaderIdx(['pnr', 'bookingref', 'recordlocator', 'ref']);
  const paxIdx = findHeaderIdx(['passenger', 'pax', 'paxname', 'name']);
  const tagIdx = findHeaderIdx(['bagtag', 'tag', 'tagno', 'baggage']);
  const piecesIdx = findHeaderIdx(['pieces', 'pcs', 'piece']);
  const weightIdx = findHeaderIdx(['weight', 'actualweight', 'grossweight', 'kg', 'actweight']);
  const excessIdx = findHeaderIdx(['excess', 'excesskg', 'overweight']);
  const amountIdx = findHeaderIdx(['amount', 'charge', 'totalcharge', 'cost', 'fee', 'idr']);
  const receiptIdx = findHeaderIdx(['receipt', 'ebt', 'receiptno', 'ebtno', 'documentno', 'paymentref']);
  const stationIdx = findHeaderIdx(['station', 'stn', 'origin', 'apt']);

  const parsedRows: ParsedSpreadsheetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells = rawLine.split(delimiter).map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (cells.length === 0 || cells.every((c) => c === '')) continue;

    const rowMap: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      rowMap[h] = cells[idx] || '';
    });

    const flight = flightIdx !== -1 ? cells[flightIdx] : undefined;
    const pnr = pnrIdx !== -1 ? cells[pnrIdx]?.toUpperCase() : undefined;
    const passenger = paxIdx !== -1 ? cells[paxIdx]?.toUpperCase() : undefined;
    const bagTag = tagIdx !== -1 ? cells[tagIdx]?.toUpperCase() : undefined;
    const pieces = piecesIdx !== -1 && !isNaN(Number(cells[piecesIdx])) ? Number(cells[piecesIdx]) : 1;
    const weightKg = weightIdx !== -1 && !isNaN(Number(cells[weightIdx])) ? Number(cells[weightIdx]) : undefined;
    const excessKg = excessIdx !== -1 && !isNaN(Number(cells[excessIdx])) ? Number(cells[excessIdx]) : undefined;
    const amount = amountIdx !== -1 && !isNaN(Number(cells[amountIdx]?.replace(/[^0-9.-]+/g, '')))
      ? Number(cells[amountIdx].replace(/[^0-9.-]+/g, ''))
      : undefined;
    const receiptNo = receiptIdx !== -1 ? cells[receiptIdx] : undefined;
    const station = stationIdx !== -1 ? cells[stationIdx]?.toUpperCase() : 'CGK';
    const date = dateIdx !== -1 ? cells[dateIdx] : new Date().toISOString().split('T')[0];

    let isValid = true;
    let validationError: string | undefined;

    if (!pnr && !passenger && !bagTag) {
      isValid = false;
      validationError = 'Missing required identifying fields (PNR, Passenger Name, or Bag Tag).';
    }

    parsedRows.push({
      rowNumber: i,
      flight: flight || 'JT-610',
      date,
      pnr: pnr || 'PNR-AUTO',
      passenger: passenger || 'UNKNOWN PASSENGER',
      bagTag: bagTag || `JT-TAG-${100000 + i}`,
      pieces,
      weightKg: weightKg || 25,
      excessKg: excessKg !== undefined ? excessKg : (weightKg ? Math.max(0, weightKg - 20) : 5),
      amount: amount !== undefined ? amount : (excessKg ? excessKg * 50000 : 250000),
      receiptNo: receiptNo || `EBT-IMP-${20260827}-${100 + i}`,
      station,
      raw: rowMap,
      isValid,
      validationError,
    });
  }

  const validCount = parsedRows.filter((r) => r.isValid).length;
  const invalidCount = parsedRows.filter((r) => !r.isValid).length;

  return {
    fileName,
    totalRows: parsedRows.length,
    validRows: validCount,
    invalidRows: invalidCount,
    rows: parsedRows,
    headers: rawHeaders,
    detectedCheckType: targetCheckType,
    summaryMessage: `Spreadsheet parsed: ${validCount} valid record(s) ready for import${invalidCount > 0 ? `, ${invalidCount} invalid row(s)` : ''}.`,
  };
}
