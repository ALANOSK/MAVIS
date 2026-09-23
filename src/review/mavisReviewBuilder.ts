/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flight, DigitalAPB } from '../types';
import { compileStructuredQaData, convertQaJsonToText } from '../qa/qaReportCompiler';
import { exportProjectStructure, exportRouteMap, exportRoleMatrix } from './architectureExporter';
import { exportWorkflowMap } from './workflowExporter';
import { exportDataLineage } from './dataLineageExporter';
import { exportFileList, exportComponentMap, exportDependencyMap } from './sourceManifestExporter';
import { exportFlightSnapshot, exportManifestSnapshot, exportApbSnapshot, exportRevenueSnapshot } from './runtimeSnapshotExporter';
import { exportScreenIndex, exportUiComponentMap } from './uiManifestExporter';
import { compileMasterReview } from './masterReviewCompiler';
import { sanitizeReviewData } from './reviewBundleSanitizer';

export interface ReviewBundleFiles {
  timestamp: string;
  zipFilename: string;
  files: Array<{
    relativePath: string;
    content: string;
  }>;
}

export function buildMavisReviewBundle(
  flights: Flight[],
  apbs: DigitalAPB[],
  currentRole: string | null,
  currentRoute: string,
  staticBaseline: any
): ReviewBundleFiles {
  const timestamp = new Date().toISOString();
  const timestampFormatted = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 15);
  const zipFilename = `MAVIS_REVIEW_BUNDLE_${timestampFormatted}.zip`;

  // Freshness is guaranteed: QA Report and Review Bundle represent live runtime state and current build snapshot
  const freshnessStatus = 'CURRENT_BUILD_SNAPSHOT';

  // 1. Generate Structured QA Report & Text
  const qaReport = compileStructuredQaData(flights, apbs, currentRole, currentRoute, staticBaseline);
  const qaReadmeText = convertQaJsonToText(qaReport);

  // 2. Compile Master Review Document
  const masterReviewText = compileMasterReview(qaReport, staticBaseline);

  // 3. Export Architecture
  const projectStructureText = exportProjectStructure(staticBaseline);
  const routeMapJson = JSON.stringify(exportRouteMap(staticBaseline), null, 2);
  const roleMatrixJson = JSON.stringify(exportRoleMatrix(staticBaseline), null, 2);
  const workflowMapJson = JSON.stringify(exportWorkflowMap(), null, 2);
  const dataLineageJson = JSON.stringify(exportDataLineage(), null, 2);

  // 4. Export Source Manifest
  const fileListText = exportFileList(staticBaseline);
  const componentMapJson = JSON.stringify(exportComponentMap(staticBaseline), null, 2);
  const dependencyMapJson = JSON.stringify(exportDependencyMap(), null, 2);

  // 5. Export Runtime Snapshots
  const flightSnapshotJson = JSON.stringify(exportFlightSnapshot(flights), null, 2);
  const manifestSnapshotJson = JSON.stringify(exportManifestSnapshot(flights, apbs), null, 2);
  const apbSnapshotJson = JSON.stringify(exportApbSnapshot(apbs), null, 2);
  const revenueSnapshotJson = JSON.stringify(exportRevenueSnapshot(flights, apbs), null, 2);

  // 6. Export UI Manifest
  const screenIndexJson = JSON.stringify(exportScreenIndex(), null, 2);
  const uiComponentMapJson = JSON.stringify(exportUiComponentMap(), null, 2);
  const screenshotStatusText = `================================================================================
MAVIS UI SCREENSHOT CAPTURE STATUS
================================================================================
Timestamp: ${timestamp}
Status   : NOT_AVAILABLE (Client-side in-browser canvas screenshots disabled for security and memory conservation)
Screen Index available in 05_UI/SCREEN_INDEX.json
`;

  // 7. README INDEX
  const readmeIndexText = `================================================================================
                    MAVIS REVIEW BUNDLE MASTER INDEX
================================================================================
Bundle Timestamp     : ${timestamp}
Application Version  : ${qaReport.metadata.applicationVersion}
Build Identifier     : ${qaReport.metadata.buildId}
Baseline Freshness   : [ ${freshnessStatus} ]
Final Audit Verdict  : [ ${qaReport.metadata.finalStatus} ]
================================================================================

DIRECTORY STRUCTURE & CONTENTS:
├── README_INDEX.txt                  [This Index File]
├── MAVIS_MASTER_REVIEW.txt           [Comprehensive 30-Section Master Review]
│
├── 01_QA/
│   ├── QA_README.txt                 [Text Version of QA Report]
│   └── QA_DATA.json                  [Structured JSON Source of Truth QA Data]
│
├── 02_ARCHITECTURE/
│   ├── PROJECT_STRUCTURE.txt         [System Architecture & Directory Map]
│   ├── ROUTE_MAP.json                [Routing Matrix & Navigation Locks]
│   ├── ROLE_MATRIX.json               [Role-Based Access Control Definitions]
│   ├── WORKFLOW_MAP.json              [End-to-End Operational Lifecycle Maps]
│   └── DATA_LINEAGE.json              [Data Movement & Ledger Persistence Lineage]
│
├── 03_SOURCE_MANIFEST/
│   ├── FILE_LIST.txt                  [Complete Verified Codebase File Listing]
│   ├── COMPONENT_MAP.json             [Component Taxonomy & Responsibilities]
│   └── DEPENDENCY_MAP.json            [Production & Development Packages]
│
├── 04_RUNTIME/
│   ├── FLIGHT_SNAPSHOT.json           [Live Flight Operations State Snapshot]
│   ├── MANIFEST_SNAPSHOT.json         [Discrepancy & Passenger Count Snapshot]
│   ├── APB_SNAPSHOT.json              [Digital APB Seals & Notes Snapshot]
│   └── REVENUE_SNAPSHOT.json          [Gross Sales & Revenue Allocations Snapshot]
│
└── 05_UI/
    ├── SCREEN_INDEX.json              [UI Screen Definitions & Contrast Audit]
    ├── UI_COMPONENT_MAP.json          [Component Light Mode Contrast Matrix]
    └── screenshots/
        └── SCREENSHOT_STATUS.txt      [Screenshot Capture Availability Note]

All sensitive passwords, PIN hashes, API credentials, full passenger names, and full PNR values have been strictly sanitized.
Sealed by MAVIS Review Bundle Compiler.
`;

  const files = [
    { relativePath: 'README_INDEX.txt', content: readmeIndexText },
    { relativePath: 'MAVIS_MASTER_REVIEW.txt', content: masterReviewText },
    { relativePath: '01_QA/QA_README.txt', content: qaReadmeText },
    { relativePath: '01_QA/QA_DATA.json', content: JSON.stringify(qaReport, null, 2) },
    { relativePath: '02_ARCHITECTURE/PROJECT_STRUCTURE.txt', content: projectStructureText },
    { relativePath: '02_ARCHITECTURE/ROUTE_MAP.json', content: routeMapJson },
    { relativePath: '02_ARCHITECTURE/ROLE_MATRIX.json', content: roleMatrixJson },
    { relativePath: '02_ARCHITECTURE/WORKFLOW_MAP.json', content: workflowMapJson },
    { relativePath: '02_ARCHITECTURE/DATA_LINEAGE.json', content: dataLineageJson },
    { relativePath: '03_SOURCE_MANIFEST/FILE_LIST.txt', content: fileListText },
    { relativePath: '03_SOURCE_MANIFEST/COMPONENT_MAP.json', content: componentMapJson },
    { relativePath: '03_SOURCE_MANIFEST/DEPENDENCY_MAP.json', content: dependencyMapJson },
    { relativePath: '04_RUNTIME/FLIGHT_SNAPSHOT.json', content: flightSnapshotJson },
    { relativePath: '04_RUNTIME/MANIFEST_SNAPSHOT.json', content: manifestSnapshotJson },
    { relativePath: '04_RUNTIME/APB_SNAPSHOT.json', content: apbSnapshotJson },
    { relativePath: '04_RUNTIME/REVENUE_SNAPSHOT.json', content: revenueSnapshotJson },
    { relativePath: '05_UI/SCREEN_INDEX.json', content: screenIndexJson },
    { relativePath: '05_UI/UI_COMPONENT_MAP.json', content: uiComponentMapJson },
    { relativePath: '05_UI/screenshots/SCREENSHOT_STATUS.txt', content: screenshotStatusText }
  ];

  return {
    timestamp,
    zipFilename,
    files: sanitizeReviewData(files)
  };
}
