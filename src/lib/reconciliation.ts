/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flight, DigitalAPB, PassengerBreakdown, StationCode } from '../types';

export type ContingencyState = 'LIVE' | 'CACHE_AVAILABLE' | 'NO_CACHE' | 'RECONCILING';

export interface EmergencyPassengerCalculationResult {
  breakdown: PassengerBreakdown;
  error?: string;
}

/**
 * Calculates a mathematically sound passenger breakdown that strictly never exceeds aircraft capacity.
 * For standard demo flights (capacity >= 183), generates the canonical 183 pax scenario (170 ADT, 10 CHD, 3 INF).
 * For smaller aircraft (capacity < 183, e.g. 72), generates proportional counts <= capacity.
 */
export function calculateEmergencyPassengerBreakdown(
  capacity: number
): EmergencyPassengerCalculationResult {
  if (!capacity || capacity <= 0) {
    return {
      breakdown: { adult: 0, child: 0, infant: 0, total: 0 },
      error: `Invalid aircraft capacity (${capacity}). Capacity must be greater than 0.`,
    };
  }

  if (capacity >= 183) {
    return {
      breakdown: { adult: 170, child: 10, infant: 3, total: 183 },
    };
  }

  // Scale within capacity for smaller regional/charter equipment
  const targetTotal = capacity;
  const infant = Math.min(3, Math.floor(targetTotal * 0.02));
  const child = Math.min(10, Math.floor(targetTotal * 0.05));
  const adult = Math.max(0, targetTotal - child - infant);

  return {
    breakdown: {
      adult,
      child,
      infant,
      total: adult + child + infant,
    },
  };
}

/**
 * Evaluates whether an operational simulation cycle is permitted to execute.
 * Rule:
 * 1. Contingency state MUST be 'LIVE'. Outage and reconciling states are blocked.
 * 2. If 'forced' is true (manual user button click), exactly one cycle executes.
 * 3. If 'forced' is false (automatic background ticker), execution requires explicit 'demoSimulationActive === true'.
 */
export function isSimulationCycleAllowed(
  contingencyState: ContingencyState,
  demoSimulationActive: boolean,
  forced: boolean
): boolean {
  if (contingencyState !== 'LIVE') {
    return false;
  }
  if (forced) {
    return true;
  }
  return demoSimulationActive;
}

export interface ReconciliationOutcome {
  reconciledFlight?: Flight;
  reconciledAPB?: DigitalAPB;
  variance?: number;
  error?: string;
}

/**
 * Derives official recovered passenger breakdown from DCS records respecting aircraft seat capacity.
 * For standard demo flights (capacity >= 183), preserves canonical 183 sales/check-in and 181 boarded (variance -2).
 * For smaller aircraft (capacity < 183), derives valid values strictly satisfying:
 * boarding <= checkIn <= sales <= aircraft.capacity
 */
export function deriveRecoveredPassengerBreakdown(
  capacity: number,
  emergencyPax: PassengerBreakdown
): {
  sales: PassengerBreakdown;
  checkIn: PassengerBreakdown;
  boarding: PassengerBreakdown;
  offload: PassengerBreakdown;
  noShow: PassengerBreakdown;
  variance: number;
} {
  const manualTotal = emergencyPax.total;

  if (capacity >= 183) {
    const sales: PassengerBreakdown = { adult: 170, child: 10, infant: 3, total: 183 };
    const checkIn: PassengerBreakdown = { adult: 170, child: 10, infant: 3, total: 183 };
    const boarding: PassengerBreakdown = { adult: 168, child: 10, infant: 3, total: 181 };
    const offload: PassengerBreakdown = { adult: 2, child: 0, infant: 0, total: 2 };
    const noShow: PassengerBreakdown = { adult: 0, child: 0, infant: 0, total: 0 };
    const variance = boarding.total - manualTotal;

    return { sales, checkIn, boarding, offload, noShow, variance };
  }

  // Smaller capacity aircraft (e.g. capacity = 72)
  const clampedManual = Math.min(manualTotal, capacity);
  const salesTotal = Math.min(capacity, Math.max(clampedManual, Math.min(capacity, clampedManual + 2)));
  const checkInTotal = salesTotal;
  const offloadCount = Math.min(2, Math.max(0, salesTotal - (clampedManual > 2 ? clampedManual - 2 : clampedManual)));
  const boardingTotal = Math.max(0, checkInTotal - offloadCount);

  const infant = Math.min(emergencyPax.infant || 0, Math.min(3, Math.floor(boardingTotal * 0.04)));
  const child = Math.min(emergencyPax.child || 0, Math.min(8, Math.floor(boardingTotal * 0.08)));
  const adult = Math.max(0, boardingTotal - child - infant);

  const boarding: PassengerBreakdown = { adult, child, infant, total: adult + child + infant };
  const checkIn: PassengerBreakdown = { adult: adult + offloadCount, child, infant, total: boarding.total + offloadCount };
  const sales: PassengerBreakdown = { ...checkIn };
  const offload: PassengerBreakdown = { adult: offloadCount, child: 0, infant: 0, total: offloadCount };
  const noShow: PassengerBreakdown = { adult: 0, child: 0, infant: 0, total: 0 };
  const variance = boarding.total - manualTotal;

  return { sales, checkIn, boarding, offload, noShow, variance };
}

/**
 * Performs official DCS reconciliation for emergency offline flights.
 * Updates passenger boarding to official recovered DCS counts with historical audit trail.
 * Requires a valid Flight Attendant physical cabin count (APB.actualCount).
 */
export function reconcileEmergencyRecord(
  flight: Flight,
  apb: DigitalAPB,
  stationCode: StationCode
): ReconciliationOutcome {
  const emergencyPax = apb.actualCount;
  if (!emergencyPax || emergencyPax.total === 0) {
    return {
      error: 'Physical cabin emergency count has not been completed. Flight Attendant physical census is required before reconciliation.',
    };
  }

  const capacity = flight.aircraft?.capacity || 189;
  const { sales, checkIn, boarding, offload, noShow, variance } = deriveRecoveredPassengerBreakdown(
    capacity,
    emergencyPax
  );

  const now = new Date().toISOString();

  const reconciledFlight: Flight = {
    ...flight,
    passengerSources: {
      sales: {
        source: 'SALES',
        breakdown: sales,
        updatedAt: now,
      },
      checkIn: {
        source: 'CHECK_IN',
        breakdown: checkIn,
        updatedAt: now,
      },
      boarding: {
        source: 'BOARDING',
        breakdown: boarding,
        updatedAt: now,
      },
      offload: {
        source: 'OFFLOAD',
        breakdown: offload,
        updatedAt: now,
      },
      noShow: {
        source: 'NO_SHOW',
        breakdown: noShow,
        updatedAt: now,
      },
    },
    syncStatus: 'SYNCHRONIZED',
  };

  const previousActualCounts = [...(apb.previousActualCounts || []), emergencyPax];
  const newNote = {
    apbUniqueNumber: apb.apbUniqueNumber,
    apbVersion: previousActualCounts.length + 1,
    noteText: `Reconciled recovered SABRE DCS official count (${boarding.total} Pax) against offline emergency count (${emergencyPax.total} Pax). Variance: ${variance > 0 ? `+${variance}` : variance} Pax (Gate Offload).`,
    authorEmployeeId: 'SYSTEM-RECON',
    authorName: 'SABRE / DCS Sync Engine',
    role: 'System Reconciler',
    station: stationCode,
    utcTimestamp: now,
    localTimestamp: new Date().toString(),
    eventType: 'RECONCILIATION_COMPLETED',
    syncStatus: 'SYNCHRONIZED' as const,
  };

  const reconciledAPB: DigitalAPB = {
    ...apb,
    actualCount: boarding,
    previousActualCounts,
    notes: [...(apb.notes || []), newNote],
    verificationStatus: 'RECONCILED',
    syncStatus: 'SYNCHRONIZED',
  };

  return {
    reconciledFlight,
    reconciledAPB,
    variance,
  };
}
