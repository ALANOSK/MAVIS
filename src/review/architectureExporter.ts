/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function exportProjectStructure(staticBaseline: any): string {
  const files = staticBaseline?.filesReviewed || [
    'src/App.tsx',
    'src/main.tsx',
    'src/index.css',
    'src/types.ts',
    'src/db.ts',
    'src/data.ts',
    'src/historicalData.ts',
    'src/lib/revenueData.ts',
    'src/components/FlightRadar.tsx',
    'src/components/QuickAccessPanel.tsx',
    'src/components/FlightOperationsPage.tsx',
    'src/components/FlightAttendantPortal.tsx',
    'src/components/ManifestStationPage.tsx',
    'src/components/ManifestHQPage.tsx',
    'src/components/HQSalesRevenueDashboard.tsx',
    'src/components/APBAuditTimeline.tsx',
    'src/qa/qaReportCompiler.ts',
    'src/qa/runtimeQaChecks.ts',
    'src/qa/dataIntegrityChecks.ts',
    'src/qa/qaZipExporter.ts'
  ];

  return `================================================================================
MAVIS PROJECT STRUCTURE & DIRECTORY TREE
================================================================================
Generated Architecture Snapshot

mavis-app/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── public/
│   ├── qa-baseline.json
│   └── mavis-review-baseline.json
├── scripts/
│   ├── generateQaBaseline.ts
│   └── qaCoverageManifest.ts
└── src/
    ├── main.tsx                    [Application Root Entry]
    ├── App.tsx                     [Main Coordinator & Router & Diagnostics Panel]
    ├── index.css                   [Global Tailwind System & High-Contrast Light Mode]
    ├── types.ts                    [Authoritative Type & Interface Contracts]
    ├── db.ts                       [IndexedDB Persistence Engine - "flights" & "apbs"]
    ├── data.ts                     [Initial Operational Flight Seeds]
    ├── historicalData.ts           [Historical Flight Manifest Archives]
    ├── lib/
    │   └── revenueData.ts          [Revenue & Passenger Sales Generator & Formulas]
    ├── components/
    │   ├── FlightRadar.tsx         [Interactive Radar Map & Airport Hub Nodes]
    │   ├── QuickAccessPanel.tsx    [Role Authentication Launcher]
    │   ├── FlightOperationsPage.tsx[Dispatcher & Leg Movement Controller]
    │   ├── FlightAttendantPortal.tsx[FA Cabin Count & PIN Signature Terminal]
    │   ├── ManifestStationPage.tsx [Station Discrepancy Reconciliation]
    │   ├── ManifestHQPage.tsx      [HQ Final Audit Sign-Off & Approvals]
    │   ├── HQSalesRevenueDashboard.tsx [Financial Revenue & Ticket Sales Ledger]
    │   └── APBAuditTimeline.tsx    [Append-Only Audit Event Ledger]
    ├── qa/
    │   ├── qaReportCompiler.ts     [Structured QA JSON & Text Compiler]
    │   ├── runtimeQaChecks.ts      [Real-time Runtime Invariant Scanner]
    │   ├── dataIntegrityChecks.ts [Data Formulas & Conservation Engine]
    │   ├── qaSanitizer.ts          [Privacy Masking & Sanitizer]
    │   └── qaZipExporter.ts        [QA Zip Packaging Engine]
    └── review/
        ├── architectureExporter.ts [Architecture Map Generator]
        ├── workflowExporter.ts     [Workflow Map Generator]
        ├── dataLineageExporter.ts  [Data Lineage Generator]
        ├── sourceManifestExporter.ts [Source Code & Dependency Exporter]
        ├── runtimeSnapshotExporter.ts [Live State Snapshotter]
        ├── uiManifestExporter.ts   [UI & Screen Index Exporter]
        ├── masterReviewCompiler.ts [Master 30-Section Review Compiler]
        ├── reviewBundleSanitizer.ts [Sanitizer for Review Bundle]
        ├── mavisReviewBuilder.ts   [Review Bundle File Engine]
        └── mavisReviewZipExporter.ts [Review Bundle ZIP Packaging]

Verified file list count: ${files.length}
`;
}

export function exportRouteMap(staticBaseline: any): any[] {
  return staticBaseline?.routes || [
    { path: '/', label: 'Flight Radar & Quick Access', roles: ['ALL'] },
    { path: '/flight-operations', label: 'Flight Operations Dispatch', roles: ['FLIGHT_OPERATIONS', 'MANIFEST_HQ'] },
    { path: '/flight-attendant', label: 'Flight Attendant Cabin Count', roles: ['FLIGHT_ATTENDANT'] },
    { path: '/manifest-station', label: 'Manifest Station Discrepancy Audit', roles: ['MANIFEST_STATION', 'MANIFEST_HQ'] },
    { path: '/manifest-hq', label: 'Manifest HQ Master Approvals', roles: ['MANIFEST_HQ'] },
    { path: '/hq-sales-revenue', label: 'HQ Sales & Revenue Ledger', roles: ['MANIFEST_HQ'] }
  ];
}

export function exportRoleMatrix(staticBaseline: any): any[] {
  return staticBaseline?.roles || [
    {
      id: 'FLIGHT_ATTENDANT',
      label: 'FLIGHT ATTENDANT',
      access: ['View Assigned Cabin Count', 'Input Adult/Child/Infant Breakdown', 'Verify 6-Digit PIN', 'Seal v1 Digital APB']
    },
    {
      id: 'FLIGHT_OPERATIONS',
      label: 'FLIGHT OPERATIONS',
      access: ['Dispatch Scheduled Flights', 'Verify Pre-flight Checklists', 'Trigger 5-Min Shift Simulation', 'Return APB to FA for Recheck']
    },
    {
      id: 'MANIFEST_STATION',
      label: 'MANIFEST STATION',
      access: ['Compare Gate Scans vs FA Counts', 'Post Station Discrepancy Notes', 'Seal v2 Digital APB', 'Initiate Station Handover']
    },
    {
      id: 'MANIFEST_HQ',
      label: 'MANIFEST HQ',
      access: ['Full System Authority', 'Final HQ Seal v3 Sign-off', 'Audit Revenue & Ticket Allocations', 'View APB Timeline', 'Diagnostic Breaker Panel Access']
    }
  ];
}
