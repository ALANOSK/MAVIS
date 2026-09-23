/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { sanitizePassengerName, sanitizePNR, sanitizeText } from '../qa/qaSanitizer';

/**
 * Sanitizes any unknown data object recursively, obscuring sensitive fields such as:
 * - Passwords, PINs, secret keys, hashes
 * - Full passenger names
 * - Full PNRs
 */
export function sanitizeReviewData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    return sanitizeText(data) as unknown as T;
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeReviewData(item)) as unknown as T;
  }

  if (typeof data === 'object') {
    const sanitizedObj: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Omit/Obscure PINs, passwords, secrets, hashes
      if (
        lowerKey.includes('pin') ||
        lowerKey.includes('password') ||
        lowerKey.includes('secret') ||
        lowerKey.includes('pinhash') ||
        lowerKey.includes('token')
      ) {
        sanitizedObj[key] = '[REDACTED_SENSITIVE_CREDENTIAL]';
      } else if (lowerKey === 'passengername' || lowerKey === 'name' && typeof value === 'string' && value.length > 3 && key.toLowerCase().includes('pax')) {
        sanitizedObj[key] = sanitizePassengerName(String(value));
      } else if (lowerKey === 'pnr') {
        sanitizedObj[key] = sanitizePNR(String(value));
      } else {
        sanitizedObj[key] = sanitizeReviewData(value);
      }
    }
    return sanitizedObj as T;
  }

  return data;
}
