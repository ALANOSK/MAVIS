/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { APBStatus } from '../types';

export type APBWorkflowEvent =
  | 'PREPARE'
  | 'START_FA_VERIFICATION'
  | 'FA_SUBMIT'
  | 'FO_RETURN_TO_FA'
  | 'FO_SEND_TO_SERVER'
  | 'STATION_FORWARD_TO_HQ'
  | 'STATION_CHECK_CLEAN'
  | 'STATION_RETURN_TO_FO'
  | 'HQ_RETURN_TO_STATION'
  | 'HQ_APPROVE'
  | 'HQ_COMPLETE'
  | 'FO_REWORK_SUBMIT';

export interface TransitionResult {
  ok: boolean;
  nextStatus?: APBStatus;
  error?: string;
}

// Canonical valid transitions mapping
const VALID_TRANSITIONS: Record<APBStatus, Partial<Record<APBWorkflowEvent, APBStatus>>> = {
  NOT_CREATED: {
    PREPARE: 'PREPARED',
  },
  PREPARED: {
    START_FA_VERIFICATION: 'FLIGHT_ATTENDANT_IN_PROGRESS',
    FA_SUBMIT: 'FA_SUBMITTED',
  },
  FLIGHT_ATTENDANT_IN_PROGRESS: {
    FA_SUBMIT: 'FA_SUBMITTED',
  },
  FA_SUBMITTED: {
    FO_RETURN_TO_FA: 'RETURNED_TO_FLIGHT_ATTENDANT',
    FO_SEND_TO_SERVER: 'SENT_TO_SERVER',
  },
  RETURNED_TO_FLIGHT_ATTENDANT: {
    START_FA_VERIFICATION: 'FLIGHT_ATTENDANT_IN_PROGRESS',
    FA_SUBMIT: 'FA_SUBMITTED',
  },
  RETURNED_TO_FLIGHT_OPERATIONS: {
    FO_REWORK_SUBMIT: 'SENT_TO_SERVER',
    FO_SEND_TO_SERVER: 'SENT_TO_SERVER',
    FO_RETURN_TO_FA: 'RETURNED_TO_FLIGHT_ATTENDANT',
  },
  SENT_TO_SERVER: {
    STATION_FORWARD_TO_HQ: 'PENDING_HQ_REVIEW',
    STATION_CHECK_CLEAN: 'STATION_CHECKED',
    STATION_RETURN_TO_FO: 'RETURNED_TO_FLIGHT_OPERATIONS',
    HQ_RETURN_TO_STATION: 'RETURNED_TO_MANIFEST_STATION',
    HQ_APPROVE: 'HQ_REVIEWED',
    HQ_COMPLETE: 'COMPLETED',
  },
  STATION_CHECKED: {
    STATION_FORWARD_TO_HQ: 'PENDING_HQ_REVIEW',
    STATION_RETURN_TO_FO: 'RETURNED_TO_FLIGHT_OPERATIONS',
    HQ_RETURN_TO_STATION: 'RETURNED_TO_MANIFEST_STATION',
    HQ_APPROVE: 'HQ_REVIEWED',
    HQ_COMPLETE: 'COMPLETED',
  },
  PENDING_HQ_REVIEW: {
    HQ_RETURN_TO_STATION: 'RETURNED_TO_MANIFEST_STATION',
    HQ_APPROVE: 'HQ_REVIEWED',
    HQ_COMPLETE: 'COMPLETED',
    STATION_RETURN_TO_FO: 'RETURNED_TO_FLIGHT_OPERATIONS',
  },
  RETURNED_TO_MANIFEST_STATION: {
    STATION_FORWARD_TO_HQ: 'PENDING_HQ_REVIEW',
    STATION_CHECK_CLEAN: 'STATION_CHECKED',
    STATION_RETURN_TO_FO: 'RETURNED_TO_FLIGHT_OPERATIONS',
  },
  HQ_REVIEWED: {
    HQ_COMPLETE: 'COMPLETED',
    HQ_RETURN_TO_STATION: 'RETURNED_TO_MANIFEST_STATION',
  },
  COMPLETED: {},
};

export function canTransitionAPB(currentStatus: APBStatus, event: APBWorkflowEvent): boolean {
  return !!VALID_TRANSITIONS[currentStatus]?.[event];
}

export function transitionAPB(
  currentStatus: APBStatus,
  event: APBWorkflowEvent
): TransitionResult {
  const allowedNext = VALID_TRANSITIONS[currentStatus]?.[event];
  if (!allowedNext) {
    return {
      ok: false,
      error: `Illegal APB transition: Event '${event}' is not allowed from current status '${currentStatus}'.`,
    };
  }
  return {
    ok: true,
    nextStatus: allowedNext,
  };
}
