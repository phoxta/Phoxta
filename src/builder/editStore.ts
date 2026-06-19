/**
 * Tiny pub/sub of the text/image slots each rendered section currently exposes.
 * EditableSection writes here when a block renders in the canvas; the side-panel
 * EditContentField (and the AI/voice context builder) read it. Keyed by block id.
 */
export type Slots = { texts: string[]; imgs: string[] };

const store = new Map<string, Slots>();
const subs = new Map<string, Set<() => void>>();

const sig = (s: Slots) => s.texts.join("") + "" + s.imgs.join("");

export function setSlots(id: string, slots: Slots): void {
  const prev = store.get(id);
  if (prev && sig(prev) === sig(slots)) return;
  store.set(id, slots);
  subs.get(id)?.forEach((fn) => fn());
}

export function getSlots(id: string): Slots | undefined {
  return store.get(id);
}

/** All detected slots, keyed by block id — sent to the AI/voice so they can edit by index. */
export function allSlots(): Record<string, Slots> {
  return Object.fromEntries(store);
}

export function subscribeSlots(id: string, fn: () => void): () => void {
  let set = subs.get(id);
  if (!set) {
    set = new Set();
    subs.set(id, set);
  }
  set.add(fn);
  return () => {
    set?.delete(fn);
  };
}
