import { CoverConfig } from '../components/NotionHeader';

const DB_NAME = 'jobtra_app_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_preferences';
const COVER_KEY = 'header_cover_config';
export const STORAGE_KEY_COVER = 'jobtra_notion_cover_config_v2';

/**
 * Open IndexedDB database instance
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB is not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open database'));
  });
}

/**
 * Persist cover to IndexedDB for high-capacity reliable storage
 */
export async function saveCoverToDB(cover: CoverConfig | null): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      if (cover) {
        store.put(cover, COVER_KEY);
      } else {
        store.delete(COVER_KEY);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('IndexedDB save failed, fallback will be used:', err);
  }
}

/**
 * Retrieve persisted cover from IndexedDB
 */
export async function loadCoverFromDB(): Promise<CoverConfig | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(COVER_KEY);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB read failed:', err);
    return null;
  }
}

/**
 * Save cover to localStorage with safe fallback
 */
export function saveCoverToLocalStorage(cover: CoverConfig | null): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (cover) {
      localStorage.setItem(STORAGE_KEY_COVER, JSON.stringify(cover));
    } else {
      localStorage.removeItem(STORAGE_KEY_COVER);
    }
    return true;
  } catch (err) {
    console.warn('localStorage save warning (likely quota limit):', err);
    return false;
  }
}

/**
 * Load cover from localStorage
 */
export function loadCoverFromLocalStorage(): CoverConfig | null {
  try {
    if (typeof window === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY_COVER);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Failed to parse cover from localStorage:', err);
  }
  return null;
}

/**
 * Compress and optimize uploaded cover image to high-fidelity header proportions.
 * Prevents localStorage quota errors and keeps IndexedDB snappy.
 */
export function compressAndOptimizeImage(
  file: File,
  maxWidth = 1600,
  maxHeight = 600,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        let { width, height } = img;

        // Calculate aspect-ratio preserving dimensions
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return reject(new Error('Canvas context not available'));
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to optimized JPEG dataURL (widely supported and compact)
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image for processing'));
    };

    img.src = objectUrl;
  });
}
