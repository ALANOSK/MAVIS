/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function exportFileList(staticBaseline: any): string {
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
    'src/components/HQHistoricalDashboard.tsx',
    'src/components/APBAuditTimeline.tsx',
    'src/qa/qaReportCompiler.ts',
    'src/qa/runtimeQaChecks.ts',
    'src/qa/dataIntegrityChecks.ts',
    'src/qa/qaSanitizer.ts',
    'src/qa/qaZipExporter.ts',
    'src/qa/workflowDocumentation.ts',
    'src/review/mavisReviewBuilder.ts',
    'src/review/masterReviewCompiler.ts',
    'src/review/architectureExporter.ts',
    'src/review/dataLineageExporter.ts',
    'src/review/uiManifestExporter.ts',
    'src/review/sourceManifestExporter.ts'
  ];

  return `================================================================================
MAVIS SOURCE FILE MANIFEST
================================================================================
Verified Source Files Count: ${files.length}

${files.map((f: string, i: number) => `${(i + 1).toString().padStart(2, '0')}. ${f}`).join('\n')}
`;
}

export function exportComponentMap(staticBaseline: any): any[] {
  return [
    {
      name: 'App',
      path: 'src/App.tsx',
      type: 'Coordinator / Router / Layout Shell',
      purpose: 'Hosts global state, IndexedDB initialization, navigation routing, theme toggle, and Diagnostic Breaker Panel.'
    },
    {
      name: 'FlightRadar',
      path: 'src/components/FlightRadar.tsx',
      type: 'Interactive Map Canvas',
      purpose: 'Renders dynamic airport hubs (DPS, SUB, CGK, etc.), active flight trajectories, radar sweeps, and live flight list.'
    },
    {
      name: 'QuickAccessPanel',
      path: 'src/components/QuickAccessPanel.tsx',
      type: 'Authentication / Launcher Drawer',
      purpose: 'Provides role switching cards for SFA, Operations, Station Agent, and HQ Auditor.'
    },
    {
      name: 'FlightOperationsPage',
      path: 'src/components/FlightOperationsPage.tsx',
      type: 'Operational Dispatch View',
      purpose: 'Manages leg departures, pre-flight checklists, simulator time-shifts, and APB dispatching.'
    },
    {
      name: 'FlightAttendantPortal',
      path: 'src/components/FlightAttendantPortal.tsx',
      type: 'Cabin Count Input Modal',
      purpose: 'Enables Senior Flight Attendant cabin board passenger breakdown input, replacement crew validation, and 6-digit PIN sign-off.'
    },
    {
      name: 'ManifestStationPage',
      path: 'src/components/ManifestStationPage.tsx',
      type: 'Station Audit View',
      purpose: 'Compares FA cabin board numbers with gate boarding scans, highlights discrepancies, and logs station notes.'
    },
    {
      name: 'ManifestHQPage',
      path: 'src/components/ManifestHQPage.tsx',
      type: 'HQ Final Sign-Off View',
      purpose: 'Provides authoritative audit approvals, digital seal v3 locking, and deep flight manifest inspection.'
    },
    {
      name: 'HQSalesRevenueDashboard',
      path: 'src/components/HQSalesRevenueDashboard.tsx',
      type: 'Financial Analytics Dashboard',
      purpose: 'Monitors Gross Sales, Flown Revenue, Held Revenue, Refunds, Rebookings, and passenger ticket reconciliation.'
    },
    {
      name: 'HQHistoricalDashboard',
      path: 'src/components/HQHistoricalDashboard.tsx',
      type: 'Historical Manifest Analytics',
      purpose: 'Visualizes historical flight archives, station discrepancies, carrier load factors, and long-term trends.'
    },
    {
      name: 'APBAuditTimeline',
      path: 'src/components/APBAuditTimeline.tsx',
      type: 'Append-Only Ledger Timeline',
      purpose: 'Displays chronological history of APB state changes, PIN signatures, station notes, and seal timestamps.'
    }
  ];
}

export function exportDependencyMap(): any {
  return {
    productionDependencies: {
      "react": "^19.0.1",
      "react-dom": "^19.0.1",
      "motion": "^12.23.24",
      "lucide-react": "^0.546.0",
      "d3": "^7.9.0",
      "recharts": "^3.10.1",
      "jszip": "^3.10.1",
      "express": "^4.21.2",
      "dotenv": "^17.2.3",
      "@google/genai": "^2.4.0"
    },
    devDependencies: {
      "typescript": "~5.8.2",
      "vite": "^6.2.3",
      "tailwindcss": "^4.1.14",
      "@tailwindcss/vite": "^4.1.14",
      "tsx": "^4.21.0",
      "esbuild": "^0.25.0"
    }
  };
}
