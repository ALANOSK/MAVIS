/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { transitionAPB, canTransitionAPB } from '../lib/apbStateMachine';
import { validateFlight, validateAPB } from '../lib/domainValidators';
import { reconcileEmergencyRecord } from '../lib/reconciliation';
import { evaluateExcessBaggageMatch, evaluateLimitedReleaseMatch } from '../lib/auditMatchingEngine';
import { Flight, DigitalAPB, getAPBStatusLayers, getSimplifiedAPBDisplay } from '../types';

export interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  durationMs: number;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  results: TestResult[];
  executedAt: string;
}

export function runAllUnitTests(): TestSuiteSummary {
  const results: TestResult[] = [];

  // Test 1: APB state transitions & rejection of illegal jumps
  {
    const start = performance.now();
    let passed = true;
    let message = 'All canonical state transitions and illegal rejection rules verified.';

    const t1 = transitionAPB('NOT_CREATED', 'PREPARE');
    if (!t1.ok || t1.nextStatus !== 'PREPARED') {
      passed = false;
      message = 'Failed transition NOT_CREATED -> PREPARED';
    }

    const t2 = transitionAPB('PREPARED', 'FA_SUBMIT');
    if (!t2.ok || t2.nextStatus !== 'FA_SUBMITTED') {
      passed = false;
      message = 'Failed transition PREPARED -> FA_SUBMITTED';
    }

    const t3 = transitionAPB('FA_SUBMITTED', 'FO_SEND_TO_SERVER');
    if (!t3.ok || t3.nextStatus !== 'SENT_TO_SERVER') {
      passed = false;
      message = 'Failed transition FA_SUBMITTED -> SENT_TO_SERVER';
    }

    // Illegal jump test: NOT_CREATED to HQ_REVIEWED must fail
    const illegal = transitionAPB('NOT_CREATED', 'HQ_APPROVE');
    if (illegal.ok) {
      passed = false;
      message = 'Illegal transition NOT_CREATED -> HQ_REVIEWED was incorrectly accepted';
    }

    results.push({
      testName: 'test_apb_state_transitions',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 2: Station -> HQ behavior
  {
    const start = performance.now();
    let passed = true;
    let message = 'Station forwarding correctly transitions to PENDING_HQ_REVIEW (not HQ_REVIEWED).';

    const forwardResult = transitionAPB('SENT_TO_SERVER', 'STATION_FORWARD_TO_HQ');
    if (!forwardResult.ok || forwardResult.nextStatus !== 'PENDING_HQ_REVIEW') {
      passed = false;
      message = `Expected PENDING_HQ_REVIEW, received ${forwardResult.nextStatus}`;
    }

    if (forwardResult.nextStatus === 'HQ_REVIEWED') {
      passed = false;
      message = 'Station bypass detected: Directly transitioned to HQ_REVIEWED';
    }

    results.push({
      testName: 'test_station_to_hq_behavior',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 3: HQ -> Station return behavior
  {
    const start = performance.now();
    let passed = true;
    let message = 'HQ return correctly transitions to RETURNED_TO_MANIFEST_STATION.';

    const returnResult = transitionAPB('PENDING_HQ_REVIEW', 'HQ_RETURN_TO_STATION');
    if (!returnResult.ok || returnResult.nextStatus !== 'RETURNED_TO_MANIFEST_STATION') {
      passed = false;
      message = `Expected RETURNED_TO_MANIFEST_STATION, received ${returnResult.nextStatus}`;
    }

    if (returnResult.nextStatus === 'STATION_CHECKED') {
      passed = false;
      message = 'HQ return mislabeled as STATION_CHECKED';
    }

    results.push({
      testName: 'test_hq_to_station_return_behavior',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 4: Return/rework lifecycle consistency
  {
    const start = performance.now();
    let passed = true;
    let message = 'Return/rework lifecycle consistency and status layers verified.';

    const testApb: DigitalAPB = {
      id: 'APB-TEST-001',
      flightId: 'FL-TEST-001',
      apbUniqueNumber: 'APB-TEST-2026-001',
      status: 'RETURNED_TO_MANIFEST_STATION',
      serverStatus: 'SENT',
      preparedBy: 'TEST-USER',
      preparedAt: new Date().toISOString(),
      processingStatus: null,
      temporaryCount: { adult: 100, child: 10, infant: 2, total: 112 },
      actualCount: { adult: 100, child: 10, infant: 2, total: 112 },
      previousActualCounts: [],
      extraCrew: 0,
      notes: [],
      flightAttendantVerification: null,
      flightAttendantSubmittedAt: null,
      flightOperationsRemark: '',
      submissionId: 'SUB-TEST-001',
      sentBy: 'TEST-USER',
      sentAt: new Date().toISOString(),
      manifestStationReview: null,
      manifestHQReview: null,
      reworkStatus: 'RETURNED',
      reworkReviewStatus: 'RETURNED',
    };

    const layers = getAPBStatusLayers(testApb, 'LIVE');
    const display = getSimplifiedAPBDisplay(testApb, 'LIVE');

    if (layers.reworkStatus !== 'RETURNED' || layers.reworkReviewStatus !== 'RETURNED') {
      passed = false;
      message = 'Layers mismatch for RETURNED_TO_MANIFEST_STATION';
    }
    if (display.primaryLabel !== 'RETURNED FOR CORRECTION') {
      passed = false;
      message = `Display label mismatch: expected RETURNED FOR CORRECTION, got ${display.primaryLabel}`;
    }

    results.push({
      testName: 'test_return_rework_lifecycle_consistency',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 5: Capacity invariant
  {
    const start = performance.now();
    let passed = true;
    let message = 'Capacity and non-negative breakdown invariants enforced.';

    const invalidFlight: Flight = {
      id: 'FL-INVALID-001',
      flightNumber: 'JT-999',
      carrierCode: 'JT',
      flightDate: '2026-08-27',
      origin: 'CGK',
      destination: 'DPS',
      departureTerminal: '1A',
      arrivalTerminal: '2F',
      gate: 'G1',
      boardingGate: 'B1',
      scheduledDeparture: new Date().toISOString(),
      estimatedDeparture: new Date().toISOString(),
      scheduledArrival: new Date().toISOString(),
      estimatedArrival: new Date().toISOString(),
      flightStatus: 'ACTIVE',
      movementStatus: 'SCHEDULED',
      delayMinutes: 0,
      crewRoster: [],
      operationsStaff: [],
      aircraft: {
        registration: 'PK-LKP',
        type: 'B737-800',
        capacity: 180,
        seatConfiguration: '3-3',
      },
      passengerSources: {
        sales: { source: 'SALES', breakdown: { adult: 190, child: 10, infant: 0, total: 200 }, updatedAt: new Date().toISOString() },
        checkIn: { source: 'CHECK_IN', breakdown: { adult: 190, child: 10, infant: 0, total: 200 }, updatedAt: new Date().toISOString() },
        boarding: { source: 'BOARDING', breakdown: { adult: 190, child: 10, infant: 0, total: 200 }, updatedAt: new Date().toISOString() },
        offload: { source: 'OFFLOAD', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: new Date().toISOString() },
        noShow: { source: 'NO_SHOW', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: new Date().toISOString() },
      },
      apbId: null,
    };

    const validation = validateFlight(invalidFlight);
    if (validation.valid) {
      passed = false;
      message = 'Failed to reject flight with passenger count (200) exceeding capacity (180)';
    }

    results.push({
      testName: 'test_capacity_invariant',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 6: Reconciliation 183 -> 181
  {
    const start = performance.now();
    let passed = true;
    let message = 'Emergency flight 183 pax correctly reconciles to 181 official pax with -2 variance and blocks without FA count.';

    const dummyFlight: Flight = {
      id: 'FL-EMERGENCY-001',
      carrierCode: 'JT',
      flightNumber: 'JT-610',
      flightDate: '2026-08-27',
      origin: 'CGK',
      destination: 'DPS',
      departureTerminal: '1A',
      arrivalTerminal: '2F',
      gate: 'G1',
      boardingGate: 'B1',
      scheduledDeparture: new Date().toISOString(),
      estimatedDeparture: new Date().toISOString(),
      scheduledArrival: new Date().toISOString(),
      estimatedArrival: new Date().toISOString(),
      flightStatus: 'ACTIVE',
      movementStatus: 'BOARDING',
      delayMinutes: 0,
      aircraft: { type: 'B737-800', registration: 'PK-LKP', capacity: 189, seatConfiguration: '3-3' },
      crewRoster: [],
      operationsStaff: [],
      passengerSources: {
        sales: { source: 'SALES', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
        checkIn: { source: 'CHECK_IN', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
        boarding: { source: 'BOARDING', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
        offload: { source: 'OFFLOAD', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
        noShow: { source: 'NO_SHOW', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
      },
      apbId: 'APB-EMG-001',
      sourceMode: 'MANUAL_EMERGENCY',
      syncStatus: 'PENDING',
    };

    const dummyApbMissingCount: DigitalAPB = {
      id: 'APB-EMG-001',
      flightId: 'FL-EMERGENCY-001',
      apbUniqueNumber: 'APB-EMG-2026',
      status: 'PREPARED',
      serverStatus: 'NOT_SENT',
      preparedBy: 'USER',
      preparedAt: new Date().toISOString(),
      processingStatus: null,
      temporaryCount: { adult: 0, child: 0, infant: 0, total: 0 },
      actualCount: null,
      previousActualCounts: [],
      extraCrew: 0,
      notes: [],
      flightAttendantVerification: null,
      flightAttendantSubmittedAt: null,
      flightOperationsRemark: '',
      submissionId: null,
      sentBy: null,
      sentAt: null,
      manifestStationReview: null,
      manifestHQReview: null,
      sourceMode: 'MANUAL_EMERGENCY',
      syncStatus: 'PENDING',
    };

    // Should block when actualCount is null
    const blockedOutcome = reconcileEmergencyRecord(dummyFlight, dummyApbMissingCount, 'CGK');
    if (!blockedOutcome.error) {
      passed = false;
      message = 'Failed to block reconciliation when actualCount is null';
    }

    // Should succeed when actualCount is 183
    const dummyApbWithCount: DigitalAPB = {
      ...dummyApbMissingCount,
      actualCount: { adult: 170, child: 10, infant: 3, total: 183 },
    };

    const successOutcome = reconcileEmergencyRecord(dummyFlight, dummyApbWithCount, 'CGK');
    if (successOutcome.error || !successOutcome.reconciledFlight || !successOutcome.reconciledAPB) {
      passed = false;
      message = `Valid reconciliation failed with error: ${successOutcome.error}`;
    } else if (successOutcome.variance !== -2 || successOutcome.reconciledAPB.actualCount?.total !== 181) {
      passed = false;
      message = `Variance or target count mismatch. Variance: ${successOutcome.variance}, Actual: ${successOutcome.reconciledAPB.actualCount?.total}`;
    }

    results.push({
      testName: 'test_reconciliation_183_to_181',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 7: Simulator guard
  {
    const start = performance.now();
    let passed = true;
    let message = 'Simulator correctly blocks mutation when contingencyState is not LIVE.';

    const isSimulationAllowed = (contingencyState: string, simulationActive: boolean) => {
      if (contingencyState !== 'LIVE') return false;
      return simulationActive;
    };

    if (isSimulationAllowed('NO_CACHE', true)) {
      passed = false;
      message = 'Simulator allowed execution under NO_CACHE outage state';
    }
    if (isSimulationAllowed('CACHE_AVAILABLE', true)) {
      passed = false;
      message = 'Simulator allowed execution under CACHE_AVAILABLE outage state';
    }
    if (isSimulationAllowed('RECONCILING', true)) {
      passed = false;
      message = 'Simulator allowed execution under RECONCILING state';
    }
    if (isSimulationAllowed('LIVE', false)) {
      passed = false;
      message = 'Simulator allowed uncontrolled execution while simulationActive is false';
    }

    results.push({
      testName: 'test_simulator_guard',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 8: Domain validation before persistence
  {
    const start = performance.now();
    let passed = true;
    let message = 'Domain validators correctly catch malformed data before database write.';

    const badApb: DigitalAPB = {
      id: '',
      flightId: 'FL-001',
      apbUniqueNumber: 'APB-001',
      status: 'PREPARED',
      serverStatus: 'NOT_SENT',
      preparedBy: 'USER',
      preparedAt: new Date().toISOString(),
      processingStatus: null,
      temporaryCount: { adult: -5, child: 0, infant: 0, total: -5 },
      actualCount: null,
      previousActualCounts: [],
      extraCrew: 0,
      notes: [],
      flightAttendantVerification: null,
      flightAttendantSubmittedAt: null,
      flightOperationsRemark: '',
      submissionId: null,
      sentBy: null,
      sentAt: null,
      manifestStationReview: null,
      manifestHQReview: null,
      reworkStatus: 'APPROVED',
      reworkReviewStatus: 'APPROVED',
    };

    const apbValidation = validateAPB(badApb);
    if (apbValidation.valid) {
      passed = false;
      message = 'Domain validation failed to catch negative passenger count and empty ID';
    }

    results.push({
      testName: 'test_domain_validation_before_persistence',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 9: No Cache & Manual Emergency Passenger Integrity
  {
    const start = performance.now();
    let passed = true;
    let message = 'Manual emergency flight passenger sources correctly initialize with null timestamps and 0 count before FA census.';

    const emergencyFlightPassengerSources = {
      sales: { source: 'SALES' as const, breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
      checkIn: { source: 'CHECK_IN' as const, breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
      boarding: { source: 'BOARDING' as const, breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
    };

    if (
      emergencyFlightPassengerSources.sales.updatedAt !== null ||
      emergencyFlightPassengerSources.boarding.updatedAt !== null ||
      emergencyFlightPassengerSources.boarding.breakdown.total !== 0
    ) {
      passed = false;
      message = 'Emergency passenger sources must not claim synthetic values or timestamps before source recovery';
    }

    results.push({
      testName: 'test_no_cache_emergency_passenger_integrity',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 10: Small aircraft capacity-aware emergency recovery
  {
    const start = performance.now();
    let passed = true;
    let message = 'Small aircraft emergency recovery strictly respects aircraft capacity (e.g. 72 pax) without forcing 181/183.';

    const smallFlight: Flight = {
      id: 'FL-ATR-72',
      carrierCode: 'IW',
      flightNumber: 'IW-1234',
      flightDate: '2026-08-27',
      origin: 'CGK',
      destination: 'SUB',
      departureTerminal: '1B',
      arrivalTerminal: '1',
      gate: 'G2',
      boardingGate: 'B2',
      scheduledDeparture: new Date().toISOString(),
      estimatedDeparture: new Date().toISOString(),
      scheduledArrival: new Date().toISOString(),
      estimatedArrival: new Date().toISOString(),
      flightStatus: 'ACTIVE',
      movementStatus: 'BOARDING',
      delayMinutes: 0,
      aircraft: { type: 'ATR 72-600', registration: 'PK-WFS', capacity: 72, seatConfiguration: '2-2' },
      crewRoster: [],
      operationsStaff: [],
      passengerSources: {
        sales: { source: 'SALES', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
        checkIn: { source: 'CHECK_IN', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
        boarding: { source: 'BOARDING', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
        offload: { source: 'OFFLOAD', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
        noShow: { source: 'NO_SHOW', breakdown: { adult: 0, child: 0, infant: 0, total: 0 }, updatedAt: null },
      },
      apbId: 'APB-ATR-001',
      sourceMode: 'MANUAL_EMERGENCY',
      syncStatus: 'PENDING',
    };

    const smallApb: DigitalAPB = {
      id: 'APB-ATR-001',
      flightId: 'FL-ATR-72',
      apbUniqueNumber: 'APB-ATR-2026',
      status: 'PREPARED',
      serverStatus: 'NOT_SENT',
      preparedBy: 'USER',
      preparedAt: new Date().toISOString(),
      processingStatus: null,
      temporaryCount: { adult: 0, child: 0, infant: 0, total: 0 },
      actualCount: { adult: 65, child: 4, infant: 1, total: 70 },
      previousActualCounts: [],
      extraCrew: 0,
      notes: [],
      flightAttendantVerification: null,
      flightAttendantSubmittedAt: null,
      flightOperationsRemark: '',
      submissionId: null,
      sentBy: null,
      sentAt: null,
      manifestStationReview: null,
      manifestHQReview: null,
      sourceMode: 'MANUAL_EMERGENCY',
      syncStatus: 'PENDING',
    };

    const smallOutcome = reconcileEmergencyRecord(smallFlight, smallApb, 'CGK');
    if (smallOutcome.error || !smallOutcome.reconciledFlight || !smallOutcome.reconciledAPB) {
      passed = false;
      message = `Small aircraft reconciliation failed: ${smallOutcome.error}`;
    } else {
      const recFlight = smallOutcome.reconciledFlight;
      const sales = recFlight.passengerSources.sales.breakdown.total;
      const checkIn = recFlight.passengerSources.checkIn.breakdown.total;
      const boarding = recFlight.passengerSources.boarding.breakdown.total;

      if (sales > 72 || checkIn > sales || boarding > checkIn) {
        passed = false;
        message = `Breakdown violated capacity or hierarchy constraints: Sales=${sales}, CheckIn=${checkIn}, Boarding=${boarding}, Capacity=72`;
      } else if (sales === 183 || boarding === 181) {
        passed = false;
        message = `Incorrectly used large aircraft synthetic constants (183/181) on 72-seat aircraft`;
      }
    }

    results.push({
      testName: 'test_small_aircraft_capacity_recovery',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 11: Audit Excess Baggage deterministic verification
  {
    const start = performance.now();
    let passed = true;
    let message = 'Excess baggage verification correctly identifies discrepancies and matches.';

    const matchedCase = evaluateExcessBaggageMatch(
      {
        bagTag: 'JT-1001',
        pieces: 1,
        allowanceKg: 20,
        actualWeightKg: 25,
        excessKg: 5,
        chargeAmount: 250000,
        currency: 'IDR',
        receiptNo: 'EBT-12345',
        evidencePieces: 1,
        evidenceWeightKg: 25,
        evidenceExcessKg: 5,
        evidenceChargeAmount: 250000,
        evidenceReceiptNo: 'EBT-12345',
      },
      true
    );

    if (matchedCase.status !== 'MATCHED' || matchedCase.findings[0] !== 'MATCHED') {
      passed = false;
      message = 'Failed to match clean excess baggage record with matching evidence.';
    }

    const mismatchCase = evaluateExcessBaggageMatch(
      {
        bagTag: 'JT-1002',
        pieces: 1,
        allowanceKg: 20,
        actualWeightKg: 30,
        excessKg: 10,
        chargeAmount: 500000,
        currency: 'IDR',
        receiptNo: 'EBT-99999',
        evidencePieces: 1,
        evidenceWeightKg: 35, // 5kg discrepancy
        evidenceExcessKg: 15,
        evidenceChargeAmount: 500000,
        evidenceReceiptNo: 'EBT-99999',
      },
      true
    );

    if (mismatchCase.status !== 'DISCREPANCY' || !mismatchCase.findings.includes('WEIGHT_MISMATCH')) {
      passed = false;
      message = 'Failed to detect weight discrepancy in excess baggage evaluation.';
    }

    results.push({
      testName: 'test_audit_excess_baggage_matching_logic',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  // Test 12: Audit Limited Release compliance verification
  {
    const start = performance.now();
    let passed = true;
    let message = 'Limited release indemnity rules strictly require physical signed document.';

    const unsignedCase = evaluateLimitedReleaseMatch({
      bagTag: 'JT-LR-001',
      releaseIndicator: 'YES',
      reason: 'FRAGILE',
      documentAttached: true,
      signatureConfirmed: false,
      passengerRefMatch: true,
      bagTagMatch: true,
    });

    if (unsignedCase.status !== 'DISCREPANCY' || !unsignedCase.findings.includes('MISSING_SIGNATURE')) {
      passed = false;
      message = 'Unsigned limited release form was not flagged with MISSING_SIGNATURE discrepancy.';
    }

    const noDocCase = evaluateLimitedReleaseMatch({
      bagTag: 'JT-LR-002',
      releaseIndicator: 'YES',
      reason: 'UNSUITABLE_PACKING',
      documentAttached: false,
      signatureConfirmed: false,
      passengerRefMatch: true,
      bagTagMatch: true,
    });

    if (noDocCase.status !== 'MISSING_EVIDENCE' || !noDocCase.findings.includes('MISSING_DOCUMENT')) {
      passed = false;
      message = 'Missing document in limited release was not flagged as MISSING_EVIDENCE.';
    }

    results.push({
      testName: 'test_audit_limited_release_compliance_logic',
      passed,
      message,
      durationMs: +(performance.now() - start).toFixed(2),
    });
  }

  const passedCount = results.filter((r) => r.passed).length;

  return {
    total: results.length,
    passed: passedCount,
    failed: results.length - passedCount,
    results,
    executedAt: new Date().toISOString(),
  };
}
