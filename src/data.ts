/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Station,
  Carrier,
  Flight,
  CrewMember,
  OperationsStaff,
  PassengerBreakdown,
  StationCode,
  DigitalAPB,
  APBStatus,
  APBServerStatus,
} from './types';

export const STATIONS: Record<string, Station> = {
  CGK: {
    code: 'CGK',
    name: 'Soekarno-Hatta International Airport',
    timezone: 'Asia/Jakarta',
    lat: -6.1256,
    lng: 106.6559,
  },
  DPS: {
    code: 'DPS',
    name: 'I Gusti Ngurah Rai International Airport',
    timezone: 'Asia/Makassar',
    lat: -8.7482,
    lng: 115.1675,
  },
  KUL: {
    code: 'KUL',
    name: 'Kuala Lumpur International Airport',
    timezone: 'Asia/Kuala_Lumpur',
    lat: 2.7456,
    lng: 101.7099,
  },
  SUB: {
    code: 'SUB',
    name: 'Juanda International Airport',
    timezone: 'Asia/Jakarta',
    lat: -7.3798,
    lng: 112.7874,
  },
  KNO: {
    code: 'KNO',
    name: 'Kualanamu International Airport',
    timezone: 'Asia/Jakarta',
    lat: 3.6422,
    lng: 98.8853,
  },
  UPG: {
    code: 'UPG',
    name: 'Sultan Hasanuddin International Airport',
    timezone: 'Asia/Makassar',
    lat: -5.0616,
    lng: 119.5539,
  },
};

export const CARRIERS: Record<string, Carrier> = {
  JT: { code: 'JT', name: 'Lion Air', displayName: 'Lion Air' },
  ID: { code: 'ID', name: 'Batik Air', displayName: 'Batik Air' },
  OD: { code: 'OD', name: 'Batik Air Malaysia', displayName: 'Batik Air Malaysia' },
  SL: { code: 'SL', name: 'Thai Lion Air', displayName: 'Thai Lion Air' },
  IU: { code: 'IU', name: 'Super Air Jet', displayName: 'Super Air Jet' },
};

export const VALID_CARRIER_CODES = ['JT', 'ID', 'OD', 'IU', 'SL'] as const;

export const AIRCRAFT_TYPES = [
  { type: 'B737-900ER', capacity: 189, seatConfiguration: '3-3' },
  { type: 'B737-800', capacity: 162, seatConfiguration: '3-3' },
  { type: 'A330-300', capacity: 360, seatConfiguration: '2-4-2' },
  { type: 'A320-200', capacity: 180, seatConfiguration: '3-3' },
];

export const CREW_NAMES = [
  'Capt. Bambang Wijaya',
  'F.O. Hendra Putra',
  'Sr. FA Siti Aminah',
  'FA Rizky Ramadhan',
  'FA Dewi Lestari',
  'FA Ahmad Fauzi',
  'FA Maria Natalia',
  'FA Yusuf Pratama',
];

// Seeded Flight Attendant accounts for Step 2 login verification
export const SYNTHETIC_EMPLOYEES: Record<string, { name: string; position: string; active: boolean }> = {
  'FA-1001': { name: 'Synth FA Alpha', position: 'FLIGHT_ATTENDANT', active: true },
  'FA-1002': { name: 'Synth FA Beta', position: 'FLIGHT_ATTENDANT', active: true },
  'FA-1003': { name: 'Synth FA Gamma', position: 'FLIGHT_ATTENDANT', active: true },
  'FA-2001': { name: 'Synth FA Replacement', position: 'FLIGHT_ATTENDANT', active: true },
  'SFA-103': { name: 'Sr. FA Synth 103', position: 'SENIOR_FLIGHT_ATTENDANT', active: true },
};

/**
 * Returns current local operational service day as 'YYYY-MM-DD'
 */
export function getServiceDay(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * High-performance deterministic Mulberry32 PRNG
 * Seeded by string hash of (SERVICE_DAY + FLIGHT_ID)
 */
export function createPRNG(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let seed = h >>> 0;
  return function next(): number {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function addMinutes(date: Date | string, minutes: number): string {
  const base = typeof date === 'string' ? new Date(date) : date;
  const newDate = new Date(base.getTime() + minutes * 60 * 1000);
  return newDate.toISOString();
}

/**
 * Build an exact PassengerBreakdown enforcing adult + child + infant === total
 */
export function buildBreakdown(adult: number, child: number, infant: number): PassengerBreakdown {
  const safeAdult = Math.max(0, adult);
  const safeChild = Math.max(0, child);
  const safeInfant = Math.max(0, infant);
  return {
    adult: safeAdult,
    child: safeChild,
    infant: safeInfant,
    total: safeAdult + safeChild + safeInfant,
  };
}

/**
 * Generates the full synthetic operational flight dataset for the active service day.
 * - Anchors protected demo flights (FL-SEED-111, FL-DEMO-JT123, FL-DEMO-ID306, FL-DEMO-SL789)
 * - Deterministically generates ambient daily flights using (serviceDay + flightId) seed
 * - Guarantees all passenger and lifecycle invariants
 */
export function generateSyntheticFlights(serviceDayInput?: string): Flight[] {
  const now = new Date();
  const serviceDay = serviceDayInput || getServiceDay(now);
  const flights: Flight[] = [];

  // Anchor date base for today's service day
  const baseDate = new Date(`${serviceDay}T00:00:00.000Z`);

  // ==========================================
  // 1. PROTECTED DEMO FLIGHTS (Permanent Invariants)
  // ==========================================

  // --- JT-111 (CGK -> DPS) : Dedicated Return / Rework Test ---
  const jt111Std = addMinutes(now, -10);
  const jt111Etd = addMinutes(now, 5);
  const jt111Sta = addMinutes(now, 100);
  const jt111Eta = addMinutes(now, 115);

  const jt111: Flight = {
    id: 'FL-SEED-111',
    carrierCode: 'JT',
    flightNumber: 'JT-111',
    flightDate: serviceDay,
    origin: 'CGK',
    destination: 'DPS',
    departureTerminal: 'T1A',
    arrivalTerminal: 'Domestic Terminal',
    gate: 'G12',
    boardingGate: 'B5',
    scheduledDeparture: jt111Std,
    estimatedDeparture: jt111Etd,
    scheduledArrival: jt111Sta,
    estimatedArrival: jt111Eta,
    flightStatus: 'ACTIVE',
    movementStatus: 'BOARDING',
    delayMinutes: 15,
    aircraft: {
      type: 'B737-900ER',
      registration: 'PK-LQP',
      capacity: 189,
      seatConfiguration: '3-3',
    },
    crewRoster: [
      { employeeId: 'CPT-101', name: 'Capt. James Hook', crewPosition: 'CAPTAIN', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_101' },
      { employeeId: 'FO-102', name: 'First Officer John Doe', crewPosition: 'FIRST_OFFICER', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_102' },
      { employeeId: 'SFA-103', name: 'Sr. FA Synth 103', crewPosition: 'SENIOR_FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_103' },
      { employeeId: 'FA-1001', name: 'Synth FA Alpha', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_alpha' },
      { employeeId: 'FA-1002', name: 'Synth FA Beta', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_beta' },
      { employeeId: 'FA-1003', name: 'Synth FA Gamma', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_gamma' },
    ],
    operationsStaff: [
      { employeeId: 'FO-CGK-001', name: 'FO Synth Jakarta', role: 'FLIGHT_OPERATIONS', station: 'CGK' },
      { employeeId: 'GA-CGK-001', name: 'Gate Agent CGK', role: 'GATE_STAFF', station: 'CGK' },
      { employeeId: 'BD-CGK-001', name: 'Boarding Staff CGK', role: 'BOARDING_STAFF', station: 'CGK' },
    ],
    passengerSources: {
      sales: {
        source: 'SALES',
        breakdown: buildBreakdown(150, 10, 4), // Total: 164
        updatedAt: addMinutes(now, -360),
      },
      checkIn: {
        source: 'CHECK_IN',
        breakdown: buildBreakdown(146, 9, 3), // Total: 158
        updatedAt: addMinutes(now, -120),
      },
      boarding: {
        source: 'BOARDING',
        breakdown: buildBreakdown(142, 8, 3), // Total: 153
        updatedAt: addMinutes(now, -15),
      },
      offload: {
        source: 'OFFLOAD',
        breakdown: buildBreakdown(2, 0, 0), // Total: 2
        updatedAt: addMinutes(now, -10),
      },
      noShow: {
        source: 'NO_SHOW',
        breakdown: buildBreakdown(2, 1, 0), // Total: 3 (153 + 2 + 3 = 158)
        updatedAt: addMinutes(now, -5),
      },
    },
    apbId: null,
    aimsCreatedUtc: addMinutes(new Date(jt111Std), -360),
    aimsAircraftAssignedUtc: addMinutes(new Date(jt111Std), -240),
    aimsCrewRosterVerifiedUtc: addMinutes(new Date(jt111Std), -120),
  };
  flights.push(jt111);

  // --- JT-123 (CGK -> DPS) : NORMAL FLOW (Sales 100, Check-in 99, Boarding 98, APB 98 -> VERIFIED) ---
  const jt123Std = addMinutes(now, -20);
  const jt123Etd = addMinutes(now, -5);
  const jt123Sta = addMinutes(now, 90);
  const jt123Eta = addMinutes(now, 105);

  const jt123: Flight = {
    id: 'FL-DEMO-JT123',
    carrierCode: 'JT',
    flightNumber: 'JT-123',
    flightDate: serviceDay,
    origin: 'CGK',
    destination: 'DPS',
    departureTerminal: 'T1A',
    arrivalTerminal: 'Domestic Terminal',
    gate: 'G08',
    boardingGate: 'B3',
    scheduledDeparture: jt123Std,
    estimatedDeparture: jt123Etd,
    scheduledArrival: jt123Sta,
    estimatedArrival: jt123Eta,
    flightStatus: 'ACTIVE',
    movementStatus: 'FINAL_CALL',
    delayMinutes: 15,
    aircraft: {
      type: 'B737-800',
      registration: 'PK-LJR',
      capacity: 189,
      seatConfiguration: '3-3',
    },
    crewRoster: [
      { employeeId: 'CPT-123', name: 'Capt. Hendra Gunawan', crewPosition: 'CAPTAIN', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_123' },
      { employeeId: 'FO-123', name: 'FO Budi Santoso', crewPosition: 'FIRST_OFFICER', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fo123' },
      { employeeId: 'SFA-123', name: 'Sr. FA Ratna Sari', crewPosition: 'SENIOR_FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_sfa123' },
      { employeeId: 'FA-1231', name: 'FA Dewi Lestari', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fa1' },
      { employeeId: 'FA-1232', name: 'FA Siti Rahma', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fa2' },
    ],
    operationsStaff: [
      { employeeId: 'FO-CGK-001', name: 'FO Dispatcher CGK', role: 'FLIGHT_OPERATIONS', station: 'CGK' },
    ],
    passengerSources: {
      sales: {
        source: 'SALES',
        breakdown: buildBreakdown(90, 8, 2), // Total: 100
        updatedAt: addMinutes(now, -300),
      },
      checkIn: {
        source: 'CHECK_IN',
        breakdown: buildBreakdown(89, 8, 2), // Total: 99
        updatedAt: addMinutes(now, -90),
      },
      boarding: {
        source: 'BOARDING',
        breakdown: buildBreakdown(88, 8, 2), // Total: 98
        updatedAt: addMinutes(now, -10),
      },
      offload: {
        source: 'OFFLOAD',
        breakdown: buildBreakdown(1, 0, 0), // Total: 1
        updatedAt: addMinutes(now, -12),
      },
      noShow: {
        source: 'NO_SHOW',
        breakdown: buildBreakdown(0, 0, 0), // Total: 0 (98 + 1 + 0 = 99)
        updatedAt: addMinutes(now, -8),
      },
    },
    apbId: null,
    aimsCreatedUtc: addMinutes(new Date(jt123Std), -360),
    aimsAircraftAssignedUtc: addMinutes(new Date(jt123Std), -240),
    aimsCrewRosterVerifiedUtc: addMinutes(new Date(jt123Std), -120),
  };
  flights.push(jt123);

  // --- ID-306 (CGK -> SUB) : VARIANCE / CORRECTION FLOW (Sales 151, Check-in 151, Boarding 150) ---
  const id306Std = addMinutes(now, -5);
  const id306Etd = addMinutes(now, 10);
  const id306Sta = addMinutes(now, 85);
  const id306Eta = addMinutes(now, 100);

  const id306: Flight = {
    id: 'FL-DEMO-ID306',
    carrierCode: 'ID',
    flightNumber: 'ID-306',
    flightDate: serviceDay,
    origin: 'CGK',
    destination: 'SUB',
    departureTerminal: 'T2E',
    arrivalTerminal: 'Terminal 1',
    gate: 'G14',
    boardingGate: 'B7',
    scheduledDeparture: id306Std,
    estimatedDeparture: id306Etd,
    scheduledArrival: id306Sta,
    estimatedArrival: id306Eta,
    flightStatus: 'ACTIVE',
    movementStatus: 'BOARDING',
    delayMinutes: 15,
    aircraft: {
      type: 'A320-200',
      registration: 'PK-LUF',
      capacity: 180,
      seatConfiguration: '3-3',
    },
    crewRoster: [
      { employeeId: 'CPT-306', name: 'Capt. Arya Pratama', crewPosition: 'CAPTAIN', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_306' },
      { employeeId: 'FO-306', name: 'FO Aditya Wijaya', crewPosition: 'FIRST_OFFICER', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fo306' },
      { employeeId: 'SFA-306', name: 'Sr. FA Maya Putri', crewPosition: 'SENIOR_FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_sfa306' },
      { employeeId: 'FA-3061', name: 'FA Nadia Zahra', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fa3' },
      { employeeId: 'FA-3062', name: 'FA Rina Melati', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fa4' },
    ],
    operationsStaff: [
      { employeeId: 'FO-CGK-001', name: 'FO Dispatcher CGK', role: 'FLIGHT_OPERATIONS', station: 'CGK' },
    ],
    passengerSources: {
      sales: {
        source: 'SALES',
        breakdown: buildBreakdown(140, 8, 3), // Total: 151
        updatedAt: addMinutes(now, -360),
      },
      checkIn: {
        source: 'CHECK_IN',
        breakdown: buildBreakdown(140, 8, 3), // Total: 151
        updatedAt: addMinutes(now, -120),
      },
      boarding: {
        source: 'BOARDING',
        breakdown: buildBreakdown(139, 8, 3), // Total: 150
        updatedAt: addMinutes(now, -15),
      },
      offload: {
        source: 'OFFLOAD',
        breakdown: buildBreakdown(1, 0, 0), // Total: 1
        updatedAt: addMinutes(now, -10),
      },
      noShow: {
        source: 'NO_SHOW',
        breakdown: buildBreakdown(0, 0, 0), // Total: 0 (150 + 1 + 0 = 151)
        updatedAt: addMinutes(now, -5),
      },
    },
    apbId: null,
    aimsCreatedUtc: addMinutes(new Date(id306Std), -360),
    aimsAircraftAssignedUtc: addMinutes(new Date(id306Std), -240),
    aimsCrewRosterVerifiedUtc: addMinutes(new Date(id306Std), -120),
  };
  flights.push(id306);

  // --- SL-789 (CGK -> KUL) : CONTINGENCY TARGET (Clean, Official Sources, Contingency at Runtime) ---
  const sl789Std = addMinutes(now, -35);
  const sl789Etd = addMinutes(now, 20);
  const sl789Sta = addMinutes(now, 85);
  const sl789Eta = addMinutes(now, 140);

  const sl789: Flight = {
    id: 'FL-DEMO-SL789',
    carrierCode: 'SL',
    flightNumber: 'SL-789',
    flightDate: serviceDay,
    origin: 'CGK',
    destination: 'KUL',
    departureTerminal: 'T2F',
    arrivalTerminal: 'KLIA2',
    gate: 'G21',
    boardingGate: 'B9',
    scheduledDeparture: sl789Std,
    estimatedDeparture: sl789Etd,
    scheduledArrival: sl789Sta,
    estimatedArrival: sl789Eta,
    flightStatus: 'ACTIVE',
    movementStatus: 'DELAYED',
    delayMinutes: 55,
    aircraft: {
      type: 'B737-900ER',
      registration: 'HS-LUM',
      capacity: 215,
      seatConfiguration: '3-3',
    },
    crewRoster: [
      { employeeId: 'CPT-789', name: 'Capt. Somchai Prasert', crewPosition: 'CAPTAIN', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_789' },
      { employeeId: 'FO-789', name: 'FO Ananda Chatchai', crewPosition: 'FIRST_OFFICER', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fo789' },
      { employeeId: 'SFA-789', name: 'Sr. FA Kanya Srisuk', crewPosition: 'SENIOR_FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_sfa789' },
      { employeeId: 'FA-7891', name: 'FA Malee Thong', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fa5' },
      { employeeId: 'FA-7892', name: 'FA Sunisa Wong', crewPosition: 'FLIGHT_ATTENDANT', active: true, originalRoster: true, replacementFor: null, syntheticPinHash: 'pin_fa6' },
    ],
    operationsStaff: [
      { employeeId: 'FO-CGK-001', name: 'FO Dispatcher CGK', role: 'FLIGHT_OPERATIONS', station: 'CGK' },
    ],
    passengerSources: {
      sales: {
        source: 'SALES',
        breakdown: buildBreakdown(170, 10, 4), // Total: 184
        updatedAt: addMinutes(now, -400),
      },
      checkIn: {
        source: 'CHECK_IN',
        breakdown: buildBreakdown(168, 10, 4), // Total: 182
        updatedAt: addMinutes(now, -180),
      },
      boarding: {
        source: 'BOARDING',
        breakdown: buildBreakdown(164, 10, 4), // Total: 178
        updatedAt: addMinutes(now, -30),
      },
      offload: {
        source: 'OFFLOAD',
        breakdown: buildBreakdown(2, 0, 0), // Total: 2
        updatedAt: addMinutes(now, -25),
      },
      noShow: {
        source: 'NO_SHOW',
        breakdown: buildBreakdown(2, 0, 0), // Total: 2 (178 + 2 + 2 = 182)
        updatedAt: addMinutes(now, -20),
      },
    },
    apbId: null,
    aimsCreatedUtc: addMinutes(new Date(sl789Std), -420),
    aimsAircraftAssignedUtc: addMinutes(new Date(sl789Std), -300),
    aimsCrewRosterVerifiedUtc: addMinutes(new Date(sl789Std), -150),
  };
  flights.push(sl789);

  // ==========================================
  // 2. AMBIENT DAILY FLIGHTS (Controlled Dynamic Generation)
  // ==========================================
  const routes: [StationCode, StationCode][] = [
    ['CGK', 'DPS'],
    ['DPS', 'CGK'],
    ['CGK', 'KUL'],
    ['KUL', 'CGK'],
    ['DPS', 'KUL'],
    ['KUL', 'DPS'],
    ['CGK', 'SUB'],
    ['SUB', 'CGK'],
    ['CGK', 'KNO'],
    ['KNO', 'CGK'],
    ['CGK', 'UPG'],
    ['UPG', 'CGK'],
    ['DPS', 'SUB'],
    ['SUB', 'DPS'],
    ['KNO', 'KUL'],
    ['KUL', 'KNO'],
    ['UPG', 'SUB'],
    ['SUB', 'UPG'],
  ];

  // Distinct lifecycle movement status allocations for balanced distribution
  const statusCycle: Flight['movementStatus'][] = [
    'SCHEDULED',
    'CHECK_IN',
    'BOARDING',
    'FINAL_CALL',
    'DELAYED',
    'DEPARTED',
    'IN_FLIGHT',
    'ARRIVED',
    'COMPLETED',
    'CANCELLED',
  ];

  const protectedNumbers = new Set(['JT-111', 'JT-123', 'ID-306', 'SL-789']);
  const protectedIds = new Set(['FL-SEED-111', 'FL-DEMO-JT123', 'FL-DEMO-ID306', 'FL-DEMO-SL789']);

  let ambientGenerated = 0;
  let flightSeq = 401;

  while (ambientGenerated < 35) {
    const flightId = `FL-SYNTH-${String(ambientGenerated + 1).padStart(3, '0')}`;
    if (protectedIds.has(flightId)) {
      continue;
    }

    // Deterministic PRNG seeded by SERVICE_DAY + FLIGHT_ID
    const prng = createPRNG(`${serviceDay}_${flightId}`);

    const routeIndex = Math.floor(prng() * routes.length);
    const route = routes[routeIndex];

    const carrierIndex = Math.floor(prng() * VALID_CARRIER_CODES.length);
    const carrier = VALID_CARRIER_CODES[carrierIndex];

    let flightNum = `${carrier}-${flightSeq}`;
    flightSeq++;
    if (protectedNumbers.has(flightNum)) {
      flightNum = `${carrier}-${flightSeq + 50}`;
      flightSeq += 51;
    }

    const acTypeIndex = Math.floor(prng() * AIRCRAFT_TYPES.length);
    const acTypeObj = AIRCRAFT_TYPES[acTypeIndex];
    const capacity = acTypeObj.capacity;

    const movementStatus = statusCycle[ambientGenerated % statusCycle.length];

    let delayMinutes = 0;
    let std = '';
    let etd = '';
    let sta = '';
    let eta = '';

    // Calculate realistic relative timing based on movement lifecycle
    switch (movementStatus) {
      case 'SCHEDULED':
        std = addMinutes(now, 120 + Math.floor(prng() * 240));
        etd = std;
        sta = addMinutes(new Date(std), 90 + Math.floor(prng() * 60));
        eta = sta;
        delayMinutes = 0;
        break;

      case 'CHECK_IN':
        std = addMinutes(now, 45 + Math.floor(prng() * 45));
        etd = std;
        sta = addMinutes(new Date(std), 90 + Math.floor(prng() * 60));
        eta = sta;
        delayMinutes = 0;
        break;

      case 'BOARDING':
        std = addMinutes(now, -10 + Math.floor(prng() * 15));
        delayMinutes = 10;
        etd = addMinutes(new Date(std), delayMinutes);
        sta = addMinutes(new Date(std), 100);
        eta = addMinutes(new Date(etd), 100);
        break;

      case 'FINAL_CALL':
        std = addMinutes(now, -20 + Math.floor(prng() * 10));
        delayMinutes = 15;
        etd = addMinutes(new Date(std), delayMinutes);
        sta = addMinutes(new Date(std), 95);
        eta = addMinutes(new Date(etd), 95);
        break;

      case 'DELAYED':
        std = addMinutes(now, -40);
        delayMinutes = 45 + Math.floor(prng() * 45);
        etd = addMinutes(new Date(std), delayMinutes);
        sta = addMinutes(new Date(std), 100);
        eta = addMinutes(new Date(etd), 100);
        break;

      case 'DEPARTED':
        std = addMinutes(now, -25 - Math.floor(prng() * 15));
        delayMinutes = 5;
        etd = addMinutes(new Date(std), delayMinutes);
        sta = addMinutes(new Date(std), 90);
        eta = addMinutes(new Date(etd), 90);
        break;

      case 'IN_FLIGHT':
        // Departed in past, ETA strictly in future
        std = addMinutes(now, -45 - Math.floor(prng() * 30));
        delayMinutes = 5;
        etd = addMinutes(new Date(std), delayMinutes);
        sta = addMinutes(new Date(std), 105);
        eta = addMinutes(new Date(etd), 105);
        break;

      case 'ARRIVED':
        // Arrived in recent past
        std = addMinutes(now, -135 - Math.floor(prng() * 30));
        delayMinutes = 10;
        etd = addMinutes(new Date(std), delayMinutes);
        sta = addMinutes(now, -20);
        eta = addMinutes(now, -10);
        break;

      case 'COMPLETED':
        // Completed operational cycle in past
        std = addMinutes(now, -260 - Math.floor(prng() * 60));
        delayMinutes = 5;
        etd = addMinutes(new Date(std), delayMinutes);
        sta = addMinutes(now, -140);
        eta = addMinutes(now, -135);
        break;

      case 'CANCELLED':
        std = addMinutes(now, 180 + Math.floor(prng() * 120));
        etd = std;
        sta = addMinutes(new Date(std), 100);
        eta = sta;
        delayMinutes = 0;
        break;
    }

    // Deterministic Passenger Numbers respecting strict invariants
    // 0 <= Boarding <= Check-in <= Sales <= Aircraft Capacity
    const salesTotal = Math.min(capacity, Math.floor(capacity * (0.75 + prng() * 0.18)));
    const child = Math.min(Math.floor(salesTotal * 0.08), Math.floor(prng() * 8) + 2);
    const infant = Math.min(Math.floor(salesTotal * 0.04), Math.floor(prng() * 4) + 1);
    const adult = salesTotal - child - infant;

    let ckTotal = 0;
    let bdTotal = 0;
    let offloadTotal = 0;
    let noShowTotal = 0;

    if (movementStatus === 'CANCELLED') {
      ckTotal = 0;
      bdTotal = 0;
      offloadTotal = 0;
      noShowTotal = 0;
    } else if (movementStatus === 'SCHEDULED') {
      ckTotal = 0;
      bdTotal = 0;
      offloadTotal = 0;
      noShowTotal = 0;
    } else if (movementStatus === 'CHECK_IN') {
      ckTotal = Math.floor(salesTotal * (0.4 + prng() * 0.4));
      bdTotal = 0;
      offloadTotal = 0;
      noShowTotal = 0;
    } else if (movementStatus === 'BOARDING') {
      ckTotal = Math.max(0, salesTotal - Math.floor(prng() * 4));
      bdTotal = Math.floor(ckTotal * (0.5 + prng() * 0.4));
      offloadTotal = 0;
      noShowTotal = 0;
    } else if (movementStatus === 'FINAL_CALL') {
      ckTotal = Math.max(0, salesTotal - Math.floor(prng() * 3));
      offloadTotal = Math.floor(prng() * 2);
      noShowTotal = Math.floor(prng() * 2);
      bdTotal = Math.max(0, ckTotal - offloadTotal - noShowTotal);
    } else if (movementStatus === 'DELAYED') {
      ckTotal = Math.max(0, salesTotal - Math.floor(prng() * 2));
      offloadTotal = 1;
      noShowTotal = Math.floor(prng() * 2);
      bdTotal = Math.max(0, ckTotal - offloadTotal - noShowTotal);
    } else {
      // DEPARTED, IN_FLIGHT, ARRIVED, COMPLETED
      ckTotal = Math.max(0, salesTotal - Math.floor(prng() * 3));
      offloadTotal = Math.floor(prng() * 2);
      noShowTotal = Math.floor(prng() * 3);
      bdTotal = Math.max(0, ckTotal - offloadTotal - noShowTotal);
    }

    // Helper to generate proportional breakdowns for check-in and boarding
    const makeProportionalBreakdown = (total: number, sourceSales: PassengerBreakdown) => {
      if (total <= 0) return buildBreakdown(0, 0, 0);
      const ratio = sourceSales.total > 0 ? total / sourceSales.total : 1;
      const ch = Math.min(total, Math.round(sourceSales.child * ratio));
      const inf = Math.min(total - ch, Math.round(sourceSales.infant * ratio));
      const ad = total - ch - inf;
      return buildBreakdown(ad, ch, inf);
    };

    const salesBreakdown = buildBreakdown(adult, child, infant);
    const checkInBreakdown = makeProportionalBreakdown(ckTotal, salesBreakdown);
    const boardingBreakdown = makeProportionalBreakdown(bdTotal, checkInBreakdown);
    const offloadBreakdown = buildBreakdown(offloadTotal, 0, 0);
    const noShowBreakdown = buildBreakdown(noShowTotal, 0, 0);

    // Deterministic Aircraft Tail Registration based on Carrier and Index
    const regPrefixMap: Record<string, string> = {
      JT: 'PK-L',
      ID: 'PK-B',
      OD: '9M-L',
      SL: 'HS-L',
      IU: 'PK-S',
    };
    const regPrefix = regPrefixMap[carrier] || 'PK-L';
    const regNum = 700 + ambientGenerated * 3;
    const registration = `${regPrefix}${regNum}`;

    const flight: Flight = {
      id: flightId,
      carrierCode: carrier,
      flightNumber: flightNum,
      flightDate: serviceDay,
      origin: route[0],
      destination: route[1],
      departureTerminal: route[0] === 'CGK' ? 'T2' : route[0] === 'DPS' ? 'Domestic' : 'KLIA2',
      arrivalTerminal: route[1] === 'CGK' ? 'T2' : route[1] === 'DPS' ? 'Domestic' : 'KLIA2',
      gate: `G${(ambientGenerated % 20) + 1}`,
      boardingGate: `B${(ambientGenerated % 12) + 1}`,
      scheduledDeparture: std,
      estimatedDeparture: etd,
      scheduledArrival: sta,
      estimatedArrival: eta,
      flightStatus: movementStatus === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
      movementStatus,
      delayMinutes,
      aircraft: {
        type: acTypeObj.type,
        registration,
        capacity: acTypeObj.capacity,
        seatConfiguration: acTypeObj.seatConfiguration,
      },
      crewRoster: [
        {
          employeeId: `CPT-${500 + ambientGenerated}`,
          name: `${CREW_NAMES[0]} ${ambientGenerated + 1}`,
          crewPosition: 'CAPTAIN',
          active: true,
          originalRoster: true,
          replacementFor: null,
          syntheticPinHash: 'pin_captain',
        },
        {
          employeeId: `FO-${500 + ambientGenerated}`,
          name: `${CREW_NAMES[1]} ${ambientGenerated + 1}`,
          crewPosition: 'FIRST_OFFICER',
          active: true,
          originalRoster: true,
          replacementFor: null,
          syntheticPinHash: 'pin_fo',
        },
        {
          employeeId: `SFA-${500 + ambientGenerated}`,
          name: `${CREW_NAMES[2]} ${ambientGenerated + 1}`,
          crewPosition: 'SENIOR_FLIGHT_ATTENDANT',
          active: true,
          originalRoster: true,
          replacementFor: null,
          syntheticPinHash: 'pin_sfa',
        },
        {
          employeeId: 'FA-1001',
          name: 'Synth FA Alpha',
          crewPosition: 'FLIGHT_ATTENDANT',
          active: true,
          originalRoster: true,
          replacementFor: null,
          syntheticPinHash: 'pin_alpha',
        },
        {
          employeeId: 'FA-1002',
          name: 'Synth FA Beta',
          crewPosition: 'FLIGHT_ATTENDANT',
          active: true,
          originalRoster: true,
          replacementFor: null,
          syntheticPinHash: 'pin_beta',
        },
      ],
      operationsStaff: [
        { employeeId: `FO-${route[0]}-001`, name: `Ops Agent ${route[0]}`, role: 'FLIGHT_OPERATIONS', station: route[0] },
      ],
      passengerSources: {
        sales: {
          source: 'SALES',
          breakdown: salesBreakdown,
          updatedAt: (new Date(addMinutes(new Date(std), -300)).getTime() > new Date(now).getTime())
            ? addMinutes(now, -10)
            : addMinutes(new Date(std), -300),
        },
        checkIn: {
          source: 'CHECK_IN',
          breakdown: checkInBreakdown,
          updatedAt: (['SCHEDULED', 'CANCELLED'].includes(movementStatus) || checkInBreakdown.total === 0)
            ? null
            : ((new Date(addMinutes(new Date(std), -90)).getTime() > new Date(now).getTime())
                ? addMinutes(now, -5)
                : addMinutes(new Date(std), -90)),
        },
        boarding: {
          source: 'BOARDING',
          breakdown: boardingBreakdown,
          updatedAt: (['SCHEDULED', 'CHECK_IN', 'CANCELLED'].includes(movementStatus) || boardingBreakdown.total === 0)
            ? null
            : ((new Date(addMinutes(new Date(std), -20)).getTime() > new Date(now).getTime())
                ? addMinutes(now, -2)
                : addMinutes(new Date(std), -20)),
        },
        offload: {
          source: 'OFFLOAD',
          breakdown: offloadBreakdown,
          updatedAt: (['SCHEDULED', 'CHECK_IN', 'CANCELLED'].includes(movementStatus) || offloadBreakdown.total === 0)
            ? null
            : ((new Date(addMinutes(new Date(std), -10)).getTime() > new Date(now).getTime())
                ? addMinutes(now, -2)
                : addMinutes(new Date(std), -10)),
        },
        noShow: {
          source: 'NO_SHOW',
          breakdown: noShowBreakdown,
          updatedAt: (['SCHEDULED', 'CHECK_IN', 'CANCELLED'].includes(movementStatus) || noShowBreakdown.total === 0)
            ? null
            : ((new Date(addMinutes(new Date(std), -5)).getTime() > new Date(now).getTime())
                ? addMinutes(now, -1)
                : addMinutes(new Date(std), -5)),
        },
      },
      apbId: null,
      aimsCreatedUtc: (new Date(addMinutes(new Date(std), -360)).getTime() > new Date(now).getTime())
        ? addMinutes(now, -30)
        : addMinutes(new Date(std), -360),
      aimsAircraftAssignedUtc: (new Date(addMinutes(new Date(std), -240)).getTime() > new Date(now).getTime())
        ? addMinutes(now, -20)
        : addMinutes(new Date(std), -240),
      aimsCrewRosterVerifiedUtc: (new Date(addMinutes(new Date(std), -120)).getTime() > new Date(now).getTime())
        ? addMinutes(now, -10)
        : addMinutes(new Date(std), -120),
    };

    flights.push(flight);
    ambientGenerated++;
  }

  return flights;
}

/**
 * Seeds representative ambient APB records on non-demo flights so Manifest Station
 * and HQ dashboards are fully populated with realistic multi-role workflow data.
 * Protected demo flights (JT-111, JT-123, ID-306, SL-789) remain clean (apbId: null).
 */
export function generateSyntheticFlightsWithAPBs(serviceDayInput?: string): { flights: Flight[]; apbs: DigitalAPB[] } {
  const serviceDay = serviceDayInput || getServiceDay();
  const flights = generateSyntheticFlights(serviceDay);
  const apbs: DigitalAPB[] = [];
  const now = new Date();

  // Representative ambient workflow configurations on specific ambient flights
  const workflowConfigs: {
    flightId: string;
    status: APBStatus;
    serverStatus: APBServerStatus;
    apbStatusLayer?: DigitalAPB['apbStatusLayer'];
    reworkStatus?: DigitalAPB['reworkStatus'];
    reworkReviewStatus?: DigitalAPB['reworkReviewStatus'];
    returnReason?: string;
  }[] = [
    { flightId: 'FL-SYNTH-002', status: 'PREPARED', serverStatus: 'NOT_SENT', apbStatusLayer: 'CREATED', reworkStatus: 'CREATED' },
    { flightId: 'FL-SYNTH-003', status: 'FA_SUBMITTED', serverStatus: 'NOT_SENT', apbStatusLayer: 'VERIFIED', reworkStatus: 'VERIFIED' },
    {
      flightId: 'FL-SYNTH-005',
      status: 'RETURNED_TO_FLIGHT_OPERATIONS',
      serverStatus: 'SENT',
      apbStatusLayer: 'VERIFIED',
      reworkStatus: 'RETURNED',
      reworkReviewStatus: 'RETURNED',
      returnReason: 'Gate boarding scan mismatch (-1 infant scan variance)',
    },
    { flightId: 'FL-SYNTH-006', status: 'SENT_TO_SERVER', serverStatus: 'SENT', apbStatusLayer: 'FINALIZED', reworkStatus: 'SUBMITTED' },
    { flightId: 'FL-SYNTH-007', status: 'STATION_CHECKED', serverStatus: 'SENT', apbStatusLayer: 'FINALIZED', reworkStatus: 'APPROVED', reworkReviewStatus: 'APPROVED' },
    { flightId: 'FL-SYNTH-008', status: 'HQ_REVIEWED', serverStatus: 'SENT', apbStatusLayer: 'FINALIZED', reworkStatus: 'APPROVED', reworkReviewStatus: 'APPROVED' },
    { flightId: 'FL-SYNTH-009', status: 'COMPLETED', serverStatus: 'SENT', apbStatusLayer: 'FINALIZED', reworkStatus: 'APPROVED', reworkReviewStatus: 'APPROVED' },
  ];

  workflowConfigs.forEach((cfg, idx) => {
    const flight = flights.find((f) => f.id === cfg.flightId);
    if (!flight) return;

    const apbId = `APB-SYNTH-${String(idx + 1).padStart(3, '0')}`;
    const apbUniqueNumber = `APB-${flight.carrierCode}-${serviceDay.replace(/-/g, '')}-${String(idx + 101).padStart(3, '0')}`;
    const boardingPax = flight.passengerSources.boarding.breakdown;
    const depTime = new Date(flight.scheduledDeparture);
    const arrTime = new Date(flight.scheduledArrival);

    const clampToPast = (iso: string, fallbackOffsetMinutes: number = -5): string => {
      const d = new Date(iso);
      if (d.getTime() > new Date(now).getTime()) {
        return addMinutes(now, fallbackOffsetMinutes);
      }
      return iso;
    };

    const apb: DigitalAPB = {
      id: apbId,
      apbUniqueNumber,
      flightId: flight.id,
      status: cfg.status,
      processingStatus: null,
      serverStatus: cfg.serverStatus,
      preparedBy: 'FO-CGK-001',
      preparedAt: clampToPast(addMinutes(depTime, -30), -30),
      temporaryCount: { ...boardingPax },
      actualCount: ['FA_SUBMITTED', 'SENT_TO_SERVER', 'STATION_CHECKED', 'HQ_REVIEWED', 'COMPLETED', 'RETURNED_TO_FLIGHT_OPERATIONS'].includes(cfg.status)
        ? { ...boardingPax }
        : null,
      previousActualCounts: [],
      extraCrew: 0,
      flightAttendantVerification: ['FA_SUBMITTED', 'SENT_TO_SERVER', 'STATION_CHECKED', 'HQ_REVIEWED', 'COMPLETED', 'RETURNED_TO_FLIGHT_OPERATIONS'].includes(cfg.status)
        ? {
            crewStatus: 'ORIGINAL_CREW',
            originalCrewEmployeeId: 'FA-1001',
            replacementCrewEmployeeId: null,
            replacementCrewName: null,
            replacementReason: null,
            employeeId: 'FA-1001',
            employeeName: 'Synth FA Alpha',
            pinStatus: 'VERIFIED_WITH_PIN',
            verificationStatus: 'VERIFIED',
            verifiedAt: clampToPast(addMinutes(depTime, -20), -20),
          }
        : null,
      flightAttendantSubmittedAt: ['FA_SUBMITTED', 'SENT_TO_SERVER', 'STATION_CHECKED', 'HQ_REVIEWED', 'COMPLETED', 'RETURNED_TO_FLIGHT_OPERATIONS'].includes(cfg.status)
        ? clampToPast(addMinutes(depTime, -20), -20)
        : null,
      flightOperationsRemark: 'Pre-flight passenger and cargo verification complete.',
      submissionId: cfg.serverStatus === 'SENT' ? `SUB-${serviceDay.replace(/-/g, '')}-${idx + 1}` : null,
      sentBy: cfg.serverStatus === 'SENT' ? 'FO-CGK-001' : null,
      sentAt: cfg.serverStatus === 'SENT' ? clampToPast(addMinutes(depTime, -15), -15) : null,
      manifestStationReview: ['STATION_CHECKED', 'HQ_REVIEWED', 'COMPLETED'].includes(cfg.status)
        ? {
            station: flight.origin,
            reviewerId: `STA-${flight.origin}-01`,
            status: 'STATION_CHECKED',
            remarks: 'Station physical boarding reconciling verified.',
            reviewedAt: clampToPast(addMinutes(depTime, -5), -5),
          }
        : null,
      manifestHQReview: ['HQ_REVIEWED', 'COMPLETED'].includes(cfg.status)
        ? {
            reviewerId: 'HQ-REV-001',
            status: cfg.status === 'COMPLETED' ? 'COMPLETED' : 'HQ_REVIEWED',
            remarks: 'HQ Yield and Revenue verification reconciled.',
            reviewedAt: clampToPast(addMinutes(arrTime, 25), -2),
          }
        : null,
      sourceMode: 'LIVE',
      verificationStatus: 'RECONCILED',
      syncStatus: cfg.serverStatus === 'SENT' ? 'SYNCHRONIZED' : 'PENDING',
      apbStatusLayer: cfg.apbStatusLayer,
      reworkStatus: cfg.reworkStatus,
      reworkReviewStatus: cfg.reworkReviewStatus,
      returnReason: cfg.returnReason,
      returnedBy: cfg.returnReason ? 'STA-CGK-01' : undefined,
      returnedAt: cfg.returnReason ? clampToPast(addMinutes(depTime, -10), -10) : undefined,
      returnNotes: cfg.returnReason ? 'Please recount infant tickets at Gate B5 and resubmit verified APB.' : undefined,
      returnHistory: cfg.returnReason
        ? [
            {
              originalSubmissionAt: clampToPast(addMinutes(depTime, -15), -15),
              returnedAt: clampToPast(addMinutes(depTime, -10), -10),
              returnReason: cfg.returnReason,
              returnedBy: 'STA-CGK-01',
              returnNotes: 'Recount infant tickets and resubmit.',
            },
          ]
        : undefined,
    };

    flight.apbId = apb.id;
    apbs.push(apb);
  });

  return { flights, apbs };
}
