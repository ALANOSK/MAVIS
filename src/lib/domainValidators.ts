/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flight, DigitalAPB, PassengerBreakdown } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassengerBreakdown(
  name: string,
  breakdown: PassengerBreakdown | null | undefined,
  capacity?: number
): string[] {
  const errors: string[] = [];
  if (!breakdown) {
    errors.push(`${name} is missing breakdown data`);
    return errors;
  }
  if (breakdown.adult < 0 || breakdown.child < 0 || breakdown.infant < 0) {
    errors.push(
      `${name} cannot contain negative passenger values (adult: ${breakdown.adult}, child: ${breakdown.child}, infant: ${breakdown.infant})`
    );
  }
  const calculatedTotal = breakdown.adult + breakdown.child + breakdown.infant;
  if (breakdown.total !== calculatedTotal) {
    errors.push(
      `${name} total mismatch: reported ${breakdown.total} but sum of adult+child+infant is ${calculatedTotal}`
    );
  }
  if (capacity !== undefined && capacity > 0 && breakdown.total > capacity) {
    errors.push(`${name} total (${breakdown.total}) exceeds aircraft capacity (${capacity})`);
  }
  return errors;
}

export function validateFlight(flight: Flight): ValidationResult {
  const errors: string[] = [];
  if (!flight.id) errors.push('Flight missing required ID');
  if (!flight.flightNumber) errors.push('Flight missing flight number');
  if (!flight.carrierCode) errors.push('Flight missing carrier code');
  if (!flight.origin) errors.push('Flight missing origin station');
  if (!flight.destination) errors.push('Flight missing destination station');

  const capacity = flight.aircraft?.capacity || 0;
  if (capacity <= 0) {
    errors.push(`Invalid aircraft capacity: ${capacity}. Must be greater than 0.`);
  }

  if (flight.passengerSources) {
    const salesErrors = validatePassengerBreakdown(
      'Sales',
      flight.passengerSources.sales?.breakdown,
      capacity
    );
    const checkInErrors = validatePassengerBreakdown(
      'Check-in',
      flight.passengerSources.checkIn?.breakdown,
      capacity
    );
    const boardingErrors = validatePassengerBreakdown(
      'Boarding',
      flight.passengerSources.boarding?.breakdown,
      capacity
    );
    errors.push(...salesErrors, ...checkInErrors, ...boardingErrors);

    const salesTotal = flight.passengerSources.sales?.breakdown?.total || 0;
    const checkInTotal = flight.passengerSources.checkIn?.breakdown?.total || 0;
    const boardingTotal = flight.passengerSources.boarding?.breakdown?.total || 0;

    if (checkInTotal > capacity) {
      errors.push(`Check-in count (${checkInTotal}) exceeds aircraft capacity (${capacity})`);
    }
    if (boardingTotal > capacity) {
      errors.push(`Boarding count (${boardingTotal}) exceeds aircraft capacity (${capacity})`);
    }
    if (salesTotal > capacity) {
      errors.push(`Sales/booking count (${salesTotal}) exceeds aircraft capacity (${capacity})`);
    }

    // Domain invariant: Check-in passengers cannot exceed confirmed ticketed sales (unless manual emergency)
    if (checkInTotal > salesTotal && flight.sourceMode !== 'MANUAL_EMERGENCY') {
      errors.push(
        `Check-in total (${checkInTotal}) cannot exceed Sales/booking total (${salesTotal})`
      );
    }

    // Domain invariant: Boarded passengers cannot exceed checked-in passengers (unless manual emergency)
    if (boardingTotal > checkInTotal && flight.sourceMode !== 'MANUAL_EMERGENCY') {
      errors.push(
        `Boarding total (${boardingTotal}) cannot exceed Check-in total (${checkInTotal})`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateAPB(apb: DigitalAPB, flightOrCapacity?: Flight | number): ValidationResult {
  const errors: string[] = [];
  if (!apb.id) errors.push('APB missing required ID');
  if (!apb.flightId) errors.push('APB missing flight ID');
  if (!apb.apbUniqueNumber) errors.push('APB missing unique number');

  const capacity = typeof flightOrCapacity === 'number'
    ? flightOrCapacity
    : flightOrCapacity?.aircraft?.capacity;

  if (apb.temporaryCount) {
    errors.push(...validatePassengerBreakdown('APB temporary count', apb.temporaryCount, capacity));
  }
  if (apb.actualCount) {
    errors.push(...validatePassengerBreakdown('APB actual count', apb.actualCount, capacity));
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
