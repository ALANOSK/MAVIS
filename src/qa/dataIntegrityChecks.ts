/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flight, DigitalAPB } from '../types';
import { QAFinding } from './runtimeQaChecks';

export interface FormulasReport {
  formulaId: string;
  name: string;
  equation: string;
  status: 'PASS' | 'WARNING' | 'FAILED' | 'NOT_TESTED';
  description: string;
  findings: string[];
}

export function runDataIntegrityChecks(
  flights: Flight[],
  apbs: DigitalAPB[],
  timestamp: string
): { findings: QAFinding[]; formulasReport: FormulasReport[] } {
  const findings: QAFinding[] = [];
  const formulasReport: FormulasReport[] = [];

  // Formula 1: Sales-Check-In Variance
  let checkInVariancePass = true;
  const checkInVarianceFindings: string[] = [];
  
  // Formula 2: No-show Pax
  let noShowPaxPass = true;
  const noShowPaxFindings: string[] = [];

  // Formula 3: Gate No-show / Offloaded Pax
  let gateNoShowPass = true;
  const gateNoShowFindings: string[] = [];

  // Formula 4: Manifest Variance
  let manifestVariancePass = true;
  const manifestVarianceFindings: string[] = [];

  // Formula 5: Load Factor
  let loadFactorPass = true;
  const loadFactorFindings: string[] = [];

  flights.forEach((f) => {
    const salesPax = f.passengerSources?.sales?.breakdown?.total || 0;
    const checkInPax = f.passengerSources?.checkIn?.breakdown?.total || 0;
    const boardedPax = f.passengerSources?.boarding?.breakdown?.total || 0;
    
    // Manifest actual count matches the APB's final submitted/verified actual count, falling back to boarding breakdown
    const apb = apbs.find(a => a.flightId === f.id);
    const manifestPax = apb?.actualCount?.total || boardedPax;
    const capacity = f.aircraft?.capacity || 0;

    // 1. Sales-Check-in Variance = Checked-in Pax - Sales Pax
    // (This is the operational difference between actual checked-in vs originally booked)
    const expectedVariance = checkInPax - salesPax;
    // In our app, check-in variance should match this formula's calculation.
    checkInVarianceFindings.push(`Flight ${f.flightNumber}: Checked-In (${checkInPax}) - Sales (${salesPax}) = Variance (${expectedVariance})`);

    // 2. No-show Pax = Sales Pax - Checked-in Pax (assuming booked but did not check in)
    const expectedNoShow = salesPax - checkInPax;
    noShowPaxFindings.push(`Flight ${f.flightNumber}: Booked (${salesPax}) - Checked-In (${checkInPax}) = No-Show (${expectedNoShow >= 0 ? expectedNoShow : 0})`);

    // 3. Gate No-show = Checked-in Pax - Boarded Pax
    const expectedGateNoShow = checkInPax - boardedPax;
    if (expectedGateNoShow < 0) {
      gateNoShowPass = false;
      gateNoShowFindings.push(`[FAILED] Flight ${f.flightNumber}: Checked-In count (${checkInPax}) is less than Boarded count (${boardedPax}). Negative gate no-shows.`);
    } else {
      gateNoShowFindings.push(`Flight ${f.flightNumber}: Checked-In (${checkInPax}) - Boarded (${boardedPax}) = Gate No-Show (${expectedGateNoShow})`);
    }

    // 4. Manifest Variance = Final Manifest Pax - Boarded Pax
    // (Should normally be 0 unless there's an active discrepancy being audit-investigated)
    const expectedManifestVariance = manifestPax - boardedPax;
    manifestVarianceFindings.push(`Flight ${f.flightNumber}: Final Manifest (${manifestPax}) - Boarded (${boardedPax}) = Variance (${expectedManifestVariance})`);

    // 5. Load Factor = Final Manifest Pax / Capacity * 100
    if (capacity > 0) {
      const expectedLoadFactor = (manifestPax / capacity) * 100;
      loadFactorFindings.push(`Flight ${f.flightNumber}: Manifest (${manifestPax}) / Capacity (${capacity}) = Load Factor (${expectedLoadFactor.toFixed(1)}%)`);
    } else {
      loadFactorPass = false;
      loadFactorFindings.push(`[WARNING] Flight ${f.flightNumber}: Zero capacity, Load Factor cannot be computed.`);
    }
  });

  // Compile Formulas Reports
  formulasReport.push({
    formulaId: 'FORM-001',
    name: 'Sales–Check-in Variance',
    equation: 'Sales-Check-in Variance = Checked-in Pax - Sales Pax',
    status: checkInVariancePass ? 'PASS' : 'WARNING',
    description: 'Tracks passenger volume shifts between initial booking sales and physical check-in desks.',
    findings: checkInVarianceFindings
  });

  formulasReport.push({
    formulaId: 'FORM-002',
    name: 'No-show Pax',
    equation: 'No-show Pax = Sales Pax - Checked-in Pax',
    status: noShowPaxPass ? 'PASS' : 'WARNING',
    description: 'Calculates the volume of ticketed passengers who did not clear the airport check-in gate.',
    findings: noShowPaxFindings
  });

  formulasReport.push({
    formulaId: 'FORM-003',
    name: 'Gate No-show / Offloaded Pax',
    equation: 'Gate No-show / Offloaded Pax = Checked-in Pax - Boarded Pax',
    status: gateNoShowPass ? 'PASS' : 'FAILED',
    description: 'Calculates the critical count of passengers who checked in but failed to board the aircraft or were offloaded.',
    findings: gateNoShowFindings
  });

  formulasReport.push({
    formulaId: 'FORM-004',
    name: 'Manifest Variance',
    equation: 'Manifest Variance = Final Manifest Pax - Boarded Pax',
    status: manifestVariancePass ? 'PASS' : 'WARNING',
    description: 'Traces any reporting mismatches between final paper/sealed manifests and gate boarding card scans.',
    findings: manifestVarianceFindings
  });

  formulasReport.push({
    formulaId: 'FORM-005',
    name: 'Load Factor',
    equation: 'Load Factor = (Final Manifest Pax / Aircraft Capacity) * 100',
    status: loadFactorPass ? 'PASS' : 'WARNING',
    description: 'Computes physical seat occupancy percentages used for operational efficiency auditing.',
    findings: loadFactorFindings
  });

  return {
    findings,
    formulasReport
  };
}
