/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flight, DigitalAPB } from '../types';

export type FareClass = 'Economy' | 'Premium Economy' | 'Business' | 'First Class';

export type RevenueStatus = 'SOLD' | 'FLOWN' | 'HELD_PENDING' | 'REFUNDED' | 'REBOOKED' | 'NO_SHOW_RECOGNIZED';

export interface Ticket {
  ticketId: string;
  passengerId: string;
  maskedPassengerName: string;
  PNR: string;
  flightId: string;
  flightNumber: string;
  flightDate: string;
  aircraftRegistration: string;
  fareClass: FareClass;
  ticketValue: number;
  travelStatus: 'FLOWN' | 'NOT_FLOWN';
  revenueStatus: RevenueStatus;
  refundAmount: number;
  rebookedToFlightId?: string;
  rebookedFromFlightId?: string;
}

export interface FlightRevenueReport {
  flightId: string;
  flightDate: string;
  flightNumber: string;
  route: string;
  origin: string;
  destination: string;
  aircraftRegistration: string;
  aircraftType: string;
  capacity: number;
  movementStatus: Flight['movementStatus'];
  salesPax: number;
  checkInPax: number;
  boardedPax: number;
  finalManifestPax: number;
  nonFlownPax: number;
  averageFare: number;
  grossSales: number;
  flownRevenue: number;
  heldRevenue: number;
  refundedAmount: number;
  rebookedRevenue: number;
  transferredInRevenue: number;
  noShowRecognizedRevenue: number;
  netRecognizedRevenue: number;
  revenueStatus: string;
  tickets: Ticket[];
  transferredInTickets: Ticket[];
}

export const isFlightFlownOrClosed = (status: Flight['movementStatus']): boolean => {
  return ['DEPARTED', 'IN_FLIGHT', 'ARRIVED', 'COMPLETED'].includes(status);
};

export const OPEN_REBOOK_STATUSES: Flight['movementStatus'][] = [
  'SCHEDULED',
  'CHECK_IN',
  'BOARDING',
  'FINAL_CALL',
  'DELAYED',
];

export const PROTECTED_DEMO_FLIGHT_IDS: readonly string[] = [
  'FL-SEED-111',
  'FL-DEMO-JT123',
  'FL-DEMO-ID306',
  'FL-DEMO-SL789',
];

// Resolves effective departure time in milliseconds (ETD when available, otherwise STD)
export const getEffectiveDepartureTime = (flight: Flight): number => {
  if (flight.estimatedDeparture) {
    const etd = new Date(flight.estimatedDeparture).getTime();
    if (!isNaN(etd) && etd > 0) return etd;
  }
  if (flight.scheduledDeparture) {
    const std = new Date(flight.scheduledDeparture).getTime();
    if (!isNaN(std) && std > 0) return std;
  }
  return 0;
};

// Helper to filter valid rebooking destination flights
export const getValidRebookDestinations = (
  sourceFlight: Flight,
  allFlights: Flight[],
  allowProtectedDemo: boolean = false,
  referenceTimestamp?: string | number
): Flight[] => {
  const sourceEffTime = getEffectiveDepartureTime(sourceFlight);
  const refTime = referenceTimestamp
    ? (typeof referenceTimestamp === 'number' ? referenceTimestamp : new Date(referenceTimestamp).getTime())
    : sourceEffTime;

  const minDepartureTime = isNaN(refTime) || refTime <= 0 ? sourceEffTime : Math.max(sourceEffTime, refTime);

  return allFlights.filter((dest) => {
    // 1. Must not be the source flight itself
    if (dest.id === sourceFlight.id) return false;

    // 2. Protect demo flights from ambient rebooking unless explicitly allowed
    if (!allowProtectedDemo && PROTECTED_DEMO_FLIGHT_IDS.includes(dest.id)) {
      return false;
    }

    // 3. Must be in an operationally open status
    if (!OPEN_REBOOK_STATUSES.includes(dest.movementStatus)) {
      return false;
    }

    // 4. Chronological & operational validity: destination effective departure time
    // (ETD when available, otherwise STD) must be strictly later than the rebooking/reference timestamp
    const destEffTime = getEffectiveDepartureTime(dest);
    if (destEffTime <= 0 || destEffTime <= minDepartureTime) {
      return false;
    }

    return true;
  });
};

// Preference order: 1. same route + future departure, 2. same destination + future departure, 3. other future departure
export const findBestRebookDestination = (
  sourceFlight: Flight,
  allFlights: Flight[],
  allowProtectedDemo: boolean = false,
  referenceTimestamp?: string | number
): Flight | undefined => {
  const validDestinations = getValidRebookDestinations(sourceFlight, allFlights, allowProtectedDemo, referenceTimestamp);
  if (validDestinations.length === 0) return undefined;

  // Preference 1: Same route (origin & destination) + future departure (earliest upcoming effective departure)
  const sameRoute = validDestinations
    .filter((d) => d.origin === sourceFlight.origin && d.destination === sourceFlight.destination)
    .sort((a, b) => getEffectiveDepartureTime(a) - getEffectiveDepartureTime(b));

  if (sameRoute.length > 0) return sameRoute[0];

  // Preference 2: Same destination + future departure (earliest upcoming effective departure)
  const sameDest = validDestinations
    .filter((d) => d.destination === sourceFlight.destination)
    .sort((a, b) => getEffectiveDepartureTime(a) - getEffectiveDepartureTime(b));

  if (sameDest.length > 0) return sameDest[0];

  // Preference 3: Another operationally valid future flight (earliest upcoming effective departure)
  const otherFuture = [...validDestinations].sort(
    (a, b) => getEffectiveDepartureTime(a) - getEffectiveDepartureTime(b)
  );

  return otherFuture[0];
};

// Base fare estimates per sector in USD equivalent
export const getRouteBaseFare = (origin: string, destination: string): number => {
  const pair = `${origin}-${destination}`;
  const fareMap: Record<string, number> = {
    'CGK-DPS': 85.0,
    'DPS-CGK': 85.0,
    'CGK-SUB': 65.0,
    'SUB-CGK': 65.0,
    'CGK-KNO': 110.0,
    'KNO-CGK': 110.0,
    'CGK-UPG': 125.0,
    'UPG-CGK': 125.0,
    'CGK-BTH': 75.0,
    'BTH-CGK': 75.0,
    'CGK-KUL': 95.0,
    'KUL-CGK': 95.0,
    'CGK-DMK': 130.0,
    'DMK-CGK': 130.0,
  };
  return fareMap[pair] || 80.0;
};

// Generates simulated tickets for all flights adhering strictly to passenger manifests and revenue conservation
export const generateAllTickets = (flights: Flight[], apbs: DigitalAPB[]): Ticket[] => {
  const sortedFlights = [...flights].sort((a, b) => a.flightNumber.localeCompare(b.flightNumber));

  // Pre-calculate candidate destinations for each flight (strictly future, operationally open, non-protected demo)
  const candidateDestMap = new Map<string, Flight | undefined>();
  sortedFlights.forEach((f) => {
    const candidateDest = findBestRebookDestination(f, sortedFlights, false);
    candidateDestMap.set(f.id, candidateDest);
  });

  // Pass 1: Count tickets that will be rebooked to each destination flight
  const rebookedToCounts: Record<string, number> = {};
  sortedFlights.forEach((f) => {
    const apb = apbs.find((a) => a.flightId === f.id);
    const salesPax = f.passengerSources?.sales?.breakdown?.total || 0;
    const boardedPax = f.passengerSources?.boarding?.breakdown?.total || 0;
    const manifestPax = apb?.actualCount ? apb.actualCount.total : boardedPax;
    const isClosed = isFlightFlownOrClosed(f.movementStatus);
    const isCancelled = f.movementStatus === 'CANCELLED';
    const candidateDest = candidateDestMap.get(f.id);

    let seed = 0;
    for (let c = 0; c < f.id.length; c++) {
      seed = (seed * 31 + f.id.charCodeAt(c)) >>> 0;
    }

    if (isCancelled && candidateDest) {
      for (let i = 0; i < salesPax; i++) {
        if ((seed + i) % 3 === 1) {
          rebookedToCounts[candidateDest.id] = (rebookedToCounts[candidateDest.id] || 0) + 1;
        }
      }
    } else if (isClosed && !isCancelled && candidateDest) {
      const approxFlown = Math.min(salesPax, manifestPax);
      for (let i = approxFlown; i < salesPax; i++) {
        const exceptionIdx = i - approxFlown;
        if ((seed + exceptionIdx) % 4 === 2) {
          rebookedToCounts[candidateDest.id] = (rebookedToCounts[candidateDest.id] || 0) + 1;
        }
      }
    }
  });

  // Pass 2: Generate all tickets with exact manifest seat allocation
  const allTickets: Ticket[] = [];
  sortedFlights.forEach((f) => {
    const apb = apbs.find((a) => a.flightId === f.id);
    const salesPax = f.passengerSources?.sales?.breakdown?.total || 0;
    const boardedPax = f.passengerSources?.boarding?.breakdown?.total || 0;
    const manifestPax = apb?.actualCount ? apb.actualCount.total : boardedPax;
    const baseFare = getRouteBaseFare(f.origin, f.destination);
    const isClosed = isFlightFlownOrClosed(f.movementStatus);
    const isCancelled = f.movementStatus === 'CANCELLED';
    const candidateDest = candidateDestMap.get(f.id);

    let seed = 0;
    for (let c = 0; c < f.id.length; c++) {
      seed = (seed * 31 + f.id.charCodeAt(c)) >>> 0;
    }

    const firstNames = ['Budi', 'Siti', 'Agus', 'Dewi', 'Hendra', 'Ratna', 'Wayan', 'Made', 'Ketut', 'Andi', 'Rina', 'Eko', 'Nur', 'Sri', 'Bambang', 'Maya', 'Nadia', 'Farhan', 'Rizky', 'Putri'];
    const lastNames = ['Santoso', 'Wijaya', 'Gunawan', 'Kusuma', 'Pratama', 'Hidayat', 'Saputra', 'Lestari', 'Wibowo', 'Siregar', 'Simanjuntak', 'Tan', 'Lim', 'Purnomo', 'Sutanto'];

    const getMaskedName = (idx: number) => {
      const first = firstNames[(seed + idx) % firstNames.length];
      const last = lastNames[(seed + idx * 3) % lastNames.length];
      return `${first[0]}*** ${last[0]}*****`;
    };

    const getPnr = (idx: number) => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let pnr = '';
      for (let i = 0; i < 6; i++) {
        pnr += chars[(seed + idx + i * 5) % chars.length];
      }
      return pnr;
    };

    // Transferred-in passengers consume seats INSIDE the canonical manifest capacity
    const incomingTransfers = rebookedToCounts[f.id] || 0;
    const transferredInFlownCount = (isClosed && !isCancelled) ? Math.min(incomingTransfers, manifestPax) : 0;
    const originalFlownCount = (isClosed && !isCancelled)
      ? Math.min(salesPax, Math.max(0, manifestPax - transferredInFlownCount))
      : 0;

    for (let i = 0; i < salesPax; i++) {
      const isFlown = i < originalFlownCount;

      // Assign Fare Class: First Class (2%), Business (8%), Premium Economy (15%), Economy (75%)
      let fareClass: FareClass = 'Economy';
      let multiplier = 1.0;
      if (i < Math.round(salesPax * 0.02)) {
        fareClass = 'First Class';
        multiplier = 4.0;
      } else if (i < Math.round(salesPax * 0.10)) {
        fareClass = 'Business';
        multiplier = 2.5;
      } else if (i < Math.round(salesPax * 0.25)) {
        fareClass = 'Premium Economy';
        multiplier = 1.5;
      }

      const ticketValue = baseFare * multiplier;

      let travelStatus: 'FLOWN' | 'NOT_FLOWN' = 'NOT_FLOWN';
      let revenueStatus: RevenueStatus = 'SOLD';
      let refundAmount = 0;
      let rebookedToFlightId: string | undefined;
      let rebookedFromFlightId: string | undefined;

      if (isFlown) {
        travelStatus = 'FLOWN';
        revenueStatus = 'FLOWN';
      } else {
        // Distribute non-flown statuses deterministically
        if (isCancelled) {
          travelStatus = 'NOT_FLOWN';
          const opt = (seed + i) % 3;
          if (opt === 0) {
            revenueStatus = 'REFUNDED';
            refundAmount = ticketValue;
          } else if (opt === 1 && candidateDest) {
            revenueStatus = 'REBOOKED';
            rebookedToFlightId = candidateDest.id;
            rebookedFromFlightId = f.id;
          } else {
            revenueStatus = 'HELD_PENDING';
          }
        } else if (!isClosed) {
          // Ground/open flight (SCHEDULED, CHECK_IN, BOARDING, FINAL_CALL, DELAYED)
          travelStatus = 'NOT_FLOWN';
          revenueStatus = 'HELD_PENDING';
        } else {
          // Closed flight non-flown passengers (no-shows, offloads, voluntary cancellations)
          travelStatus = 'NOT_FLOWN';
          const exceptionIdx = i - originalFlownCount;
          const opt = (seed + exceptionIdx) % 4;

          switch (opt) {
            case 0:
              revenueStatus = 'HELD_PENDING';
              break;
            case 1:
              revenueStatus = 'REFUNDED';
              refundAmount = ticketValue;
              break;
            case 2:
              if (candidateDest) {
                revenueStatus = 'REBOOKED';
                rebookedToFlightId = candidateDest.id;
                rebookedFromFlightId = f.id;
              } else {
                revenueStatus = 'HELD_PENDING';
              }
              break;
            case 3:
              revenueStatus = 'NO_SHOW_RECOGNIZED';
              break;
          }
        }
      }

      allTickets.push({
        ticketId: `${f.id}-TKT-${i}`,
        passengerId: `${f.id}-PAX-${i}`,
        maskedPassengerName: getMaskedName(i),
        PNR: getPnr(i),
        flightId: f.id,
        flightNumber: f.flightNumber,
        flightDate: f.flightDate,
        aircraftRegistration: f.aircraft?.registration || 'N/A',
        fareClass,
        ticketValue,
        travelStatus,
        revenueStatus,
        refundAmount,
        rebookedToFlightId,
        rebookedFromFlightId,
      });
    }
  });

  return allTickets;
};

// Generates flight-by-flight revenue reports linking tickets and flight manifest data
export const getFlightRevenueDetails = (
  flights: Flight[],
  apbs: DigitalAPB[],
  tickets: Ticket[]
): FlightRevenueReport[] => {
  return flights.map((f) => {
    const apb = apbs.find((a) => a.flightId === f.id);
    const salesPax = f.passengerSources?.sales?.breakdown?.total || 0;
    const checkInPax = f.passengerSources?.checkIn?.breakdown?.total || 0;
    const boardedPax = f.passengerSources?.boarding?.breakdown?.total || 0;
    const isClosed = isFlightFlownOrClosed(f.movementStatus);
    const isCancelled = f.movementStatus === 'CANCELLED';

    // Canonical manifest truth: actual APB when available, otherwise canonical boarding
    const finalManifestPax = apb?.actualCount ? apb.actualCount.total : boardedPax;

    // Tickets originally sold for this flight
    const flightTickets = tickets.filter((t) => t.flightId === f.id);

    // Tickets transferred *into* this flight from other flights
    const transferredInRaw = tickets.filter((t) => t.rebookedToFlightId === f.id);

    // Calculate original flown tickets
    const originalFlownTickets = flightTickets.filter((t) => t.revenueStatus === 'FLOWN');
    const originalFlownCount = originalFlownTickets.length;

    // Transferred-in passengers may be recognized as FLOWN only within
    // the destination flight's canonical operational manifest capacity.
    // Invariant: original flown pax + transferred-in flown pax <= finalManifestPax
    const availableCapacity = Math.max(0, finalManifestPax - originalFlownCount);
    const transferredInFlownCount = (isClosed && !isCancelled) ? Math.min(transferredInRaw.length, availableCapacity) : 0;

    const transferredInTickets: Ticket[] = transferredInRaw.map((t, idx) => ({
      ...t,
      rebookedFromFlightId: t.rebookedFromFlightId || t.flightId,
      travelStatus: (isClosed && !isCancelled && idx < transferredInFlownCount) ? 'FLOWN' : t.travelStatus,
    }));

    // Calculate revenue buckets originally sold on this flight
    const grossSales = flightTickets.reduce((sum, t) => sum + t.ticketValue, 0);
    const originalFlownRevenue = originalFlownTickets.reduce((sum, t) => sum + t.ticketValue, 0);

    // Add transferred-in tickets that flew to Flown Revenue
    const transferredInFlownRevenue = transferredInTickets.slice(0, transferredInFlownCount).reduce((sum, t) => sum + t.ticketValue, 0);
    const flownRevenue = originalFlownRevenue + transferredInFlownRevenue;

    // Held revenue (originally sold held + transferred in pending)
    const originalHeldRevenue = flightTickets
      .filter((t) => t.revenueStatus === 'HELD_PENDING')
      .reduce((sum, t) => sum + t.ticketValue, 0);
    const transferredInPendingRevenue = transferredInTickets.slice(transferredInFlownCount).reduce((sum, t) => sum + t.ticketValue, 0);
    const heldRevenue = originalHeldRevenue + transferredInPendingRevenue;

    const refundedAmount = flightTickets
      .filter((t) => t.revenueStatus === 'REFUNDED')
      .reduce((sum, t) => sum + t.refundAmount, 0);

    const rebookedRevenue = flightTickets
      .filter((t) => t.revenueStatus === 'REBOOKED')
      .reduce((sum, t) => sum + t.ticketValue, 0); // Transferred Out

    const transferredInRevenue = transferredInTickets.reduce((sum, t) => sum + t.ticketValue, 0);

    const noShowRecognizedRevenue = flightTickets
      .filter((t) => t.revenueStatus === 'NO_SHOW_RECOGNIZED')
      .reduce((sum, t) => sum + t.ticketValue, 0);

    const netRecognizedRevenue = flownRevenue + noShowRecognizedRevenue;

    // Flight revenue status description
    let revenueStatus = 'SOLD';
    const hasUnresolved = flightTickets.some((t) => t.revenueStatus === 'HELD_PENDING');
    if (isCancelled) {
      revenueStatus = 'CANCELLED';
    } else if (f.movementStatus === 'COMPLETED') {
      revenueStatus = hasUnresolved ? 'HELD_PENDING' : 'RECONCILED';
    } else if (isClosed) {
      revenueStatus = 'IN_FLIGHT_HELD';
    } else if (f.movementStatus === 'CHECK_IN' || f.movementStatus === 'BOARDING' || f.movementStatus === 'FINAL_CALL') {
      revenueStatus = 'CHECK_IN';
    } else {
      revenueStatus = 'SCHEDULED';
    }

    const nonFlownPax = Math.max(0, salesPax - originalFlownCount);
    const averageFare = getRouteBaseFare(f.origin, f.destination);

    return {
      flightId: f.id,
      flightDate: f.flightDate,
      flightNumber: f.flightNumber,
      route: `${f.origin}-${f.destination}`,
      origin: f.origin,
      destination: f.destination,
      aircraftRegistration: f.aircraft?.registration || 'N/A',
      aircraftType: f.aircraft?.type || 'A320',
      capacity: f.aircraft?.capacity || 180,
      movementStatus: f.movementStatus,
      salesPax,
      checkInPax,
      boardedPax,
      finalManifestPax,
      nonFlownPax,
      averageFare,
      grossSales,
      flownRevenue,
      heldRevenue,
      refundedAmount,
      rebookedRevenue,
      transferredInRevenue,
      noShowRecognizedRevenue,
      netRecognizedRevenue,
      revenueStatus,
      tickets: flightTickets,
      transferredInTickets,
    };
  });
};
