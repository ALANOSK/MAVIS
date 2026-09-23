/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import { Flight, DigitalAPB } from '../types';
import { compileStructuredQaData, convertQaJsonToText } from './qaReportCompiler';

export type ExporterState =
  | 'IDLE'
  | 'CHECKING'
  | 'GENERATING_JSON'
  | 'COMPILING_TXT'
  | 'PACKAGING_ZIP'
  | 'DOWNLOADED'
  | 'FAILED';

export async function exportQaReportZip(
  flights: Flight[],
  apbs: DigitalAPB[],
  currentRole: string | null,
  currentRoute: string,
  staticBaseline: any,
  onStateChange: (state: ExporterState) => void
): Promise<void> {
  try {
    // 1. CHECKING SYSTEM...
    onStateChange('CHECKING');
    await new Promise((resolve) => setTimeout(resolve, 600));

    // 2. GENERATING JSON...
    onStateChange('GENERATING_JSON');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const rawDate = new Date();
    const isoString = rawDate.toISOString();

    const jsonReport = compileStructuredQaData(flights, apbs, currentRole, currentRoute, staticBaseline);
    // Overwrite with absolute single-source ISO string to ensure 100% clock-alignment
    jsonReport.metadata.generatedTimestamp = isoString;

    // 3. COMPILING TXT...
    onStateChange('COMPILING_TXT');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const txtReport = convertQaJsonToText(jsonReport);

    // 4. PACKAGING ZIP...
    onStateChange('PACKAGING_ZIP');
    await new Promise((resolve) => setTimeout(resolve, 500));

    const zip = new JSZip();
    const formattedTimestamp = isoString.replace(/[:.]/g, '-').slice(0, 19);

    const jsonFilename = `MAVIS_QA_DATA_${formattedTimestamp}.json`;
    const txtFilename = `QA_README_${formattedTimestamp}.txt`;
    const zipFilename = `MAVIS_QA_REPORT_${formattedTimestamp}.zip`;

    // Add JSON stringified file and derived TXT file
    zip.file(jsonFilename, JSON.stringify(jsonReport, null, 2));
    zip.file(txtFilename, txtReport);

    // Generate the zipped blob
    const zipBlob = await zip.generateAsync({ type: 'blob' });

    // Download the blob
    const blobUrl = URL.createObjectURL(zipBlob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', blobUrl);
    downloadAnchor.setAttribute('download', zipFilename);
    document.body.appendChild(downloadAnchor);
    
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(blobUrl);

    // 5. DOWNLOADED
    onStateChange('DOWNLOADED');
  } catch (error) {
    console.error('Failed to export QA report zip:', error);
    onStateChange('FAILED');
    throw error;
  }
}
