/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flight, DigitalAPB } from '../types';
import { VALID_CARRIER_CODES } from '../data';
import {
  generateAllTickets,
  getFlightRevenueDetails,
  getEffectiveDepartureTime,
  OPEN_REBOOK_STATUSES,
  PROTECTED_DEMO_FLIGHT_IDS,
} from '../lib/revenueData';

export interface QAFinding {
  findingId: string;
  area: string;
  relatedTab: 'code' | 'workflow' | 'bugs' | 'sync' | 'docs';
  relatedRole: 'MANIFEST_HQ' | 'FLIGHT_ATTENDANT' | 'FLIGHT_OPERATIONS' | 'MANIFEST_STATION' | 'ALL';
  relatedRoute: string;
  relatedModule: string;
  description: string;
  expectedBehavior: string;
  actualBehavior: string;
  possibleRootCause: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | 'Informational';
  suggestedCorrection: string;
  evidence: string;
  detectionTimestamp: string;
  status: 'PASS' | 'WARNING' | 'FAILED' | 'NOT_TESTED' | 'NOT_AVAILABLE';
}

export interface RuntimeQAResults {
  timestamp: string;
  findings: QAFinding[];
  stats: {
    activeFlightsCount: number;
    completedFlightsCount: number;
    totalFlightsCount: number;
    apbsCount: number;
    indexedDbAvailable: boolean;
    activeRole: string;
    totalGrossSales: number;
    totalFlownRevenue: number;
    totalHeldRevenue: number;
    totalRefundedAmount: number;
    totalRebookedRevenue: number;
    totalNoShowRevenue: number;
    revenueAllocationMismatchCount: number;
    capacityViolationCount: number;
    passengerInvariantViolationCount: number;
    protectedDemoFlightIntegrity: boolean;
    rebookClosedStateViolationCount: number;
    rebookChronologyViolationCount: number;
    protectedDemoTransferViolationCount: number;
    rebookOrphanViolationCount: number;
    rebookEligibilityPassed: boolean;
  };
}

export function runRuntimeQa(
  flights: Flight[],
  apbs: DigitalAPB[],
  currentRole: string | null,
  currentRoute: string
): RuntimeQAResults {
  const findings: QAFinding[] = [];
  const timestamp = new Date().toISOString();

  // 1. IndexedDB Availability Check
  const idbAvailable = typeof window !== 'undefined' && !!window.indexedDB;
  findings.push({
    findingId: 'RT-001',
    area: 'Database',
    relatedTab: 'sync',
    relatedRole: 'ALL',
    relatedRoute: currentRoute,
    relatedModule: 'db.ts',
    description: 'Verify local storage availability via IndexedDB API in the active browser context.',
    expectedBehavior: 'IndexedDB must be fully initialized and accessible for robust multi-record persistence.',
    actualBehavior: idbAvailable ? 'IndexedDB is available and active.' : 'IndexedDB is not available in this context.',
    possibleRootCause: idbAvailable ? 'N/A' : 'Browser settings, private browsing restrictions, or iframe sandbox limitations.',
    severity: 'High',
    suggestedCorrection: 'Ensure browser permissions permit offline storage and verify iframe sandbox includes "allow-same-origin".',
    evidence: `window.indexedDB exists: ${idbAvailable}`,
    detectionTimestamp: timestamp,
    status: idbAvailable ? 'PASS' : 'FAILED',
  });

  // 2. Stable Flight Identities and Duplicates Check
  const flightNumbersOnDate = new Map<string, string[]>();
  const duplicateIds: string[] = [];
  const seenIds = new Set<string>();
  let completedCount = 0;
  let activeCount = 0;

  flights.forEach((f) => {
    if (seenIds.has(f.id)) {
      duplicateIds.push(f.id);
    }
    seenIds.add(f.id);

    const key = `${f.flightNumber}_${f.flightDate}`;
    if (!flightNumbersOnDate.has(key)) {
      flightNumbersOnDate.set(key, []);
    }
    flightNumbersOnDate.get(key)!.push(f.id);

    if (f.movementStatus === 'COMPLETED' || f.movementStatus === 'ARRIVED') {
      completedCount++;
    } else {
      activeCount++;
    }
  });

  if (duplicateIds.length > 0) {
    findings.push({
      findingId: 'RT-002',
      area: 'Database Integrity',
      relatedTab: 'bugs',
      relatedRole: 'ALL',
      relatedRoute: currentRoute,
      relatedModule: 'db.ts',
      description: 'Check for duplicate unique identifiers in flight records.',
      expectedBehavior: 'Every flight in the database must possess a unique, stable, non-colliding identifier.',
      actualBehavior: `Duplicate flight IDs detected: ${duplicateIds.join(', ')}.`,
      possibleRootCause: 'Improper database seeding or offline write synchronizations.',
      severity: 'Critical',
      suggestedCorrection: 'Re-align operations and clear local databases to reseed the schema.',
      evidence: `Duplicates: ${duplicateIds.join(', ')}`,
      detectionTimestamp: timestamp,
      status: 'FAILED',
    });
  } else {
    findings.push({
      findingId: 'RT-002',
      area: 'Database Integrity',
      relatedTab: 'bugs',
      relatedRole: 'ALL',
      relatedRoute: currentRoute,
      relatedModule: 'db.ts',
      description: 'Check for duplicate unique identifiers in flight records.',
      expectedBehavior: 'Every flight in the database must possess a unique, stable, non-colliding identifier.',
      actualBehavior: 'All loaded flight records possess distinct database identifiers.',
      possibleRootCause: 'N/A',
      severity: 'Low',
      suggestedCorrection: 'No action required.',
      evidence: `Unique flight count: ${flights.length}`,
      detectionTimestamp: timestamp,
      status: 'PASS',
    });
  }

  // Check for duplicate flight numbers on the same date
  const multiFlightsOnDate: string[] = [];
  flightNumbersOnDate.forEach((ids, key) => {
    if (ids.length > 1) {
      multiFlightsOnDate.push(`${key} (${ids.length} instances)`);
    }
  });

  if (multiFlightsOnDate.length > 0) {
    findings.push({
      findingId: 'RT-003',
      area: 'Operational Scheduling',
      relatedTab: 'bugs',
      relatedRole: 'FLIGHT_OPERATIONS',
      relatedRoute: '/flight-operations',
      relatedModule: 'FlightOperationsPage.tsx',
      description: 'Detect duplicate scheduling occurrences of the same Flight Number on a single calendar day.',
      expectedBehavior: 'No duplicate flight numbers on the same calendar day.',
      actualBehavior: `Duplicate flight routes detected on the same date: ${multiFlightsOnDate.join(', ')}.`,
      possibleRootCause: 'Multiple asynchronous seeds or non-deterministic generation.',
      severity: 'Medium',
      suggestedCorrection: 'Use deterministic generation with seed per service day and flight id.',
      evidence: `Conflicts: ${multiFlightsOnDate.join(', ')}`,
      detectionTimestamp: timestamp,
      status: 'WARNING',
    });
  } else {
    findings.push({
      findingId: 'RT-003',
      area: 'Operational Scheduling',
      relatedTab: 'bugs',
      relatedRole: 'FLIGHT_OPERATIONS',
      relatedRoute: '/flight-operations',
      relatedModule: 'FlightOperationsPage.tsx',
      description: 'Detect duplicate scheduling occurrences of the same Flight Number on a single calendar day.',
      expectedBehavior: 'No duplicate flight numbers are scheduled on the same date.',
      actualBehavior: 'All scheduled flights on any given day possess unique flight numbers.',
      possibleRootCause: 'N/A',
      severity: 'Low',
      suggestedCorrection: 'No action required.',
      evidence: `Sectors validated: ${flights.length}`,
      detectionTimestamp: timestamp,
      status: 'PASS',
    });
  }

  // 3. Valid Carrier Codes Enforcement
  const invalidCarrierFlights: string[] = [];
  const validCarrierSet = new Set(VALID_CARRIER_CODES);
  flights.forEach((f) => {
    if (!validCarrierSet.has(f.carrierCode as any)) {
      invalidCarrierFlights.push(`${f.flightNumber} (${f.carrierCode})`);
    }
  });

  if (invalidCarrierFlights.length > 0) {
    findings.push({
      findingId: 'RT-004',
      area: 'Carrier Metadata Compliance',
      relatedTab: 'bugs',
      relatedRole: 'ALL',
      relatedRoute: currentRoute,
      relatedModule: 'data.ts',
      description: 'Enforce valid operational carrier codes: JT, ID, OD, IU, SL.',
      expectedBehavior: 'All flights must belong strictly to one of the 5 authorized carrier codes.',
      actualBehavior: `Disallowed carrier codes found: ${invalidCarrierFlights.join(', ')}.`,
      possibleRootCause: 'Legacy seed references or unmapped IATA airline code.',
      severity: 'Critical',
      suggestedCorrection: 'Update carrier references to valid set: JT, ID, OD, IU, SL.',
      evidence: `Invalid flights: ${invalidCarrierFlights.join(', ')}`,
      detectionTimestamp: timestamp,
      status: 'FAILED',
    });
  } else {
    findings.push({
      findingId: 'RT-004',
      area: 'Carrier Metadata Compliance',
      relatedTab: 'bugs',
      relatedRole: 'ALL',
      relatedRoute: currentRoute,
      relatedModule: 'data.ts',
      description: 'Enforce valid operational carrier codes: JT, ID, OD, IU, SL.',
      expectedBehavior: 'All flights strictly use authorized carrier codes.',
      actualBehavior: 'All active flights match authorized carriers (JT, ID, OD, IU, SL).',
      possibleRootCause: 'N/A',
      severity: 'Low',
      suggestedCorrection: 'No action required.',
      evidence: `Verified ${flights.length} flights against authorized carriers.`,
      detectionTimestamp: timestamp,
      status: 'PASS',
    });
  }

  // 4. Seating Capacity & Mathematical Passenger Invariants
  let capacityViolationCount = 0;
  let passengerInvariantViolationCount = 0;
  const capacityViolationList: string[] = [];
  const invariantViolationList: string[] = [];

  flights.forEach((f) => {
    const capacity = f.aircraft?.capacity || 0;
    const sales = f.passengerSources?.sales?.breakdown;
    const checkIn = f.passengerSources?.checkIn?.breakdown;
    const boarding = f.passengerSources?.boarding?.breakdown;
    const offload = f.passengerSources?.offload?.breakdown;
    const noShow = f.passengerSources?.noShow?.breakdown;

    // Check capacity bounds
    if (capacity > 0 && (checkIn.total > capacity || boarding.total > capacity || sales.total > capacity)) {
      capacityViolationCount++;
      capacityViolationList.push(`${f.flightNumber} (Cap: ${capacity}, Sales: ${sales.total}, Check-In: ${checkIn.total}, Boarding: ${boarding.total})`);
    }

    // Check non-negative and 0 <= Boarding <= Check-in <= Sales
    if (boarding.total > checkIn.total || checkIn.total > sales.total || boarding.total < 0 || checkIn.total < 0 || sales.total < 0) {
      passengerInvariantViolationCount++;
      invariantViolationList.push(`${f.flightNumber}: Boarding(${boarding.total}) <= Check-In(${checkIn.total}) <= Sales(${sales.total}) violated`);
    }

    // Check breakdown sums: adult + child + infant === total
    const sources = [sales, checkIn, boarding, offload, noShow];
    for (const src of sources) {
      if (src) {
        if (src.adult + src.child + src.infant !== src.total || src.adult < 0 || src.child < 0 || src.infant < 0) {
          passengerInvariantViolationCount++;
          invariantViolationList.push(`${f.flightNumber}: Breakdown sum mismatch (Adult ${src.adult} + Child ${src.child} + Infant ${src.infant} !== Total ${src.total})`);
          break;
        }
      }
    }
  });

  if (capacityViolationCount > 0) {
    findings.push({
      findingId: 'RT-005',
      area: 'Aviation Compliance',
      relatedTab: 'bugs',
      relatedRole: 'MANIFEST_STATION',
      relatedRoute: '/manifest-station',
      relatedModule: 'ManifestStationPage.tsx',
      description: 'Scan flights to detect passenger counts exceeding physical aircraft seating capacity.',
      expectedBehavior: 'Passenger counts must never exceed aircraft capacity.',
      actualBehavior: `Over-capacity records found on: ${capacityViolationList.join(', ')}.`,
      possibleRootCause: 'Unconstrained passenger count increment.',
      severity: 'Critical',
      suggestedCorrection: 'Enforce capacity clamping on all passenger sources.',
      evidence: `Over-capacity count: ${capacityViolationCount}`,
      detectionTimestamp: timestamp,
      status: 'FAILED',
    });
  } else {
    findings.push({
      findingId: 'RT-005',
      area: 'Aviation Compliance',
      relatedTab: 'bugs',
      relatedRole: 'MANIFEST_STATION',
      relatedRoute: '/manifest-station',
      relatedModule: 'ManifestStationPage.tsx',
      description: 'Scan flights to detect passenger counts exceeding physical aircraft seating capacity.',
      expectedBehavior: 'No passenger counts exceed physical seating capacities.',
      actualBehavior: 'All flight manifests are strictly bounded by physical seat capacities.',
      possibleRootCause: 'N/A',
      severity: 'Low',
      suggestedCorrection: 'No action required.',
      evidence: `Successfully verified all ${flights.length} aircraft capacities.`,
      detectionTimestamp: timestamp,
      status: 'PASS',
    });
  }

  if (passengerInvariantViolationCount > 0) {
    findings.push({
      findingId: 'RT-006',
      area: 'Passenger Invariant Verification',
      relatedTab: 'bugs',
      relatedRole: 'ALL',
      relatedRoute: currentRoute,
      relatedModule: 'data.ts',
      description: 'Verify 0 <= Boarding <= Check-In <= Sales and breakdown sum integrity.',
      expectedBehavior: 'Boarding <= Check-In <= Sales and adult + child + infant === total for all sources.',
      actualBehavior: `Violations detected: ${invariantViolationList.slice(0, 3).join('; ')}.`,
      possibleRootCause: 'Non-synchronized passenger source incrementing.',
      severity: 'High',
      suggestedCorrection: 'Ensure proportional breakdown and invariant bounds in shift and generator.',
      evidence: `Violations count: ${passengerInvariantViolationCount}`,
      detectionTimestamp: timestamp,
      status: 'FAILED',
    });
  } else {
    findings.push({
      findingId: 'RT-006',
      area: 'Passenger Invariant Verification',
      relatedTab: 'bugs',
      relatedRole: 'ALL',
      relatedRoute: currentRoute,
      relatedModule: 'data.ts',
      description: 'Verify 0 <= Boarding <= Check-In <= Sales and breakdown sum integrity.',
      expectedBehavior: 'All passenger sources strictly adhere to Boarding <= Check-In <= Sales and valid sums.',
      actualBehavior: 'All passenger sources strictly satisfy 0 <= Boarding <= Check-In <= Sales and sum conservation.',
      possibleRootCause: 'N/A',
      severity: 'Low',
      suggestedCorrection: 'No action required.',
      evidence: `Verified all ${flights.length} flights with zero invariant violations.`,
      detectionTimestamp: timestamp,
      status: 'PASS',
    });
  }

  // 5. Protected Demo Flight Invariants Verification
  const jt123 = flights.find((f) => f.id === 'FL-DEMO-JT123' || f.flightNumber === 'JT-123');
  const id306 = flights.find((f) => f.id === 'FL-DEMO-ID306' || f.flightNumber === 'ID-306');
  const sl789 = flights.find((f) => f.id === 'FL-DEMO-SL789' || f.flightNumber === 'SL-789');
  const jt111 = flights.find((f) => f.id === 'FL-SEED-111' || f.flightNumber === 'JT-111');

  let protectedIntegrityPass = true;
  const protectedNotes: string[] = [];

  if (jt123) {
    const s = jt123.passengerSources.sales.breakdown.total;
    const c = jt123.passengerSources.checkIn.breakdown.total;
    const b = jt123.passengerSources.boarding.breakdown.total;
    if (s === 100 && c === 99 && b === 98) {
      protectedNotes.push('JT-123: Normal Flow (Sales 100, Check-In 99, Boarding 98) Verified');
    } else {
      protectedIntegrityPass = false;
      protectedNotes.push(`JT-123: Unexpected counts (Sales: ${s}, Check-In: ${c}, Boarding: ${b})`);
    }
  } else {
    protectedIntegrityPass = false;
    protectedNotes.push('JT-123: Missing from flight dataset');
  }

  if (id306) {
    const s = id306.passengerSources.sales.breakdown.total;
    const c = id306.passengerSources.checkIn.breakdown.total;
    const b = id306.passengerSources.boarding.breakdown.total;
    if (s === 151 && c === 151 && b === 150) {
      protectedNotes.push('ID-306: Variance / Correction Flow (Sales 151, Check-In 151, Boarding 150) Verified');
    } else {
      protectedIntegrityPass = false;
      protectedNotes.push(`ID-306: Unexpected counts (Sales: ${s}, Check-In: ${c}, Boarding: ${b})`);
    }
  } else {
    protectedIntegrityPass = false;
    protectedNotes.push('ID-306: Missing from flight dataset');
  }

  if (sl789) {
    const s = sl789.passengerSources.sales.breakdown.total;
    const c = sl789.passengerSources.checkIn.breakdown.total;
    const b = sl789.passengerSources.boarding.breakdown.total;
    if (s === 184 && c === 182 && b === 178) {
      protectedNotes.push('SL-789: Contingency Target (Sales 184, Check-In 182, Boarding 178) Verified');
    } else {
      protectedIntegrityPass = false;
      protectedNotes.push(`SL-789: Unexpected counts (Sales: ${s}, Check-In: ${c}, Boarding: ${b})`);
    }
  } else {
    protectedIntegrityPass = false;
    protectedNotes.push('SL-789: Missing from flight dataset');
  }

  if (jt111) {
    const s = jt111.passengerSources.sales.breakdown.total;
    const c = jt111.passengerSources.checkIn.breakdown.total;
    const b = jt111.passengerSources.boarding.breakdown.total;
    if (s === 164 && c === 158 && b === 153) {
      protectedNotes.push('JT-111: Return / Rework Canonical Seed (Sales 164, Check-In 158, Boarding 153) Verified');
    } else {
      protectedIntegrityPass = false;
      protectedNotes.push(`JT-111: Unexpected counts (Sales: ${s}, Check-In: ${c}, Boarding: ${b})`);
    }
  } else {
    protectedIntegrityPass = false;
    protectedNotes.push('JT-111: Missing from flight dataset');
  }

  findings.push({
    findingId: 'RT-007',
    area: 'Protected Story Flight Invariants',
    relatedTab: 'workflow',
    relatedRole: 'ALL',
    relatedRoute: currentRoute,
    relatedModule: 'data.ts',
    description: 'Verify integrity of protected demo flights: JT-111, JT-123, ID-306, SL-789.',
    expectedBehavior: 'JT-123 (100->99->98), ID-306 (151->151->150), SL-789 (184->182->178), JT-111 (164->158->153) must remain intact.',
    actualBehavior: protectedIntegrityPass
      ? 'All 4 protected demo flights match their exact operational invariant counts.'
      : `Protected flight discrepancies: ${protectedNotes.join('; ')}.`,
    possibleRootCause: protectedIntegrityPass ? 'N/A' : 'Operational shift or generator modified protected flights.',
    severity: 'Critical',
    suggestedCorrection: 'Protect FL-SEED-111, FL-DEMO-JT123, FL-DEMO-ID306, FL-DEMO-SL789 from mutation.',
    evidence: protectedNotes.join(' | '),
    detectionTimestamp: timestamp,
    status: protectedIntegrityPass ? 'PASS' : 'FAILED',
  });

  // 6. Real-Time Revenue Ledger Conservation Check
  let revenueAllocationMismatchCount = 0;
  const tickets = generateAllTickets(flights, apbs);
  const revenueReports = getFlightRevenueDetails(flights, apbs, tickets);

  let totalGrossSales = 0;
  let totalFlownRevenue = 0;
  let totalHeldRevenue = 0;
  let totalRefundedAmount = 0;
  let totalRebookedRevenue = 0;
  let totalNoShowRevenue = 0;

  revenueReports.forEach((r) => {
    totalGrossSales += r.grossSales;
    totalFlownRevenue += r.flownRevenue;
    totalHeldRevenue += r.heldRevenue;
    totalRefundedAmount += r.refundedAmount;
    totalRebookedRevenue += r.rebookedRevenue;
    totalNoShowRevenue += r.noShowRecognizedRevenue;

    const leftSide = r.grossSales + r.transferredInRevenue;
    const rightSide = r.flownRevenue + r.heldRevenue + r.refundedAmount + r.rebookedRevenue + r.noShowRecognizedRevenue;
    const variance = Math.abs(leftSide - rightSide);

    if (variance > 0.01) {
      revenueAllocationMismatchCount++;
    }
  });

  if (revenueAllocationMismatchCount > 0) {
    findings.push({
      findingId: 'RT-008',
      area: 'Revenue Allocation Integrity',
      relatedTab: 'bugs',
      relatedRole: 'MANIFEST_HQ',
      relatedRoute: '/hq-sales-revenue',
      relatedModule: 'HQSalesRevenueDashboard.tsx',
      description: 'Audit ticket revenue ledger against Gross Sales + Transferred In = Flown + Held + Refunded + Rebooked + No-Show.',
      expectedBehavior: 'Gross Sales + Transferred-In Revenue must strictly equal the sum of Flown, Held, Refunded, Rebooked, and No-Show Revenue.',
      actualBehavior: `Detected ${revenueAllocationMismatchCount} flights with revenue allocation variances.`,
      possibleRootCause: 'Non-conserved ticket status mapping or unlinked rebooked tickets.',
      severity: 'Critical',
      suggestedCorrection: 'Ensure ticket status transitions conserve gross ticket values exactly.',
      evidence: `Mismatched flight reports: ${revenueAllocationMismatchCount}`,
      detectionTimestamp: timestamp,
      status: 'FAILED',
    });
  } else {
    findings.push({
      findingId: 'RT-008',
      area: 'Revenue Allocation Integrity',
      relatedTab: 'bugs',
      relatedRole: 'MANIFEST_HQ',
      relatedRoute: '/hq-sales-revenue',
      relatedModule: 'HQSalesRevenueDashboard.tsx',
      description: 'Audit ticket revenue ledger against Gross Sales + Transferred In = Flown + Held + Refunded + Rebooked + No-Show.',
      expectedBehavior: 'Gross Sales + Transferred-In Revenue must strictly equal the sum of Flown, Held, Refunded, Rebooked, and No-Show Revenue.',
      actualBehavior: 'All simulated tickets and flight revenue reports adhere 100% to the conservation equation ($0.00 delta).',
      possibleRootCause: 'N/A',
      severity: 'Low',
      suggestedCorrection: 'No action required.',
      evidence: `Validated ${revenueReports.length} flight revenue ledgers and ${tickets.length} tickets. Zero variance.`,
      detectionTimestamp: timestamp,
      status: 'PASS',
    });
  }

  // 7. APB <-> Flight ID 1:1 Integrity
  let apbOrphanCount = 0;
  apbs.forEach((a) => {
    const flight = flights.find((f) => f.id === a.flightId);
    if (!flight) {
      apbOrphanCount++;
    }
  });

  if (apbOrphanCount > 0) {
    findings.push({
      findingId: 'RT-009',
      area: 'APB-Flight Association Integrity',
      relatedTab: 'sync',
      relatedRole: 'ALL',
      relatedRoute: currentRoute,
      relatedModule: 'db.ts',
      description: 'Verify 1:1 relational linkage between Digital APBs and valid flight IDs.',
      expectedBehavior: 'Every APB in the system must map to an active flight record.',
      actualBehavior: `Found ${apbOrphanCount} orphaned APB records without matching flight documents.`,
      possibleRootCause: 'Flight deletion without cascading APB cleanup.',
      severity: 'High',
      suggestedCorrection: 'Enforce relational referential integrity when storing or removing flights.',
      evidence: `Orphaned APBs: ${apbOrphanCount}`,
      detectionTimestamp: timestamp,
      status: 'FAILED',
    });
  } else {
    findings.push({
      findingId: 'RT-009',
      area: 'APB-Flight Association Integrity',
      relatedTab: 'sync',
      relatedRole: 'ALL',
      relatedRoute: currentRoute,
      relatedModule: 'db.ts',
      description: 'Verify 1:1 relational linkage between Digital APBs and valid flight IDs.',
      expectedBehavior: 'Every APB maps to a valid flight.',
      actualBehavior: 'All Digital APBs are validly linked to active flight documents.',
      possibleRootCause: 'N/A',
      severity: 'Low',
      suggestedCorrection: 'No action required.',
      evidence: `Verified ${apbs.length} APBs with 100% valid flight linkages.`,
      detectionTimestamp: timestamp,
      status: 'PASS',
    });
  }

  // 8. Rebook Chronology & Destination Eligibility Check
  let rebookClosedStateViolations = 0;
  const rebookClosedStateList: string[] = [];
  let rebookChronologyViolations = 0;
  const rebookChronologyList: string[] = [];
  let protectedDemoTransferViolations = 0;
  const protectedDemoTransferList: string[] = [];
  let rebookOrphanViolations = 0;
  const rebookOrphanList: string[] = [];

  const rebookedTickets = tickets.filter((t) => t.rebookedToFlightId);

  rebookedTickets.forEach((t) => {
    const srcFlight = flights.find((f) => f.id === t.flightId);
    const destFlight = flights.find((f) => f.id === t.rebookedToFlightId);

    // 1. All rebookedToFlightId references must resolve to a real flight
    if (!destFlight) {
      rebookOrphanViolations++;
      rebookOrphanList.push(`Ticket ${t.ticketId} targets unresolvable flight ID: ${t.rebookedToFlightId}`);
      return;
    }

    // 2. Zero rebook destinations in closed states
    if (!OPEN_REBOOK_STATUSES.includes(destFlight.movementStatus)) {
      rebookClosedStateViolations++;
      rebookClosedStateList.push(`Ticket ${t.ticketId} (${t.flightNumber}) rebooked to ${destFlight.flightNumber} with closed status ${destFlight.movementStatus}`);
    }

    // 3. Zero rebook destinations with invalid chronology (dest effective departure time must be > source effective departure time)
    if (srcFlight) {
      const srcEffTime = getEffectiveDepartureTime(srcFlight);
      const destEffTime = getEffectiveDepartureTime(destFlight);
      if (destEffTime <= srcEffTime) {
        rebookChronologyViolations++;
        const srcTimeStr = srcFlight.estimatedDeparture || srcFlight.scheduledDeparture;
        const destTimeStr = destFlight.estimatedDeparture || destFlight.scheduledDeparture;
        rebookChronologyList.push(`Ticket ${t.ticketId} (${t.flightNumber}, ETD/STD: ${srcTimeStr}) rebooked to ${destFlight.flightNumber} with past/equal ETD/STD (${destTimeStr})`);
      }
    }

    // 4. Zero ambient transfers into protected demo flights
    if (PROTECTED_DEMO_FLIGHT_IDS.includes(destFlight.id)) {
      protectedDemoTransferViolations++;
      protectedDemoTransferList.push(`Ticket ${t.ticketId} (${t.flightNumber}) ambiently transferred into protected demo flight ${destFlight.flightNumber} (${destFlight.id})`);
    }
  });

  const totalRebookViolations =
    rebookClosedStateViolations +
    rebookChronologyViolations +
    protectedDemoTransferViolations +
    rebookOrphanViolations;

  const rebookEligibilityPassed = totalRebookViolations === 0 && revenueAllocationMismatchCount === 0;

  if (!rebookEligibilityPassed) {
    const errorDetails = [
      ...rebookClosedStateList,
      ...rebookChronologyList,
      ...protectedDemoTransferList,
      ...rebookOrphanList,
    ].slice(0, 3).join('; ');

    findings.push({
      findingId: 'RT-010',
      area: 'Rebook Chronology & Destination Eligibility',
      relatedTab: 'workflow',
      relatedRole: 'MANIFEST_HQ',
      relatedRoute: '/hq-sales-revenue',
      relatedModule: 'revenueData.ts',
      description: 'Audit ticket rebooking destination eligibility: operationally open status, valid future departure chronology (dest effective departure time > source rebooking timestamp), zero ambient rebooking into protected demo flights, and complete flight resolution.',
      expectedBehavior: 'Zero rebook destinations in closed states, zero chronology inversions (effective departure time past/equal), zero ambient transfers to protected demo flights, 100% resolved destination flight IDs, and zero revenue conservation variance.',
      actualBehavior: `Detected ${totalRebookViolations} rebook eligibility violations: ${errorDetails || 'Revenue mismatch'}.`,
      possibleRootCause: 'Candidate destination selection included a closed, past, orphaned, or protected demo flight.',
      severity: 'Critical',
      suggestedCorrection: 'Enforce OPEN_REBOOK_STATUSES, strict effective future departure validation, and PROTECTED_DEMO_FLIGHT_IDS exclusion in candidate destination selection.',
      evidence: `Closed state violations: ${rebookClosedStateViolations}, Chronology violations: ${rebookChronologyViolations}, Protected demo violations: ${protectedDemoTransferViolations}, Orphan references: ${rebookOrphanViolations}, Revenue mismatch count: ${revenueAllocationMismatchCount}`,
      detectionTimestamp: timestamp,
      status: 'FAILED',
    });
  } else {
    findings.push({
      findingId: 'RT-010',
      area: 'Rebook Chronology & Destination Eligibility',
      relatedTab: 'workflow',
      relatedRole: 'MANIFEST_HQ',
      relatedRoute: '/hq-sales-revenue',
      relatedModule: 'revenueData.ts',
      description: 'Audit ticket rebooking destination eligibility: operationally open status, valid future departure chronology (dest effective departure time > source rebooking timestamp), zero ambient rebooking into protected demo flights, and complete flight resolution.',
      expectedBehavior: 'Zero rebook destinations in closed states, zero chronology inversions (effective departure time past/equal), zero ambient transfers to protected demo flights, 100% resolved destination flight IDs, and zero revenue conservation variance.',
      actualBehavior: `All ${rebookedTickets.length} rebooked tickets target valid, operationally open future flights with zero ambient transfers into protected demo flights, 100% resolved linkages, and zero revenue variance.`,
      possibleRootCause: 'N/A',
      severity: 'Low',
      suggestedCorrection: 'No action required.',
      evidence: `Audited ${rebookedTickets.length} rebooked tickets across ${flights.length} flights. Zero closed destinations, zero past flights, zero protected demo ambient transfers, zero orphaned IDs, and $0.00 revenue conservation delta.`,
      detectionTimestamp: timestamp,
      status: 'PASS',
    });
  }

  return {
    timestamp,
    findings,
    stats: {
      activeFlightsCount: activeCount,
      completedFlightsCount: completedCount,
      totalFlightsCount: flights.length,
      apbsCount: apbs.length,
      indexedDbAvailable: idbAvailable,
      activeRole: currentRole || 'GUEST',
      totalGrossSales,
      totalFlownRevenue,
      totalHeldRevenue,
      totalRefundedAmount,
      totalRebookedRevenue,
      totalNoShowRevenue,
      revenueAllocationMismatchCount,
      capacityViolationCount,
      passengerInvariantViolationCount,
      protectedDemoFlightIntegrity: protectedIntegrityPass,
      rebookClosedStateViolationCount: rebookClosedStateViolations,
      rebookChronologyViolationCount: rebookChronologyViolations,
      protectedDemoTransferViolationCount: protectedDemoTransferViolations,
      rebookOrphanViolationCount: rebookOrphanViolations,
      rebookEligibilityPassed,
    },
  };
}
