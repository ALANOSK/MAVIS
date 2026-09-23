/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { runAllUnitTests } from '../src/qa/realUnitTests';

console.log('--------------------------------------------------');
console.log('MAVIS Automated Unit & State Machine Test Suite');
console.log('--------------------------------------------------');

const summary = runAllUnitTests();

let allPassed = true;

summary.results.forEach((test, idx) => {
  const symbol = test.passed ? '✔ PASS' : '❌ FAIL';
  console.log(`[${idx + 1}/${summary.total}] ${symbol}: ${test.testName} (${test.durationMs}ms)`);
  if (!test.passed) {
    console.error(`    Error: ${test.message}`);
    allPassed = false;
  }
});

console.log('--------------------------------------------------');
console.log(`Summary: ${summary.passed}/${summary.total} tests passed (${summary.failed} failed)`);
console.log(`Executed At: ${summary.executedAt}`);
console.log('--------------------------------------------------');

if (!allPassed) {
  process.exit(1);
} else {
  process.exit(0);
}
