import { Flight, StationCode, Aircraft, CrewMember, OperationsStaff } from './types';
import { STATIONS, CARRIERS } from './data';

// Simple deterministic seeded random generator to prevent flickering
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function getPreviousThreeMonthsRange() {
  const now = new Date();
  // Start is the 1st day of the month 2 months ago (e.g., if August, then June 1st)
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  // End is the last day of the current month (e.g., if August, then August 31st)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

const ROUTES: [StationCode, StationCode][] = [
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
];

const CARRIER_KEYS = ['JT', 'ID', 'OD', 'SL', 'IU'];

const AIRCRAFT_MODELS = [
  { type: 'B737-900ER', capacity: 189, seatConfiguration: '3-3' },
  { type: 'B737-800', capacity: 162, seatConfiguration: '3-3' },
  { type: 'A330-300', capacity: 360, seatConfiguration: '2-4-2' },
  { type: 'ATR 72-600', capacity: 72, seatConfiguration: '2-2' },
];

const DELAY_REASONS = [
  'Late Incoming Aircraft',
  'Weather Conditions',
  'Air Traffic Control holding',
  'Technical checklist delay',
  'Ground Handling coordination',
];

export function generateHistoricalFlights(): Flight[] {
  const { start, end } = getPreviousThreeMonthsRange();
  const flights: Flight[] = [];

  // Generate 120 flights evenly distributed across the date range
  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const numFlights = 140;

  for (let idx = 0; idx < numFlights; idx++) {
    const seed = idx + 1000;
    const r1 = seededRandom(seed);
    const r2 = seededRandom(seed + 1);
    const r3 = seededRandom(seed + 2);
    const r4 = seededRandom(seed + 3);

    // Calculate flight date
    const dayOffset = Math.floor(r1 * totalDays);
    const flightDateObj = new Date(start.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const flightDateStr = flightDateObj.toISOString().split('T')[0];

    // Pick route
    const routeIndex = Math.floor(r2 * ROUTES.length);
    const [origin, destination] = ROUTES[routeIndex];

    // Pick carrier
    const carrierCode = CARRIER_KEYS[Math.floor(r3 * CARRIER_KEYS.length)];
    const flightNumber = `${carrierCode}-${100 + (idx % 800)}`;

    // Match aircraft registration regulations (Jet = Boeing/Airbus)
    const acModel = AIRCRAFT_MODELS[idx % 3]; // Boeing/Airbus jet fleet
    const regPrefix = carrierCode === 'IU' ? 'S' : carrierCode === 'OD' ? 'M' : 'L';
    const registration = `PK-${regPrefix}${100 + (idx % 899)}`;

    // Build aircraft object
    const aircraft: Aircraft = {
      type: acModel.type,
      registration,
      capacity: acModel.capacity,
      seatConfiguration: acModel.seatConfiguration,
    };

    // Scheduled times
    const hour = 6 + (idx % 15);
    const minute = (idx * 15) % 60;
    const scheduledDepStr = `${flightDateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`;
    const schDepDate = new Date(scheduledDepStr);
    const schArrDate = new Date(schDepDate.getTime() + 110 * 60 * 1000); // 1hr 50m duration
    const scheduledArrStr = schArrDate.toISOString();

    // Movement status distribution
    // 78% On Time / Completed, 14% Delayed, 8% Cancelled
    let movementStatus: Flight['movementStatus'] = 'COMPLETED';
    let delayMinutes = 0;
    let delayReason: string | undefined;

    const statusRoll = r4 * 100;
    if (statusRoll < 8) {
      movementStatus = 'CANCELLED';
    } else if (statusRoll < 22) {
      movementStatus = 'DELAYED';
      delayMinutes = 15 + Math.floor(seededRandom(seed + 5) * 120); // 15 to 135 mins delay
      delayReason = DELAY_REASONS[idx % DELAY_REASONS.length];
    } else {
      movementStatus = 'COMPLETED';
    }

    // Actual times
    const estDepDate = new Date(schDepDate.getTime() + delayMinutes * 60 * 1000);
    const estArrDate = new Date(schArrDate.getTime() + delayMinutes * 60 * 1000);

    // Passenger count sales vs actual
    const capacity = aircraft.capacity;
    const salesTotal = Math.floor(capacity * (0.6 + seededRandom(seed + 6) * 0.35)); // 60% to 95% load
    const child = Math.floor(salesTotal * 0.05);
    const infant = Math.floor(salesTotal * 0.02);
    const adult = salesTotal - child - infant;

    // Discrepancy indicator trigger (10% chance)
    let actualTotal = salesTotal;
    const isDiscrepant = seededRandom(seed + 7) < 0.10 && movementStatus !== 'CANCELLED';
    if (isDiscrepant) {
      const diff = Math.floor(seededRandom(seed + 8) * 6) + 1; // diff of 1 to 6
      const sign = seededRandom(seed + 9) > 0.5 ? 1 : -1;
      actualTotal = salesTotal + sign * diff;
      // Cap at capacity, floor at 10
      actualTotal = Math.max(10, Math.min(capacity, actualTotal));
    }

    const actChild = Math.floor(actualTotal * 0.05);
    const actInfant = Math.floor(actualTotal * 0.02);
    const actAdult = actualTotal - actChild - actInfant;

    // Passenger structures
    const passengerSources: Flight['passengerSources'] = {
      sales: {
        source: 'SALES',
        breakdown: { adult, child, infant, total: salesTotal },
        updatedAt: schDepDate.toISOString(),
      },
      checkIn: {
        source: 'CHECK_IN',
        breakdown: { adult: actAdult, child: actChild, infant: actInfant, total: actualTotal },
        updatedAt: schDepDate.toISOString(),
      },
      boarding: {
        source: 'BOARDING',
        breakdown: { adult: actAdult, child: actChild, infant: actInfant, total: actualTotal },
        updatedAt: schDepDate.toISOString(),
      },
      offload: {
        source: 'OFFLOAD',
        breakdown: { adult: 0, child: 0, infant: 0, total: 0 },
        updatedAt: schDepDate.toISOString(),
      },
      noShow: {
        source: 'NO_SHOW',
        breakdown: { adult: 0, child: 0, infant: 0, total: 0 },
        updatedAt: schDepDate.toISOString(),
      },
    };

    // Synthesized empty crew and staff since they are historical records
    const crewRoster: CrewMember[] = [];
    const operationsStaff: OperationsStaff[] = [];

    const flight: Flight = {
      id: `FL-HIST-${String(idx).padStart(4, '0')}`,
      carrierCode,
      flightNumber,
      flightDate: flightDateStr,
      origin,
      destination,
      departureTerminal: 'T2',
      arrivalTerminal: 'T1',
      gate: `G${(idx % 20) + 1}`,
      boardingGate: `B${(idx % 10) + 1}`,
      scheduledDeparture: schDepDate.toISOString(),
      estimatedDeparture: estDepDate.toISOString(),
      scheduledArrival: schArrDate.toISOString(),
      estimatedArrival: estArrDate.toISOString(),
      flightStatus: movementStatus === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
      movementStatus,
      delayMinutes,
      aircraft,
      crewRoster,
      operationsStaff,
      passengerSources,
      apbId: movementStatus === 'COMPLETED' || movementStatus === 'DELAYED' ? `apb-hist-${idx}` : null,
    };

    // Add metadata for delay reason to query directly
    (flight as any).delayReason = delayReason;

    flights.push(flight);
  }

  // Sort chronologically
  return flights.sort((a, b) => new Date(a.scheduledDeparture).getTime() - new Date(b.scheduledDeparture).getTime());
}
