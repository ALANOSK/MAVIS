/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Flight, DigitalAPB } from './types';
import { generateSyntheticFlightsWithAPBs, getServiceDay } from './data';
import { validateFlight, validateAPB } from './lib/domainValidators';

const DB_NAME = 'MAVIS_DB';
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('flights')) {
        db.createObjectStore('flights', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('apbs')) {
        db.createObjectStore('apbs', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Checks if the simulated primary server/data source is available.
 * Server down modes ('CACHE_AVAILABLE' and 'NO_CACHE') prevent fresh official daily dataset regeneration.
 */
export function isPrimaryServerAvailable(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true;
  const state = window.localStorage.getItem('mavis_contingency_state');
  return !state || state === 'LIVE' || state === 'RECONCILING';
}

export async function getFlights(): Promise<Flight[]> {
  const db = await initDB();
  const currentServiceDay = getServiceDay();
  const serverAvailable = isPrimaryServerAvailable();

  return new Promise<Flight[]>((resolve, reject) => {
    const tx = db.transaction(['flights', 'apbs'], 'readonly');
    const store = tx.objectStore('flights');
    const request = store.getAll();

    request.onsuccess = async () => {
      let results = request.result as Flight[];

      // 1. Initial Seeding if database is empty
      // Fresh official dataset generation is allowed ONLY when the simulated primary server is AVAILABLE.
      if (!results || results.length === 0) {
        if (serverAvailable) {
          const { flights: seededFlights, apbs: seededApbs } = generateSyntheticFlightsWithAPBs(currentServiceDay);
          await saveAllFlights(seededFlights);
          await saveAllAPBs(seededApbs);
          resolve(seededFlights);
          return;
        } else {
          // Under outage with empty database, never fabricate replacement official data
          resolve([]);
          return;
        }
      }

      // 2. Daily Service-Day Rollover Check:
      // Fresh service-day regeneration is allowed ONLY when the simulated primary server is AVAILABLE.
      const existingDate = results[0]?.flightDate;
      if (existingDate && existingDate !== currentServiceDay) {
        if (serverAvailable) {
          const { flights: freshFlights, apbs: freshApbs } = generateSyntheticFlightsWithAPBs(currentServiceDay);
          await resetDatabaseWithData(freshFlights, freshApbs);
          resolve(freshFlights);
          return;
        } else {
          // Server is DOWN: NEVER regenerate fresh official data during outage.
          // Preserve and use existing cached records from IndexedDB.
          resolve(results);
          return;
        }
      }

      // 3. Same Day: Return existing records without resetting user workflow progress
      resolve(results);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveFlight(flight: Flight): Promise<void> {
  const validation = validateFlight(flight);
  if (!validation.valid) {
    console.error('Domain Validation Failed for Flight:', validation.errors);
    throw new Error(`Flight validation error: ${validation.errors.join('; ')}`);
  }

  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('flights', 'readwrite');
    const store = tx.objectStore('flights');
    const request = store.put(flight);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveAllFlights(flights: Flight[]): Promise<void> {
  for (const f of flights) {
    const validation = validateFlight(f);
    if (!validation.valid) {
      console.error('Domain Validation Failed for Flight in batch:', f.id, validation.errors);
      throw new Error(`Flight ${f.id} validation error: ${validation.errors.join('; ')}`);
    }
  }

  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('flights', 'readwrite');
    const store = tx.objectStore('flights');
    flights.forEach((f) => store.put(f));

    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function saveAllAPBs(apbs: DigitalAPB[]): Promise<void> {
  for (const a of apbs) {
    const validation = validateAPB(a);
    if (!validation.valid) {
      console.error('Domain Validation Failed for APB in batch:', a.id, validation.errors);
      throw new Error(`APB ${a.id} validation error: ${validation.errors.join('; ')}`);
    }
  }

  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('apbs', 'readwrite');
    const store = tx.objectStore('apbs');
    apbs.forEach((a) => store.put(a));

    tx.oncomplete = () => {
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function getAPBs(): Promise<DigitalAPB[]> {
  const db = await initDB();
  return new Promise<DigitalAPB[]>((resolve, reject) => {
    const tx = db.transaction('apbs', 'readonly');
    const store = tx.objectStore('apbs');
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result as DigitalAPB[];
      resolve(results || []);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function getAPB(id: string): Promise<DigitalAPB | undefined> {
  const db = await initDB();
  return new Promise<DigitalAPB | undefined>((resolve, reject) => {
    const tx = db.transaction('apbs', 'readonly');
    const store = tx.objectStore('apbs');
    const request = store.get(id);

    request.onsuccess = () => {
      resolve(request.result as DigitalAPB | undefined);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function saveAPB(apb: DigitalAPB): Promise<void> {
  const validation = validateAPB(apb);
  if (!validation.valid) {
    console.error('Domain Validation Failed for APB:', validation.errors);
    throw new Error(`APB validation error: ${validation.errors.join('; ')}`);
  }

  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction('apbs', 'readwrite');
    const store = tx.objectStore('apbs');
    const request = store.put(apb);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function resetDatabaseWithData(flights: Flight[], apbs: DigitalAPB[]): Promise<void> {
  const db = await initDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['flights', 'apbs'], 'readwrite');
    tx.objectStore('flights').clear();
    tx.objectStore('apbs').clear();

    tx.oncomplete = async () => {
      await saveAllFlights(flights);
      await saveAllAPBs(apbs);
      resolve();
    };

    tx.onerror = () => {
      reject(tx.error);
    };
  });
}

export async function resetDatabase(): Promise<void> {
  const currentServiceDay = getServiceDay();
  const { flights: seededFlights, apbs: seededApbs } = generateSyntheticFlightsWithAPBs(currentServiceDay);

  // Clear contingency runtime trace and state from localStorage if present
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem('mavis_contingency_trace');
    window.localStorage.removeItem('mavis_contingency_state');
  }

  await resetDatabaseWithData(seededFlights, seededApbs);
}
