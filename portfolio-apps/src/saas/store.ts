/**
 * Per-product workspace storage. Data a customer puts into a trial stays on
 * their device: IndexedDB, namespaced by product and account. That keeps the
 * trial free of data-processing agreements and makes the app work offline.
 */
const DB_NAME = 'femi-suite'
const DB_VERSION = 1
const STORE = 'records'

let dbp: Promise<IDBDatabase> | null = null

function db(): Promise<IDBDatabase> {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const d = req.result
        if (!d.objectStoreNames.contains(STORE)) {
          const os = d.createObjectStore(STORE, { keyPath: 'key' })
          os.createIndex('scope', 'scope', { unique: false })
        }
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbp
}

export interface Record<T = unknown> {
  key: string
  scope: string
  collection: string
  id: string
  updatedAt: string
  value: T
}

const scopeOf = (product: string, account: string | null) => `${product}::${account ?? 'anon'}`

export async function put<T>(product: string, account: string | null, collection: string, id: string, value: T): Promise<void> {
  const d = await db()
  const scope = scopeOf(product, account)
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put({ key: `${scope}::${collection}::${id}`, scope, collection, id, updatedAt: new Date().toISOString(), value })
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function list<T>(product: string, account: string | null, collection: string): Promise<Record<T>[]> {
  const d = await db()
  const scope = scopeOf(product, account)
  return new Promise((resolve, reject) => {
    const out: Record<T>[] = []
    const tx = d.transaction(STORE, 'readonly')
    const idx = tx.objectStore(STORE).index('scope')
    const req = idx.openCursor(IDBKeyRange.only(scope))
    req.onsuccess = () => {
      const cur = req.result
      if (cur) {
        const r = cur.value as Record<T>
        if (r.collection === collection) out.push(r)
        cur.continue()
      } else {
        out.sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
        resolve(out)
      }
    }
    req.onerror = () => reject(req.error)
  })
}

export async function get<T>(product: string, account: string | null, collection: string, id: string): Promise<T | null> {
  const d = await db()
  const scope = scopeOf(product, account)
  return new Promise((resolve, reject) => {
    const tx = d.transaction(STORE, 'readonly')
    const req = tx.objectStore(STORE).get(`${scope}::${collection}::${id}`)
    req.onsuccess = () => resolve(req.result ? (req.result as Record<T>).value : null)
    req.onerror = () => reject(req.error)
  })
}

export async function remove(product: string, account: string | null, collection: string, id: string): Promise<void> {
  const d = await db()
  const scope = scopeOf(product, account)
  await new Promise<void>((resolve, reject) => {
    const tx = d.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(`${scope}::${collection}::${id}`)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/** Wipe everything this product stored for this account. */
export async function clearScope(product: string, account: string | null): Promise<number> {
  const d = await db()
  const scope = scopeOf(product, account)
  return new Promise((resolve, reject) => {
    let n = 0
    const tx = d.transaction(STORE, 'readwrite')
    const idx = tx.objectStore(STORE).index('scope')
    const req = idx.openCursor(IDBKeyRange.only(scope))
    req.onsuccess = () => {
      const cur = req.result
      if (cur) {
        cur.delete()
        n++
        cur.continue()
      } else resolve(n)
    }
    req.onerror = () => reject(req.error)
  })
}
