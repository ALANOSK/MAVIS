/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { workflowsList } from '../qa/workflowDocumentation';

export function exportWorkflowMap(): any[] {
  return workflowsList.map((w) => ({
    workflowId: w.id,
    name: w.name,
    purpose: w.purpose,
    trigger: w.trigger,
    sourceOfTruth: w.sourceOfTruth,
    steps: w.mainSteps,
    decisionPoints: w.decisionPoints,
    modules: w.relatedModules,
    storage: w.storageInteraction,
    calculations: w.calculations,
    output: w.output,
    failurePoints: w.failurePoints,
    qaValidationStatus: w.qaStatus
  }));
}
