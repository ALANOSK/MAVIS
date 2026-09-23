/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flight, DigitalAPB } from '../types';
import { generateAllTickets, getFlightRevenueDetails } from '../lib/revenueData';
import { sanitizeText } from '../qa/qaSanitizer';

export function exportFlightSnapshot(flights: Flight[]): any[] {
  return flights.map((f) => ({
    flightId: f.id,
    carrierCode: f.carrierCode,
    flightNumber: f.flightNumber,
    flightDate: f.flightDate,
    origin: f.origin,
    destination: f.destination,
    movementStatus: f.movementStatus,
    flightStatus: f.flightStatus,
    scheduledDeparture: f.scheduledDeparture,
    estimatedDeparture: f.estimatedDeparture,
    scheduledArrival: f.scheduledArrival,
    estimatedArrival: f.estimatedArrival,
    gate: f.gate,
    aircraft: {
      type: f.aircraft?.type,
      registration: f.aircraft?.registration,
      capacity: f.aircraft?.capacity
    },
    passengerSources: {
      salesTotal: f.passengerSources?.sales?.breakdown?.total || 0,
      checkInTotal: f.passengerSources?.checkIn?.breakdown?.total || 0,
      boardingTotal: f.passengerSources?.boarding?.breakdown?.total || 0,
      offloadTotal: f.passengerSources?.offload?.breakdown?.total || 0,
      noShowTotal: f.passengerSources?.noShow?.breakdown?.total || 0
    }
  }));
}

export function exportManifestSnapshot(flights: Flight[], apbs: DigitalAPB[]): any[] {
  return flights.map((f) => {
    const apb = apbs.find((a) => a.flightId === f.id);
    const salesTotal = f.passengerSources?.sales?.breakdown?.total || 0;
    const checkInTotal = f.passengerSources?.checkIn?.breakdown?.total || 0;
    const boardingTotal = f.passengerSources?.boarding?.breakdown?.total || 0;
    const manifestTotal = apb?.actualCount ? apb.actualCount.total : boardingTotal;

    return {
      flightId: f.id,
      flightNumber: f.flightNumber,
      origin: f.origin,
      destination: f.destination,
      movementStatus: f.movementStatus,
      apbStatus: apb ? apb.status : 'NOT_CREATED',
      passengerCounts: {
        sales: salesTotal,
        checkIn: checkInTotal,
        boarding: boardingTotal,
        manifest: manifestTotal
      },
      variances: {
        salesVsCheckIn: checkInTotal - salesTotal,
        checkInVsBoarding: boardingTotal - checkInTotal,
        boardingVsManifest: manifestTotal - boardingTotal
      }
    };
  });
}

export function exportApbSnapshot(apbs: DigitalAPB[]): any[] {
  return apbs.map((apb) => ({
    apbId: apb.id,
    apbUniqueNumber: apb.apbUniqueNumber,
    flightId: apb.flightId,
    status: apb.status,
    preparedBy: apb.preparedBy,
    preparedAt: apb.preparedAt,
    actualCount: apb.actualCount,
    extraCrew: apb.extraCrew,
    flightAttendantVerification: apb.flightAttendantVerification
      ? {
          crewStatus: apb.flightAttendantVerification.crewStatus,
          employeeId: apb.flightAttendantVerification.employeeId,
          pinStatus: apb.flightAttendantVerification.pinStatus,
          verifiedAt: apb.flightAttendantVerification.verifiedAt
        }
      : null,
    manifestStationReview: apb.manifestStationReview,
    manifestHQReview: apb.manifestHQReview,
    notesCount: apb.notes ? apb.notes.length : 0
  }));
}

export function exportRevenueSnapshot(flights: Flight[], apbs: DigitalAPB[]): any {
  const tickets = generateAllTickets(flights, apbs);
  const flightRevenueReports = getFlightRevenueDetails(flights, apbs, tickets);

  const grossSales = flightRevenueReports.reduce((s, r) => s + r.grossSales, 0);
  const transferredInRevenue = flightRevenueReports.reduce((s, r) => s + r.transferredInRevenue, 0);
  const flownRevenue = flightRevenueReports.reduce((s, r) => s + r.flownRevenue, 0);
  const heldRevenue = flightRevenueReports.reduce((s, r) => s + r.heldRevenue, 0);
  const refundedAmount = flightRevenueReports.reduce((s, r) => s + r.refundedAmount, 0);
  const rebookedRevenue = flightRevenueReports.reduce((s, r) => s + r.rebookedRevenue, 0);
  const noShowRevenue = flightRevenueReports.reduce((s, r) => s + r.noShowRecognizedRevenue, 0);

  const totalInflow = grossSales + transferredInRevenue;
  const totalOutflow = flownRevenue + heldRevenue + refundedAmount + rebookedRevenue + noShowRevenue;
  const systemVariance = Math.abs(totalInflow - totalOutflow);

  const allFlightsConserved = flightRevenueReports.every(
    (r) =>
      Math.abs(
        r.grossSales + r.transferredInRevenue -
          (r.flownRevenue + r.heldRevenue + r.refundedAmount + r.rebookedRevenue + r.noShowRecognizedRevenue)
      ) < 0.01
  );

  return {
    summary: {
      totalTicketsGenerated: tickets.length,
      grossSales,
      transferredInRevenue,
      flownRevenue,
      heldRevenue,
      refundedAmount,
      rebookedRevenue,
      noShowRevenue,
      variance: systemVariance,
      conservationFormula: 'Gross Sales + Transferred-In Revenue = Flown + Held + Refunded + Rebooked + No-Show Recognized',
      revenueConservationCheck: allFlightsConserved && systemVariance < 0.01 ? 'PASS' : 'WARNING'
    },
    flightReports: flightRevenueReports.map((r) => ({
      flightId: r.flightId,
      flightNumber: r.flightNumber,
      route: r.route,
      movementStatus: r.movementStatus,
      grossSales: r.grossSales,
      transferredInRevenue: r.transferredInRevenue,
      flownRevenue: r.flownRevenue,
      heldRevenue: r.heldRevenue,
      refundedAmount: r.refundedAmount,
      rebookedRevenue: r.rebookedRevenue,
      noShowRecognizedRevenue: r.noShowRecognizedRevenue,
      variance: Math.abs(
        r.grossSales + r.transferredInRevenue -
          (r.flownRevenue + r.heldRevenue + r.refundedAmount + r.rebookedRevenue + r.noShowRecognizedRevenue)
      ),
      revenueStatus: r.revenueStatus
    }))
  };
}
