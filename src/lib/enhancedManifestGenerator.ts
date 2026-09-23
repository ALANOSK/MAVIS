/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enhanced Synthetic Passenger Manifest Generator for MAVIS Operational Ledger.
 * Read-only derived view reconciling Sales, Check-In, Boarding, and APB counts.
 */

import { Flight, DigitalAPB } from '../types';
import { getServiceDay } from '../data';

export interface SyntheticPassenger {
  seq: string;
  ticketNo: string;
  passengerName: string;
  type: 'ADT' | 'CHD' | 'INF';
  seat: string;
  bagPcs: number;
  bagKg: number;
  bagTag: string;
  checkInStatus: 'CHECKED-IN' | 'NO-SHOW' | 'PENDING';
  boardingStatus: 'BOARDED' | 'OFFLOADED' | 'NOT BOARDED';
  apbStatus: 'VERIFIED' | 'OFFLOADED' | 'NO-SHOW' | 'APB RECONCILIATION PENDING';
  remarks: string;
}

export interface EnhancedManifestData {
  flightId: string;
  flightNumber: string;
  flightDate: string;
  carrierCode: string;
  origin: string;
  destination: string;
  route: string;
  std: string;
  etd: string;
  aircraftType: string;
  aircraftRegistration: string;
  capacity: number;
  salesCount: number;
  checkInCount: number;
  boardedCount: number;
  finalApbCount: number;
  noShowCount: number;
  offloadedCount: number;
  variance: number;
  status: 'MATCH' | 'REVIEW REQUIRED';
  sourceLabels: {
    passengerData: string;
    flightAircraft: string;
    manifestProcessing: string;
    dataClassification: string;
  };
  passengers: SyntheticPassenger[];
}

// Deterministic Pseudo-Random Seed Hash
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function createRng(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

const LAST_NAMES = [
  'PRATAMA', 'SANTOSO', 'WIJAYA', 'SETIAWAN', 'HIDAYAT', 'KUSUMA', 'LESTARI',
  'SAPUTRA', 'GUNAWAN', 'WIRAWAN', 'PUTRI', 'NUR', 'TAN', 'LIM', 'WONG',
  'CHANDRA', 'SUHARTONO', 'SUSANTO', 'NUGROHO', 'UTOMO', 'SIMANJUNTAK', 'SITOMPUL',
  'PANGESTU', 'WIBOWO', 'HERMAWAN', 'SURYADI', 'KURNIAWAN', 'ANGGRAENI', 'PERMANA',
  'FIRMANSYAH', 'HARTONO', 'SUBAGIO', 'ADITYA', 'BAKRI', 'EFFENDI', 'DARMAWAN',
  'FAUZI', 'ISKANDAR', 'LUKMAN', 'MAHENDRA', 'NASUTION', 'PASARIBU', 'RAHMAN',
  'SULAIMAN', 'SYAHPUTRA', 'TAMBUNAN', 'WAHYUDI', 'YULIANTO', 'ZULKARNAEN', 'ALATAS'
];

const FIRST_NAMES = [
  'RAKA', 'BUDI', 'CITRA', 'AGUS', 'TAUFIK', 'DEWI', 'ANISA', 'HENDRA',
  'INDRA', 'BAYU', 'MEGA', 'FATIMAH', 'MICHAEL', 'JESSICA', 'KEVIN', 'RATNA',
  'BAGUS', 'DANI', 'EKO', 'FITRI', 'GILANG', 'HADI', 'IRFAN', 'JOKO',
  'KARTIKA', 'LIA', 'MAYA', 'NITA', 'OKI', 'PANJI', 'QORI', 'RIZKY',
  'SARI', 'TIARA', 'UTARI', 'VINA', 'WULAN', 'YOGI', 'ZAHRA', 'ANDI',
  'BAMBANG', 'CINTA', 'DIMAS', 'ERNA', 'FARHAN', 'GITA', 'HANIF', 'INDAH',
  'JULIAN', 'NADIA'
];

/**
 * Generates an available seat layout based on aircraft capacity.
 */
function generateSeatLayout(capacity: number, isAtr: boolean): string[] {
  const seats: string[] = [];
  const seatLetters = isAtr ? ['A', 'C', 'D', 'F'] : ['A', 'B', 'C', 'D', 'E', 'F'];
  const maxRows = Math.ceil(capacity / seatLetters.length) + 5;

  for (let row = 1; row <= maxRows; row++) {
    if (row === 13) continue; // Skip standard superstitious row 13
    for (const letter of seatLetters) {
      seats.push(`${row}${letter}`);
      if (seats.length >= capacity + 30) return seats;
    }
  }
  return seats;
}

/**
 * Generates the Enhanced Passenger Manifest for a canonical flight.
 * Pure deterministic derivation based on SERVICE_DAY + FLIGHT_ID + PASSENGER_SEQUENCE.
 */
export function generateEnhancedManifest(
  flight: Flight,
  linkedApb?: DigitalAPB | null
): EnhancedManifestData {
  const serviceDay = flight.flightDate || getServiceDay();
  const seedString = `${serviceDay}_${flight.id}_${flight.flightNumber}`;
  const seed = hashString(seedString);
  const rng = createRng(seed);

  const carrier = flight.carrierCode || flight.flightNumber.split('-')[0] || 'JT';
  const isAtr = (flight.aircraft?.type || '').includes('ATR');
  const capacity = flight.aircraft?.capacity || 180;

  // Extract canonical counts
  const salesBreakdown = flight.passengerSources?.sales?.breakdown;
  const checkInBreakdown = flight.passengerSources?.checkIn?.breakdown;
  const boardingBreakdown = flight.passengerSources?.boarding?.breakdown;

  const salesCount = salesBreakdown?.total || 0;
  const checkInCount = checkInBreakdown?.total ?? salesCount;
  const boardedCount = boardingBreakdown?.total ?? checkInCount;

  // Resolve APB count
  let finalApbCount = boardedCount;
  if (linkedApb) {
    if (linkedApb.actualCount?.total !== undefined && linkedApb.actualCount?.total !== null) {
      finalApbCount = linkedApb.actualCount.total;
    } else if (linkedApb.temporaryCount?.total !== undefined && linkedApb.temporaryCount?.total !== null) {
      finalApbCount = linkedApb.temporaryCount.total;
    }
  }

  const offloadedCount = Math.max(0, checkInCount - boardedCount);
  const noShowCount = Math.max(0, salesCount - checkInCount);
  const variance = finalApbCount - boardedCount;

  const isCancelled = flight.movementStatus === 'CANCELLED';

  // Determine type quotas from sales breakdown or defaults
  const totalAdults = salesBreakdown?.adult ?? Math.max(0, salesCount - 10);
  const totalChildren = salesBreakdown?.child ?? Math.min(8, Math.max(0, salesCount - totalAdults));
  const totalInfants = salesBreakdown?.infant ?? Math.max(0, salesCount - totalAdults - totalChildren);

  const seatPool = generateSeatLayout(capacity, isAtr);
  const passengers: SyntheticPassenger[] = [];

  // Deterministic numeric offset for ticket numbers based on flight
  const flightNumDigits = parseInt(flight.flightNumber.replace(/\D/g, ''), 10) || 100;
  const baseTicketId = (seed % 90000000) * 1000 + flightNumDigits * 1000;
  const baseBagTagId = (seed % 800000) + flightNumDigits * 100;

  let seatIndex = 0;
  let infantCountAssigned = 0;
  let childCountAssigned = 0;

  // APB variance discrepancy count to flag on boarded passengers
  let apbVarianceToFlag = Math.abs(variance);

  for (let seqNum = 1; seqNum <= salesCount; seqNum++) {
    const seqStr = String(seqNum).padStart(3, '0');
    const paxRng = createRng(seed + seqNum * 7919);

    // 1. Ticket Number
    const ticketNo = `${carrier}-${String(baseTicketId + seqNum).padStart(12, '0')}`;

    // 2. Passenger Name
    const lastNameIdx = Math.floor(paxRng() * LAST_NAMES.length);
    const firstNameIdx = Math.floor(paxRng() * FIRST_NAMES.length);
    const passengerName = `${LAST_NAMES[lastNameIdx]}/${FIRST_NAMES[firstNameIdx]}`;

    // 3. Passenger Type
    let type: 'ADT' | 'CHD' | 'INF' = 'ADT';
    if (infantCountAssigned < totalInfants && (paxRng() < 0.15 || seqNum > salesCount - totalInfants)) {
      type = 'INF';
      infantCountAssigned++;
    } else if (childCountAssigned < totalChildren && (paxRng() < 0.2 || seqNum > salesCount - totalChildren - totalInfants)) {
      type = 'CHD';
      childCountAssigned++;
    }

    // 4. Seat Assignment
    let seat = '-';
    if (type === 'INF') {
      seat = '-';
    } else if (seatIndex < seatPool.length) {
      seat = seatPool[seatIndex];
      seatIndex++;
    } else {
      seat = `${Math.floor(seatIndex / 6) + 1}A`;
    }

    // 5. Baggage Data
    let bagPcs = 0;
    let bagKg = 0;
    let bagTag = '-';

    if (type !== 'INF') {
      const bagRoll = paxRng();
      if (bagRoll < 0.25) {
        bagPcs = 0;
        bagKg = 0;
        bagTag = '-';
      } else if (bagRoll < 0.75) {
        bagPcs = 1;
        bagKg = Math.floor(12 + paxRng() * 11); // 12-22 kg
        bagTag = `${carrier}BG${String(baseBagTagId + seqNum).padStart(6, '0')}`;
      } else if (bagRoll < 0.95) {
        bagPcs = 2;
        bagKg = Math.floor(22 + paxRng() * 12); // 22-33 kg
        bagTag = `${carrier}BG${String(baseBagTagId + seqNum).padStart(6, '0')}`;
      } else {
        bagPcs = 3;
        bagKg = Math.floor(32 + paxRng() * 12); // 32-43 kg
        bagTag = `${carrier}BG${String(baseBagTagId + seqNum).padStart(6, '0')}`;
      }
    }

    // 6. Status Allocation reconciling with canonical counts
    let checkInStatus: 'CHECKED-IN' | 'NO-SHOW' | 'PENDING' = 'CHECKED-IN';
    let boardingStatus: 'BOARDED' | 'OFFLOADED' | 'NOT BOARDED' = 'BOARDED';
    let apbStatus: 'VERIFIED' | 'OFFLOADED' | 'NO-SHOW' | 'APB RECONCILIATION PENDING' = 'VERIFIED';
    let remarks = '-';

    if (isCancelled) {
      checkInStatus = 'PENDING';
      boardingStatus = 'NOT BOARDED';
      apbStatus = 'NO-SHOW';
      remarks = 'FLIGHT CANCELLED';
    } else if (seqNum <= boardedCount) {
      // Passenger Boarded
      checkInStatus = 'CHECKED-IN';
      boardingStatus = 'BOARDED';

      if (variance !== 0 && apbVarianceToFlag > 0 && seqNum > boardedCount - Math.abs(variance)) {
        apbStatus = 'APB RECONCILIATION PENDING';
        remarks = variance < 0 ? 'APB CABIN VARIANCE (-1)' : 'APB CABIN VARIANCE (+1)';
        apbVarianceToFlag--;
      } else {
        apbStatus = 'VERIFIED';
        remarks = type === 'INF' ? 'INFANT ON LAP' : '-';
      }
    } else if (seqNum <= boardedCount + offloadedCount) {
      // Passenger Offloaded at Gate
      checkInStatus = 'CHECKED-IN';
      boardingStatus = 'OFFLOADED';
      apbStatus = 'OFFLOADED';
      remarks = 'GATE OFFLOAD';
    } else {
      // Passenger No-Show
      checkInStatus = 'NO-SHOW';
      boardingStatus = 'NOT BOARDED';
      apbStatus = 'NO-SHOW';
      remarks = 'NO-SHOW GATE CLOSURE';
    }

    passengers.push({
      seq: seqStr,
      ticketNo,
      passengerName,
      type,
      seat,
      bagPcs,
      bagKg,
      bagTag,
      checkInStatus,
      boardingStatus,
      apbStatus,
      remarks,
    });
  }

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '—';
    try {
      const d = new Date(timeStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return timeStr;
    }
  };

  return {
    flightId: flight.id,
    flightNumber: flight.flightNumber,
    flightDate: flight.flightDate,
    carrierCode: carrier,
    origin: flight.origin,
    destination: flight.destination,
    route: `${flight.origin} ➔ ${flight.destination}`,
    std: formatTime(flight.scheduledDeparture),
    etd: formatTime(flight.estimatedDeparture),
    aircraftType: flight.aircraft?.type || 'B737-800',
    aircraftRegistration: flight.aircraft?.registration || 'PK-MAV',
    capacity,
    salesCount,
    checkInCount,
    boardedCount,
    finalApbCount,
    noShowCount,
    offloadedCount,
    variance,
    status: variance === 0 ? 'MATCH' : 'REVIEW REQUIRED',
    sourceLabels: {
      passengerData: 'SABRE Simulation',
      flightAircraft: 'AIMS Simulation',
      manifestProcessing: 'MAVIS Operational Engine',
      dataClassification: 'SYNTHETIC DEMO DATA',
    },
    passengers,
  };
}

/**
 * Exports the Enhanced Passenger Manifest as UTF-8 tab-separated text, formatted for Excel.
 */
export function exportEnhancedManifestAsTsv(manifest: EnhancedManifestData): string {
  const lines: string[] = [];

  // Header Banner
  lines.push(`================================================================================`);
  lines.push(`MAVIS OPERATIONAL ENGINE — ENHANCED PASSENGER MANIFEST (SYNTHETIC DEMO DATA)`);
  lines.push(`================================================================================`);
  lines.push(`Flight Number        : ${manifest.flightNumber}`);
  lines.push(`Flight Date          : ${manifest.flightDate}`);
  lines.push(`Route                : ${manifest.route}`);
  lines.push(`STD / ETD            : ${manifest.std} / ${manifest.etd}`);
  lines.push(`Aircraft             : ${manifest.aircraftType} (${manifest.aircraftRegistration}) | Capacity: ${manifest.capacity}`);
  lines.push(`Source Labels        : Pax: ${manifest.sourceLabels.passengerData} | Flight: ${manifest.sourceLabels.flightAircraft} | Engine: ${manifest.sourceLabels.manifestProcessing}`);
  lines.push(`Classification       : ${manifest.sourceLabels.dataClassification}`);
  lines.push(`Reconciliation Counts: Sales: ${manifest.salesCount} | Check-In: ${manifest.checkInCount} | Boarded: ${manifest.boardedCount} | Final APB: ${manifest.finalApbCount} | No-Show: ${manifest.noShowCount} | Offloaded: ${manifest.offloadedCount} | Variance: ${manifest.variance}`);
  lines.push(`Reconciliation Status: ${manifest.status}`);
  lines.push(`================================================================================\n`);

  // Tab-separated column header for Excel
  const headers = [
    'SEQ',
    'TICKET NO',
    'PASSENGER NAME',
    'TYPE',
    'SEAT',
    'BAG PCS',
    'BAG KG',
    'BAG TAG',
    'CHECK-IN STATUS',
    'BOARDING STATUS',
    'APB STATUS',
    'REMARKS',
  ];
  lines.push(headers.join('\t'));

  // Tab-separated passenger rows
  manifest.passengers.forEach((p) => {
    const row = [
      p.seq,
      p.ticketNo,
      p.passengerName,
      p.type,
      p.seat,
      String(p.bagPcs),
      String(p.bagKg),
      p.bagTag,
      p.checkInStatus,
      p.boardingStatus,
      p.apbStatus,
      p.remarks,
    ];
    lines.push(row.join('\t'));
  });

  return lines.join('\n');
}

/**
 * Triggers a browser download of the TSV text file.
 */
export function downloadEnhancedManifestTxt(manifest: EnhancedManifestData): void {
  const content = exportEnhancedManifestAsTsv(manifest);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `MAVIS_ENHANCED_MANIFEST_${manifest.flightNumber}_${manifest.flightDate}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
