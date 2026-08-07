"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react";
import { LocalInventoryRepository } from "@/lib/inventory/local-repository";
import type { AdjustRequest, InventoryRepository } from "@/lib/inventory/repository";
import type { InventorySnapshot, Item, ItemDraft } from "@/lib/inventory/types";

type Action =
  | { kind: "loaded"; snapshot: InventorySnapshot }
  | { kind: "items"; items: Item[] }
  | { kind: "snapshot"; snapshot: InventorySnapshot }
  | { kind: "failed"; message: string };

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
  }
}

interface InventoryValue extends State {
  createItem: (draft: ItemDraft) => Promise<void>;
  updateItem: (id: string, patch: Partial<ItemDraft>) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;
  adjust: (request: AdjustRequest) => Promise<void>;
  resetToSeed: () => Promise<void>;
}

const InventoryContext = createContext<InventoryValue | null>(null);

export function InventoryProvider({ children }: { children: ReactNode }) {
  const repositoryRef = useRef<InventoryRepository | null>(null);
  if (!repositoryRef.current) repositoryRef.current = new LocalInventoryRepository();
  const repository = repositoryRef.current;

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
        if (!cancelled) dispatch({ kind: "failed", message: "Could not read local inventory." });
      });
    return () => {
      cancelled = true;
    };
  }, [repository]);

  const refresh = useCallback(async () => {
    const snapshot = await repository.load();
    dispatch({ kind: "snapshot", snapshot });
  }, [repository]);

  const createItem = useCallback(
    async (draft: ItemDraft) => {
      try {
        await repository.createItem(draft);
        await refresh();
      } catch {
        dispatch({ kind: "failed", message: "Could not save the new item." });
      }
    },
    [repository, refresh],
  );

  const updateItem = useCallback(
    async (id: string, patch: Partial<ItemDraft>) => {
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
        dispatch({ kind: "failed", message: "Could not delete those items." });
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
    const snapshot = await repository.reset();
    dispatch({ kind: "snapshot", snapshot });
  }, [repository]);

  const value = useMemo<InventoryValue>(
    () => ({ ...state, createItem, updateItem, deleteItems, adjust, resetToSeed }),
    [state, createItem, updateItem, deleteItems, adjust, resetToSeed],
  );

  return <InventoryContext.Provider value={value}>{children}</InventoryContext.Provider>;
}

export function useInventory(): InventoryValue {
  const value = useContext(InventoryContext);
  if (!value) throw new Error("useInventory must be used inside an InventoryProvider");
  return value;
}
