import { DEFAULT_FORM, type Carrier, type SearchFormState, type VerifyResponse } from "./types";

export const SEARCH_PAGE_KEY = "cv-page";
const FORM_KEY = "cv-search-form";
const DB_NAME = "cv-desk";
const STORE = "kv";
const SESSION_KEY = "search";

export type SearchSession = {
  form: SearchFormState;
  carriers: Carrier[];
  result: VerifyResponse["meta"] | null;
};

let memory: SearchSession | null = null;

export function memorySearchSession() {
  return memory;
}

export function rememberSearchSession(session: SearchSession | null) {
  memory = session;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function saveSearchForm(form: SearchFormState) {
  try {
    window.localStorage.setItem(FORM_KEY, JSON.stringify(form));
  } catch {
    // quota
  }
}

export function loadSearchForm(): SearchFormState | null {
  try {
    const raw = window.localStorage.getItem(FORM_KEY);
    if (!raw) return null;
    return { ...DEFAULT_FORM, ...(JSON.parse(raw) as SearchFormState) };
  } catch {
    return null;
  }
}

export async function saveSearchSession(session: SearchSession) {
  memory = session;
  saveSearchForm(session.form);
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).put(session, SESSION_KEY);
    });
    db.close();
  } catch {
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    } catch {
      // quota
    }
  }
}

export async function loadSearchSession(): Promise<SearchSession | null> {
  if (memory?.carriers?.length) return memory;
  try {
    const db = await openDb();
    const stored = await new Promise<SearchSession | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(SESSION_KEY);
      request.onsuccess = () => resolve((request.result as SearchSession) || null);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (stored?.carriers) {
      memory = stored;
      return stored;
    }
  } catch {
    // fall through
  }
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return memory;
    const stored = JSON.parse(raw) as SearchSession;
    memory = stored;
    return stored;
  } catch {
    return memory;
  }
}

export async function clearSearchSession() {
  memory = null;
  try {
    window.sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(STORE).delete(SESSION_KEY);
    });
    db.close();
  } catch {
    // ignore
  }
}

export type DeskPage = "search" | "templates" | "gmail" | "recent";

export function saveDeskPage(page: DeskPage) {
  try {
    window.sessionStorage.setItem(SEARCH_PAGE_KEY, page);
  } catch {
    // ignore
  }
}

export function loadDeskPage(): DeskPage {
  try {
    const value = window.sessionStorage.getItem(SEARCH_PAGE_KEY);
    if (value === "templates" || value === "gmail" || value === "recent" || value === "search") {
      return value;
    }
    return "search";
  } catch {
    return "search";
  }
}
