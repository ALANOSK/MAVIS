/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Masks passenger name according to rules:
 * Passenger: ANDI SYAHPUTRA -> ANDI S****
 */
export function sanitizePassengerName(name: string): string {
  if (!name) return 'Unknown Passenger';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '****';
  if (parts.length === 1) {
    const word = parts[0];
    if (word.length <= 4) return word + '****';
    return word.slice(0, 4) + '****';
  }
  // Multiple words
  const firstWord = parts[0];
  const secondWord = parts[1];
  const initial = secondWord.charAt(0);
  return `${firstWord} ${initial}****`;
}

/**
 * Masks PNR values according to rules:
 * PNR: AB****12
 */
export function sanitizePNR(pnr: string): string {
  if (!pnr) return '****';
  const trimmed = pnr.trim();
  if (trimmed.length <= 4) {
    return trimmed.slice(0, 2) + '****';
  }
  return trimmed.slice(0, 2) + '****' + trimmed.slice(-2);
}

/**
 * Redacts any potential credentials, API keys, passwords, or tokens in text content.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  let sanitized = text;

  // Patterns for typical secrets
  const patterns = [
    /(password|passphrase|passwd|pwd)\s*[:=]\s*["']?[a-zA-Z0-9_\-@#%^&*]+["']?/gi,
    /(api_key|apikey|api-key)\s*[:=]\s*["']?[a-zA-Z0-9_\-]+["']?/gi,
    /(secret|private_key|privatekey)\s*[:=]\s*["']?[a-zA-Z0-9_\-]+["']?/gi,
    /(bearer|token|auth_token)\s+["']?[a-zA-Z0-9_\-\.\/]+["']?/gi,
    /db_(password|user|host|credentials|port)\s*[:=]\s*["']?[a-zA-Z0-9_\-\.\/:]+["']?/gi
  ];

  patterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, (match) => {
      const parts = match.split(/[:=]/);
      if (parts.length > 1) {
        return `${parts[0]}: [REDACTED_SECURITY_CRITICAL]`;
      }
      return '[REDACTED_SECURITY_CRITICAL]';
    });
  });

  return sanitized;
}
