import Storage from "expo-sqlite/kv-store";
import { useSyncExternalStore } from "react";

import { type Filter, type Source, type SourceId, SOURCES } from "./feeds";

const STORAGE_KEY = "sourceOrder";
const DEFAULT_ORDER = Object.keys(SOURCES) as SourceId[];
const ALL_NEWS: Filter = {
  id: "all",
  name: "All News",
  systemImage: "newspaper",
};

/**
 * Reconciles a saved order with the current sources: drops ones that no longer exist and adds new
 * ones at the end, in their default order.
 */
function reconcile(saved: unknown): SourceId[] {
  const known = Array.isArray(saved)
    ? saved.filter(
        (id): id is SourceId => typeof id === "string" && id in SOURCES,
      )
    : [];
  const unique = [...new Set(known)];
  return [...unique, ...DEFAULT_ORDER.filter((id) => !unique.includes(id))];
}

function load(): SourceId[] {
  try {
    const raw = Storage.getItemSync(STORAGE_KEY);
    return reconcile(raw ? JSON.parse(raw) : null);
  } catch {
    return DEFAULT_ORDER;
  }
}

// Read synchronously at startup so the list never flashes in the default order first.
let order = load();
let sources: Source[] = order.map((id) => SOURCES[id]);
let filters: Filter[] = [ALL_NEWS, ...sources];
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Saves a new source order (from dragging in the source list or sidebar). */
export function setSourceOrder(next: SourceId[]) {
  order = reconcile(next);
  sources = order.map((id) => SOURCES[id]);
  filters = [ALL_NEWS, ...sources];
  listeners.forEach((listener) => listener());
  Storage.setItem(STORAGE_KEY, JSON.stringify(order)).catch(() => {});
}

/** Restores the default source order. */
export function resetSourceOrder() {
  setSourceOrder(DEFAULT_ORDER);
}

/** Sources in the person's chosen order. */
export function useOrderedSources(): Source[] {
  return useSyncExternalStore(subscribe, () => sources);
}

/** All News followed by the sources in the person's chosen order. */
export function useFilters(): Filter[] {
  return useSyncExternalStore(subscribe, () => filters);
}

export function isDefaultOrder(ids: readonly SourceId[]) {
  return (
    ids.length === DEFAULT_ORDER.length &&
    ids.every((id, i) => id === DEFAULT_ORDER[i])
  );
}
