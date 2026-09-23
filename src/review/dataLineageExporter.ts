/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function exportDataLineage(): any[] {
  return [
    {
      stage: 1,
      name: 'SEEDING_AND_INITIALIZATION',
      description: 'Default flight schedules and APB records loaded into IndexedDB object stores ("flights", "apbs").',
      source: 'src/data.ts',
      destination: 'IndexedDB ("mavis_db")',
      integrityCheck: 'Unique flight IDs and aircraft seat capacities check'
    },
    {
      stage: 2,
      name: 'DISPATCH_AND_SCHEDULING',
      description: 'Flight Operations dispatches flight leg, locks estimated departure times, and transitions status to BOARDING.',
      source: 'FlightOperationsPage.tsx',
      destination: 'IndexedDB "flights" store',
      integrityCheck: 'Pre-flight checklist item verification'
    },
    {
      stage: 3,
      name: 'CABIN_BOARDING_COUNT',
      description: 'Senior Flight Attendant performs physical cabin count, inputs Adult/Child/Infant counts, and verifies 6-digit PIN (123456).',
      source: 'FlightAttendantPortal.tsx',
      destination: 'DigitalAPB v1 seal state',
      integrityCheck: 'PIN hash validation & seat capacity boundary check'
    },
    {
      stage: 4,
      name: 'STATION_RECONCILIATION',
      description: 'Manifest Station Agent compares gate card scans vs FA counts, logs discrepancy notes, and seals v2 APB.',
      source: 'ManifestStationPage.tsx',
      destination: 'DigitalAPB v2 seal state + APBNote ledger',
      integrityCheck: 'Discrepancy variance formula calculation'
    },
    {
      stage: 5,
      name: 'HQ_AUDIT_AND_APPROVAL',
      description: 'Manifest HQ Auditor approves manifest, locks APB v3 final snapshot, and updates sales & revenue realizations.',
      source: 'ManifestHQPage.tsx & HQSalesRevenueDashboard.tsx',
      destination: 'IndexedDB "apbs" store + Revenue Ledger',
      integrityCheck: 'Conservation of revenue equation validation'
    },
    {
      stage: 6,
      name: 'HISTORICAL_ARCHIVAL',
      description: 'Completed flights moved to historical analysis arrays for load factor and route yield reporting.',
      source: 'src/historicalData.ts',
      destination: 'Historical Data Store',
      integrityCheck: 'Chronological timeline consistency'
    }
  ];
}
