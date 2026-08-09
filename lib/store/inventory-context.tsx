"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from "react";
import { LocalInventoryRepository, STORAGE_KEY } from "@/lib/inventory/local-repository";
import type { AdjustRequest, InventoryRepository } from "@/lib/inventory/repository";
import type { InventorySnapshot, Item, ItemDraft } from "@/lib/inventory/types";

type Action =
  | { kind: "loaded"; snapshot: InventorySnapshot }
  | { kind: "items"; items: Item[] }
  | { kind: "snapshot"; snapshot: InventorySnapshot }
  | { kind: "failed"; message: string }
  | { kind: "dismissed" };

interface State {
  snapshot: InventorySnapshot;
  ready: boolean;
  error: string | null;
}

const EMPTY: InventorySnapshot = { items: [], suppliers: [], movements: [] };

function reducer(state: State, action: Action): State {
  switch (action.kind) {
    case "loaded":
      return { snapshot: action.snapshot, ready: true, error: null };
    case "snapshot":
      return { ...state, snapshot: action.snapshot, error: null };
    case "items":
      return { ...state, snapshot: { ...state.snapshot, items: action.items }, error: null };
    case "failed":
      return { ...state, error: action.message };
    case "dismissed":
      return { ...state, error: null };
  }
}

interface InventoryValue extends State {
  createItem: (draft: ItemDraft) => Promise<void>;
  updateItem: (id: string, patch: Partial<Omit<ItemDraft, "id">>) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  adjust: (request: AdjustRequest) => Promise<void>;
  resetToSeed: () => Promise<void>;
  dismissError: () => void;
}

const InventoryContext = createContext<InventoryValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  // Lazy state, not a ref: the repository is created once and never read during render.
  const [repository] = useState<InventoryRepository>(() => new LocalInventoryRepository());

  const [state, dispatch] = useReducer(reducer, {
    snapshot: EMPTY,
    ready: false,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    repository
      .load()
      .then((snapshot) => {
        if (!cancelled) dispatch({ kind: "loaded", snapshot });
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ kind: "failed", message: "Could not read what this browser had stored." });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const refresh = useCallback(async () => {
    const snapshot = await repository.load();
    dispatch({ kind: "snapshot", snapshot });
    // A write that only reached memory is worth saying out loud: the tab is now the only copy.
    if (!repository.isPersisting()) {
      dispatch({
        kind: "failed",
        message:
          "This browser is not storing your changes, so they will be lost when the tab closes. Storage is full, or private browsing is blocking it.",
      });
    }
  }, [repository]);

  // Another tab writing to the same storage is the only outside change this app can get.
  // Without this, a second tab keeps showing a warehouse that no longer exists.
  useEffect(() => {
    function onStorage(event: StorageEvent) {
      // A null key means the whole store was cleared.
      if (event.key !== null && event.key !== STORAGE_KEY) return;
      void refresh();
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const createItem = useCallback(
    async (draft: ItemDraft) => {
      try {
        await repository.createItem(draft);
        await refresh();
      } catch {
        dispatch({ kind: "failed", message: "Could not save the new part." });
      }
    },
    [repository, refresh],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<Omit<ItemDraft, "id">>) => {
      try {
        await repository.updateItem(id, patch);
        await refresh();
      } catch {
        dispatch({ kind: "failed", message: "Could not save your changes." });
      }
    },
    [repository, refresh],
  );

  const deleteItems = useCallback(
    async (ids: string[]) => {
      try {
        await repository.deleteItems(ids);
        await refresh();
      } catch {
        dispatch({ kind: "failed", message: "Could not delete those parts." });
      }
    },
    [repository, refresh],
  );

  const adjust = useCallback(
    async (request: AdjustRequest) => {
      try {
        await repository.adjust(request);
        await refresh();
      } catch {
        dispatch({ kind: "failed", message: "Could not record that movement." });
      }
    },
    [repository, refresh],
  );

  const resetToSeed = useCallback(async () => {
    try {
      const snapshot = await repository.reset();
      dispatch({ kind: "snapshot", snapshot });
    } catch {
      dispatch({ kind: "failed", message: "Could not restore the sample warehouse." });
    }
  }, [repository]);

  const dismissError = useCallback(() => dispatch({ kind: "dismissed" }), []);

  const value = useMemo<InventoryValue>(
    () => ({ ...state, createItem, updateItem, deleteItems, adjust, resetToSeed, dismissError }),
    [state, createItem, updateItem, deleteItems, adjust, resetToSeed, dismissError],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryValue {
  const value = useContext(InventoryContext);
  if (!value) throw new Error("useInventory must be used inside an InventoryProvider");
  return value;
}
