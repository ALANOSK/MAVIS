/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Resolve __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, '..');

function analyzeCoverage() {
  console.log('Running QA Coverage Manifest analysis...');
  
  const filesToScan = [
    'src/App.tsx',
    'src/types.ts',
    'src/lib/revenueData.ts',
    'src/components/ManifestStationPage.tsx',
    'src/components/ManifestHQPage.tsx'
  ];

  const criticalKeywords = [
    'Checked-in Pax',
    'Boarded Pax',
    'Final Manifest Pax',
    'Aircraft Capacity',
    'flightNumber',
    'carrierCode',
    'Sales-Checkin Variance',
    'No-show Pax',
    'Gate No-show',
    'Manifest Variance',
    'Load Factor',
    'Gross Sales',
    'Flown Revenue',
    'Held Revenue',
    'Net Recognized Revenue',
    'Revenue Allocation'
  ];

  const coverageReport: Record<string, { present: boolean; matches: number }> = {};

  criticalKeywords.forEach(keyword => {
    coverageReport[keyword] = { present: false, matches: 0 };
  });

  filesToScan.forEach(fileName => {
    const filePath = path.join(ROOT_DIR, fileName);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      criticalKeywords.forEach(keyword => {
        const regex = new RegExp(keyword.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'gi');
        const count = (content.match(regex) || []).length;
        if (count > 0) {
          coverageReport[keyword].present = true;
          coverageReport[keyword].matches += count;
        }
      });
    }
  });

  console.log('--- Manifest & Revenue Formula Keyword Coverage ---');
  Object.entries(coverageReport).forEach(([keyword, stats]) => {
    console.log(`- "${keyword}": ${stats.present ? 'FOUND' : 'NOT FOUND'} (${stats.matches} references)`);
  });

  return coverageReport;
}

analyzeCoverage();
