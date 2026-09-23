/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type StationCode = 'CGK' | 'DPS' | 'KUL' | 'SUB' | 'KNO' | 'UPG';

export interface Station {
  code: StationCode;
  name: string;
  timezone: string;
  lat: number;
  lng: number;
}

export interface Carrier {
  code: string;
  name: string;
  displayName: string;
}

export interface Aircraft {
  type: string;
  registration: string;
  capacity: number;
  seatConfiguration: string;
}

export interface CrewMember {
  employeeId: string;
  name: string;
  crewPosition: 'CAPTAIN' | 'FIRST_OFFICER' | 'SENIOR_FLIGHT_ATTENDANT' | 'FLIGHT_ATTENDANT';
  active: boolean;
  originalRoster: boolean;
  replacementFor: string | null;
  syntheticPinHash: string;
}

export interface OperationsStaff {
  employeeId: string;
  name: string;
  role: 'FLIGHT_OPERATIONS' | 'GATE_STAFF' | 'BOARDING_STAFF' | 'GROUND_HANDLING';
  station: StationCode;
}

export interface PassengerBreakdown {
  adult: number;
  child: number;
  infant: number;
  total: number;
}

export interface PassengerSourceRecord {
  source: 'SALES' | 'CHECK_IN' | 'BOARDING' | 'OFFLOAD' | 'NO_SHOW';
  breakdown: PassengerBreakdown;
  updatedAt: string | null;
}

export interface PassengerSources {
  sales: PassengerSourceRecord;
  checkIn: PassengerSourceRecord;
  boarding: PassengerSourceRecord;
  offload: PassengerSourceRecord;
  noShow: PassengerSourceRecord;
}

export type APBStatus =
  | 'NOT_CREATED'
  | 'PREPARED'
  | 'FLIGHT_ATTENDANT_IN_PROGRESS'
  | 'FA_SUBMITTED'
  | 'SENT_TO_SERVER'
  | 'STATION_CHECKED'
  | 'PENDING_HQ_REVIEW'
  | 'HQ_REVIEWED'
  | 'COMPLETED'
  | 'RETURNED_TO_FLIGHT_ATTENDANT'
  | 'RETURNED_TO_FLIGHT_OPERATIONS'
  | 'RETURNED_TO_MANIFEST_STATION';

export type APBStatusLayer = 'NOT_CREATED' | 'CREATED' | 'VERIFIED' | 'FINALIZED';
export type SyncStatusLayer = 'ONLINE' | 'PENDING_SYNC' | 'SYNCING' | 'SENT_TO_SERVER' | 'UNAVAILABLE';

export type ReworkAPBStatus =
  | 'CREATED'
  | 'VERIFIED'
  | 'SUBMITTED'
  | 'RETURNED'
  | 'CORRECTING'
  | 'RESUBMITTED'
  | 'CORRECTION_SUBMITTED'
  | 'APPROVED';

export type ReworkReviewStatus =
  | 'PENDING_REVIEW'
  | 'IN_REVIEW'
  | 'RETURNED'
  | 'APPROVED';

export interface APBReturnCycle {
  originalSubmissionAt: string;
  returnedAt: string;
  returnReason: string;
  returnedBy: string;
  returnNotes: string;
  correctedAt?: string;
  resubmittedAt?: string;
  reviewerAction?: string;
}

export type APBProcessingStatus =
  | 'WAITING_FOR_FLIGHT_OPERATIONS'
  | null;

export type APBServerStatus = 'NOT_SENT' | 'SENT';

export interface FlightAttendantVerification {
  crewStatus: 'ORIGINAL_CREW' | 'REPLACEMENT_CREW';
  originalCrewEmployeeId: string | null;
  replacementCrewEmployeeId: string | null;
  replacementCrewName: string | null;
  replacementReason: string | null;
  employeeId: string;
  employeeName: string;
  pinStatus: 'VERIFIED_WITH_PIN' | 'VERIFIED_WITHOUT_PIN' | 'VERIFICATION_FAILED';
  verificationStatus: 'VERIFIED' | 'FAILED' | 'PENDING';
  verifiedAt: string;
}

export interface ManifestStationReview {
  station: StationCode;
  reviewerId: string;
  status: 'STATION_CHECKED' | 'RETURNED_TO_FO' | 'FORWARDED_TO_HQ';
  remarks: string;
  reviewedAt: string;
}

export interface ManifestHQReview {
  reviewerId: string;
  status: 'HQ_REVIEWED' | 'RETURNED_TO_MS' | 'COMPLETED';
  remarks: string;
  reviewedAt: string;
}

export interface APBNote {
  apbUniqueNumber: string;
  apbVersion: number;
  noteText: string;
  authorEmployeeId: string;
  authorName: string;
  role: string;
  station: StationCode;
  utcTimestamp: string;
  localTimestamp: string;
  eventType: string;
  syncStatus: 'SYNCHRONIZED' | 'PENDING';
}

export interface DigitalAPB {
  id: string;
  apbUniqueNumber: string;
  flightId: string;
  status: APBStatus;
  processingStatus: APBProcessingStatus;
  serverStatus: APBServerStatus;
  preparedBy: string | null;
  preparedAt: string;
  temporaryCount: PassengerBreakdown;
  actualCount: PassengerBreakdown | null;
  previousActualCounts: PassengerBreakdown[];
  extraCrew: number;
  flightAttendantVerification: FlightAttendantVerification | null;
  flightAttendantSubmittedAt: string | null;
  flightOperationsRemark: string;
  submissionId: string | null;
  sentBy: string | null;
  sentAt: string | null;
  manifestStationReview: ManifestStationReview | null;
  manifestHQReview: ManifestHQReview | null;
  notes?: APBNote[];
  sourceMode?: 'LIVE' | 'CACHED' | 'MANUAL_EMERGENCY';
  verificationStatus?: 'PENDING' | 'RECONCILED' | 'RECONCILIATION_REQUIRED';
  syncStatus?: 'PENDING' | 'SYNCHRONIZING' | 'SYNCHRONIZED';
  apbStatusLayer?: APBStatusLayer;
  syncStatusLayer?: SyncStatusLayer;
  reworkStatus?: ReworkAPBStatus;
  reworkReviewStatus?: ReworkReviewStatus;
  returnReason?: string;
  returnedBy?: string;
  returnedAt?: string;
  returnNotes?: string;
  returnHistory?: APBReturnCycle[];
  reworkAudit?: ReworkAudit;
}

export interface ReworkAudit {
  previousCount: {
    adult: number;
    child: number;
    infant: number;
    extraCrew: number;
    total: number;
  };
  verifiedSabreCount: {
    adult: number;
    child: number;
    infant: number;
    extraCrew: number;
    total: number;
  };
  variance: {
    adult: number;
    child: number;
    infant: number;
    extraCrew: number;
    total: number;
  };
  correctionReason: string;
  operatorNote: string;
  timestamp: string;
}

export interface Flight {
  id: string;
  carrierCode: string;
  flightNumber: string;
  flightDate: string;
  origin: StationCode;
  destination: StationCode;
  departureTerminal: string;
  arrivalTerminal: string;
  gate: string;
  boardingGate: string;
  scheduledDeparture: string;
  estimatedDeparture: string;
  scheduledArrival: string;
  estimatedArrival: string;
  flightStatus: 'ACTIVE' | 'CANCELLED';
  movementStatus:
    | 'SCHEDULED'
    | 'CHECK_IN'
    | 'BOARDING'
    | 'FINAL_CALL'
    | 'DEPARTED'
    | 'IN_FLIGHT'
    | 'ARRIVED'
    | 'DELAYED'
    | 'CANCELLED'
    | 'COMPLETED';
  delayMinutes: number;
  aircraft: Aircraft;
  crewRoster: CrewMember[];
  operationsStaff: OperationsStaff[];
  passengerSources: PassengerSources;
  apbId: string | null;
  sourceMode?: 'LIVE' | 'CACHED' | 'MANUAL_EMERGENCY';
  syncStatus?: 'PENDING' | 'SYNCHRONIZED';
  aimsCreatedUtc?: string;
  aimsAircraftAssignedUtc?: string;
  aimsCrewRosterVerifiedUtc?: string;
}

export function getAPBStatusLayers(
  apb: { status: APBStatus; syncStatus?: string; serverStatus?: string; reworkStatus?: ReworkAPBStatus; reworkReviewStatus?: ReworkReviewStatus } | undefined,
  contingencyState: 'LIVE' | 'CACHE_AVAILABLE' | 'NO_CACHE' | 'RECONCILING'
): { apbStatus: APBStatusLayer; syncStatus: SyncStatusLayer; reworkStatus: ReworkAPBStatus; reworkReviewStatus: ReworkReviewStatus } {
  if (!apb) {
    return {
      apbStatus: 'NOT_CREATED',
      syncStatus: contingencyState === 'NO_CACHE' ? 'UNAVAILABLE' : 'ONLINE',
      reworkStatus: 'CREATED',
      reworkReviewStatus: 'PENDING_REVIEW'
    };
  }

  // 1. Determine APB Lifecycle Status
  let apbStatus: APBStatusLayer = 'CREATED';
  if (apb.status === 'NOT_CREATED') {
    apbStatus = 'NOT_CREATED';
  } else if (
    ['FA_SUBMITTED', 'RETURNED_TO_FLIGHT_OPERATIONS'].includes(apb.status)
  ) {
    apbStatus = 'VERIFIED';
  } else if (
    ['SENT_TO_SERVER', 'STATION_CHECKED', 'PENDING_HQ_REVIEW', 'HQ_REVIEWED', 'COMPLETED', 'RETURNED_TO_MANIFEST_STATION'].includes(apb.status)
  ) {
    apbStatus = 'FINALIZED';
  } else {
    apbStatus = 'CREATED';
  }

  // 2. Determine Data Delivery / Sync Status
  let syncStatus: SyncStatusLayer = 'ONLINE';
  if (contingencyState === 'NO_CACHE') {
    syncStatus = 'UNAVAILABLE';
  } else if (contingencyState === 'CACHE_AVAILABLE') {
    syncStatus = 'PENDING_SYNC';
  } else if (contingencyState === 'RECONCILING') {
    syncStatus = 'SYNCING';
  } else { // contingencyState === 'LIVE'
    if (['SENT_TO_SERVER', 'STATION_CHECKED', 'PENDING_HQ_REVIEW', 'HQ_REVIEWED', 'COMPLETED', 'RETURNED_TO_MANIFEST_STATION'].includes(apb.status) || apb.serverStatus === 'SENT') {
      syncStatus = 'SENT_TO_SERVER';
    } else {
      syncStatus = 'ONLINE';
    }
  }

  // 3. Determine Rework Status (driven by canonical APB.status, with fine-grained auxiliary hints)
  let reworkStatus: ReworkAPBStatus = 'CREATED';
  if (apb.status === 'NOT_CREATED' || apb.status === 'PREPARED') {
    reworkStatus = 'CREATED';
  } else if (['FLIGHT_ATTENDANT_IN_PROGRESS', 'FA_SUBMITTED', 'RETURNED_TO_FLIGHT_ATTENDANT'].includes(apb.status)) {
    reworkStatus = 'VERIFIED';
  } else if (apb.status === 'SENT_TO_SERVER') {
    if (apb.reworkStatus === 'RESUBMITTED' || apb.reworkStatus === 'CORRECTION_SUBMITTED') {
      reworkStatus = apb.reworkStatus;
    } else {
      reworkStatus = 'SUBMITTED';
    }
  } else if (apb.status === 'RETURNED_TO_FLIGHT_OPERATIONS' || apb.status === 'RETURNED_TO_MANIFEST_STATION') {
    if (apb.reworkStatus === 'CORRECTING') {
      reworkStatus = 'CORRECTING';
    } else {
      reworkStatus = 'RETURNED';
    }
  } else if (['STATION_CHECKED', 'PENDING_HQ_REVIEW', 'HQ_REVIEWED', 'COMPLETED'].includes(apb.status)) {
    reworkStatus = 'APPROVED';
  }

  // 4. Determine Rework Review Status (driven by canonical APB.status)
  let reworkReviewStatus: ReworkReviewStatus = 'PENDING_REVIEW';
  if (['STATION_CHECKED', 'PENDING_HQ_REVIEW', 'HQ_REVIEWED', 'COMPLETED'].includes(apb.status)) {
    reworkReviewStatus = 'APPROVED';
  } else if (apb.status === 'RETURNED_TO_FLIGHT_OPERATIONS' || apb.status === 'RETURNED_TO_MANIFEST_STATION') {
    reworkReviewStatus = 'RETURNED';
  } else if (apb.status === 'SENT_TO_SERVER' && (apb.reworkStatus === 'RESUBMITTED' || apb.reworkStatus === 'CORRECTION_SUBMITTED')) {
    reworkReviewStatus = 'PENDING_REVIEW';
  }

  return { apbStatus, syncStatus, reworkStatus, reworkReviewStatus };
}

export interface SimplifiedAPBDisplay {
  primaryLabel: string;
  primaryColor: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate' | 'cyan';
  secondarySyncLabel: string;
  secondarySyncColor: 'emerald' | 'amber' | 'rose' | 'sky' | 'slate';
}

export function getSimplifiedAPBDisplay(
  apb: { status: APBStatus; syncStatus?: string; serverStatus?: string; reworkStatus?: ReworkAPBStatus; reworkReviewStatus?: ReworkReviewStatus } | undefined,
  contingencyState: 'LIVE' | 'CACHE_AVAILABLE' | 'NO_CACHE' | 'RECONCILING'
): SimplifiedAPBDisplay {
  if (!apb || apb.status === 'NOT_CREATED') {
    return {
      primaryLabel: 'NOT CREATED',
      primaryColor: 'slate',
      secondarySyncLabel: contingencyState === 'NO_CACHE' ? 'OFFLINE' : 'ONLINE',
      secondarySyncColor: contingencyState === 'NO_CACHE' ? 'rose' : 'slate',
    };
  }

  // 1. Determine Simplified Primary Operational Status strictly from canonical APB.status
  let primaryLabel = 'IN PROGRESS';
  let primaryColor: SimplifiedAPBDisplay['primaryColor'] = 'sky';

  switch (apb.status) {
    case 'RETURNED_TO_FLIGHT_OPERATIONS':
    case 'RETURNED_TO_MANIFEST_STATION':
      if (apb.reworkStatus === 'CORRECTING') {
        primaryLabel = 'CORRECTION IN PROGRESS';
        primaryColor = 'amber';
      } else {
        primaryLabel = 'RETURNED FOR CORRECTION';
        primaryColor = 'rose';
      }
      break;

    case 'SENT_TO_SERVER':
      if (apb.reworkStatus === 'RESUBMITTED' || apb.reworkStatus === 'CORRECTION_SUBMITTED') {
        primaryLabel = 'CORRECTION SUBMITTED';
        primaryColor = 'cyan';
      } else {
        primaryLabel = 'PENDING REVIEW';
        primaryColor = 'sky';
      }
      break;

    case 'STATION_CHECKED':
    case 'PENDING_HQ_REVIEW':
      primaryLabel = 'PENDING HQ REVIEW';
      primaryColor = 'sky';
      break;

    case 'HQ_REVIEWED':
    case 'COMPLETED':
      primaryLabel = 'VERIFIED';
      primaryColor = 'emerald';
      break;

    case 'FA_SUBMITTED':
      primaryLabel = 'VERIFIED';
      primaryColor = 'emerald';
      break;

    case 'RETURNED_TO_FLIGHT_ATTENDANT':
      primaryLabel = 'RETURNED FOR CORRECTION';
      primaryColor = 'rose';
      break;

    case 'PREPARED':
    case 'FLIGHT_ATTENDANT_IN_PROGRESS':
    default:
      primaryLabel = 'IN PROGRESS';
      primaryColor = 'sky';
      break;
  }

  // Contingency override for primary status when offline
  if (contingencyState === 'NO_CACHE') {
    primaryLabel = 'SYNC REQUIRED';
    primaryColor = 'rose';
  }

  // 2. Determine Simplified Secondary Sync Status
  let secondarySyncLabel = 'ONLINE';
  let secondarySyncColor: SimplifiedAPBDisplay['secondarySyncColor'] = 'slate';

  if (contingencyState === 'NO_CACHE') {
    secondarySyncLabel = 'OFFLINE';
    secondarySyncColor = 'rose';
  } else if (contingencyState === 'CACHE_AVAILABLE') {
    secondarySyncLabel = 'PENDING SYNC';
    secondarySyncColor = 'amber';
  } else if (contingencyState === 'RECONCILING') {
    secondarySyncLabel = 'SYNCING';
    secondarySyncColor = 'sky';
  } else {
    if (['SENT_TO_SERVER', 'STATION_CHECKED', 'PENDING_HQ_REVIEW', 'HQ_REVIEWED', 'COMPLETED'].includes(apb.status) || apb.serverStatus === 'SENT') {
      secondarySyncLabel = 'SYNCHRONIZED';
      secondarySyncColor = 'emerald';
    } else {
      secondarySyncLabel = 'ONLINE';
      secondarySyncColor = 'slate';
    }
  }

  return {
    primaryLabel,
    primaryColor,
    secondarySyncLabel,
    secondarySyncColor,
  };
}

