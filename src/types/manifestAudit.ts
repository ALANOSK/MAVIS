/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ManifestAuditCheckType =
  | 'CHECK_IN_IR'
  | 'EXCESS_BAGGAGE'
  | 'LIMITED_RELEASE';

export type ManifestAuditStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'MATCHED'
  | 'DISCREPANCY'
  | 'MISSING_EVIDENCE'
  | 'RESOLVED';

export type AuditSourceType =
  | 'SABRE'
  | 'OTHER_API'
  | 'EXCEL_UPLOAD'
  | 'DOCUMENT_UPLOAD'
  | 'MANUAL';

export type AuditSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AuditEvidenceSource {
  id: string;
  type: 'EXCEL' | 'DOCUMENT' | 'MANUAL_STATION_FORM' | 'RECEIPT' | 'SIGNED_RELEASE';
  filename?: string;
  fileSize?: string;
  fileType?: string;
  uploadedAt: string;
  uploadedBy?: string;
  status: 'VALID' | 'INVALID' | 'UNVERIFIED' | 'MISSING';
  note?: string;
  // Verification flags
  documentAttached?: boolean;
  passengerRefMatch?: boolean;
  bagTagMatch?: boolean;
  signatureConfirmed?: boolean;
  // Extracted/manual evidence payload
  evidenceData?: Record<string, any>;
}

export interface CheckInIRDetails {
  scenarioId: string;
  scenarioName: string;
  checkInSequence?: number;
  seat?: string;
  systemStatus?: string;
  evidenceStatus?: string;
  systemTransactionRef?: string;
  evidenceTransactionRef?: string;
  discrepancyDescription?: string;
  investigationSteps?: string[];
}

export interface ExcessBaggageDetails {
  bagTag: string;
  pieces: number;
  allowanceKg: number;
  actualWeightKg: number;
  excessKg: number;
  chargeAmount: number;
  currency: string;
  receiptNo?: string;
  paymentMethod?: string;
  scaleId?: string;
  // Evidence comparison data
  evidencePieces?: number;
  evidenceWeightKg?: number;
  evidenceExcessKg?: number;
  evidenceChargeAmount?: number;
  evidenceReceiptNo?: string;
  evidencePaymentMethod?: string;
}

export interface LimitedReleaseDetails {
  bagTag: string;
  releaseIndicator: 'YES' | 'NO';
  reason: 'FRAGILE' | 'PERISHABLE' | 'UNSUITABLE_PACKING' | 'LATE_CHECKIN' | 'OVERSIZED' | 'OTHER';
  reasonDescription?: string;
  formNumber?: string;
  documentAttached: boolean;
  signatureConfirmed: boolean;
  passengerRefMatch: boolean;
  bagTagMatch: boolean;
  waiverAcceptedDate?: string;
}

export interface ManifestAuditCase {
  id: string;
  checkType: ManifestAuditCheckType;
  flightNumber: string;
  flightDate: string;
  station: string;
  route: string;
  pnr: string;
  passengerName: string;
  systemSource: {
    type: AuditSourceType;
    sourceLabel: string;
    referenceId?: string;
    lastSyncTimestamp: string;
    details?: Record<string, any>;
  };
  evidenceSources: AuditEvidenceSource[];
  findings: string[];
  status: ManifestAuditStatus;
  severity: AuditSeverity;
  reviewer?: string;
  reviewerNotes?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Category specific detail payloads
  checkInIR?: CheckInIRDetails;
  excessBaggage?: ExcessBaggageDetails;
  limitedRelease?: LimitedReleaseDetails;
}

export interface AuditKPIStats {
  totalCases: number;
  pending: number;
  underReview: number;
  discrepancies: number;
  matched: number;
  missingEvidence: number;
  resolved: number;
}
