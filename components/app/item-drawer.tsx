"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Barcode } from "@/components/app/barcode";
import { StatusPill } from "@/components/app/status-pill";
import { StockBar } from "@/components/app/stock-bar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Drawer } from "@/components/ui/drawer";
import { Field, Select, TextInput } from "@/components/ui/field";
import { formatMoney, formatUnits, describeBin } from "@/lib/format";
import { statusOf } from "@/lib/inventory/derive";
import { CATEGORY_NAMES } from "@/lib/inventory/seed";
import type { Item, MovementType, Supplier, UnitOfMeasure } from "@/lib/inventory/types";
import { useInventory } from "@/lib/store/inventory-context";

const UNITS: UnitOfMeasure[] = ["ea", "box", "case", "coil", "kg", "m", "pallet"];
const BIN_PATTERN = /^[A-F]-\d{2}-\d{2}$/;

const MOVEMENT_ACTIONS: Array<{ type: MovementType; label: string; sign: 1 | -1 }> = [
  { type: "receipt", label: "Receive", sign: 1 },
  { type: "issue", label: "Pick", sign: -1 },
];

interface FormState {
  name: string;
  sku: string;
  category: string;
  supplierId: string;
  uom: UnitOfMeasure;
  bin: string;
  reorderPoint: string;
  safetyStock: string;
  unitCost: string;
  openingQty: string;
}

function toForm(item: Item | null, suppliers: Supplier[]): FormState {
  return {
    name: item?.name ?? "",
    sku: item?.sku ?? "",
    category: item?.category ?? CATEGORY_NAMES[0],
    supplierId: item?.supplierId ?? suppliers[0]?.id ?? "",
    uom: item?.uom ?? "ea",
    bin: item?.bin ?? "",
    reorderPoint: String(item?.reorderPoint ?? 20),
    safetyStock: String(item?.safetyStock ?? 8),
    unitCost: ((item?.unitCost ?? 0) / 100).toFixed(2),
    openingQty: "0",
  };
}

export function ItemDrawer({
  item,
  mode,
  open,
  onOpenChange,
}: {
  item: Item | null;
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { snapshot, createItem, updateItem, deleteItems, adjust } = useInventory();
  const [form, setForm] = useState<FormState>(() => toForm(item, snapshot.suppliers));
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moveQty, setMoveQty] = useState("");
  const [moveRef, setMoveRef] = useState("");
  const [moveError, setMoveError] = useState<string | null>(null);

  // Reset when the drawer opens on a different part, adjusting state during render
  // rather than from an effect so the form never paints with the previous part's values.
  const session = `${open}:${item?.id ?? "new"}`;
  const [lastSession, setLastSession] = useState(session);
  if (session !== lastSession) {
    setLastSession(session);
    setForm(toForm(item, snapshot.suppliers));
    setErrors({});
    setMoveQty("");
    setMoveRef("");
    setMoveError(null);
  }

  const set = (patch: Partial<FormState>) => setForm((current) => ({ ...current, ...patch }));

  const skuTaken = useMemo(() => {
    const sku = form.sku.trim().toUpperCase();
    return snapshot.items.some((row) => row.sku.toUpperCase() === sku && row.id !== item?.id);
  }, [form.sku, snapshot.items, item?.id]);

  function validate(): boolean {
    const next: Partial<Record<keyof FormState, string>> = {};

    if (!form.name.trim()) next.name = "Give the part a name people will recognise.";
    if (!form.sku.trim()) next.sku = "Every part needs a SKU.";
    else if (skuTaken) next.sku = "Another part already uses this SKU.";
    if (!BIN_PATTERN.test(form.bin.trim().toUpperCase())) {
      next.bin = "Use aisle-rack-shelf, like C-04-12.";
    }
    if (Number(form.reorderPoint) < 0 || Number.isNaN(Number(form.reorderPoint))) {
      next.reorderPoint = "Enter a whole number.";
    }
    if (Number(form.unitCost) < 0 || Number.isNaN(Number(form.unitCost))) {
      next.unitCost = "Enter a cost, like 12.50.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function save() {
    if (!validate()) return;
    setSaving(true);

    const payload = {
      name: form.name.trim(),
      sku: form.sku.trim().toUpperCase(),
      category: form.category,
      supplierId: form.supplierId,
      uom: form.uom,
      bin: form.bin.trim().toUpperCase(),
      reorderPoint: Math.round(Number(form.reorderPoint)),
      safetyStock: Math.round(Number(form.safetyStock)) || 0,
      unitCost: Math.round(Number(form.unitCost) * 100),
    };

    if (mode === "create") {
      await createItem({ ...payload, qty: Math.max(0, Math.round(Number(form.openingQty)) || 0) });
    } else if (item) {
      await updateItem(item.id, payload);
    }

    setSaving(false);
    onOpenChange(false);
  }

  async function record(type: MovementType, sign: 1 | -1) {
    const amount = Math.round(Number(moveQty));
    if (!item) return;
    if (!Number.isFinite(amount) || amount <= 0) {
      setMoveError("Enter how many units to move.");
      return;
    }
    if (sign === -1 && amount > item.qty) {
      setMoveError(`Only ${formatUnits(item.qty)} on hand.`);
      return;
    }
    setMoveError(null);
    await adjust({ itemId: item.id, type, qty: amount * sign, reference: moveRef });
    setMoveQty("");
    setMoveRef("");
  }

  const current = item ? snapshot.items.find((row) => row.id === item.id) ?? item : null;

  return (
    <>
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        title={mode === "create" ? "Add a part" : (current?.name ?? "Part")}
        description={mode === "edit" && current ? `${current.sku} · ${describeBin(current.bin)}` : undefined}
        footer={
          <>
            {mode === "edit" && (
              <Button
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                className="mr-auto text-out hover:bg-out-wash hover:text-out"
              >
                <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
                Delete
              </Button>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving ? "Saving..." : mode === "create" ? "Add part" : "Save changes"}
            </Button>
          </>
        }
      >
        {mode === "edit" && current && (
          <section className="mb-6 rounded-sm border border-line bg-paper p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-ink-900">
                <span className="type-data text-[1.5rem]" data-numeric>
                  {formatUnits(current.qty)}
                </span>{" "}
                <span className="text-[0.875rem] text-ink-500">{current.uom} on hand</span>
              </p>
              <StatusPill status={statusOf(current)} />
            </div>
            <StockBar item={current} className="mt-3" />
            <p className="mt-2 text-[0.75rem] text-ink-500">
              Reorder at {formatUnits(current.reorderPoint)} &middot; worth{" "}
              {formatMoney(current.qty * current.unitCost)}
            </p>

            <div className="mt-4 space-y-3 border-t border-line pt-4">
              <div className="flex gap-2">
                <Field label="Quantity" className="w-24 shrink-0">
                  {(props) => (
                    <TextInput
                      {...props}
                      inputMode="numeric"
                      value={moveQty}
                      onChange={(event) => setMoveQty(event.target.value)}
                      placeholder="0"
                    />
                  )}
                </Field>
                <Field label="Reference" className="flex-1">
                  {(props) => (
                    <TextInput
                      {...props}
                      value={moveRef}
                      onChange={(event) => setMoveRef(event.target.value)}
                      placeholder="GRN-40218"
                    />
                  )}
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {MOVEMENT_ACTIONS.map((action) => (
                  <Button
                    key={action.type}
                    variant="outline"
                    onClick={() => void record(action.type, action.sign)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </div>
            {moveError && (
              <p role="alert" className="mt-2 text-[0.75rem] text-out">
                {moveError}
              </p>
            )}
          </section>
        )}

        <div className="space-y-4">
          <Field label="Part name" error={errors.name}>
            {(props) => (
              <TextInput
                {...props}
                value={form.name}
                onChange={(event) => set({ name: event.target.value })}
                placeholder="M8x40 Hex Bolt, Zinc"
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="SKU" error={errors.sku}>
              {(props) => (
                <TextInput
                  {...props}
                  value={form.sku}
                  onChange={(event) => set({ sku: event.target.value })}
                  placeholder="FST-1042"
                  className="type-data"
                />
              )}
            </Field>
            <Field label="Bin" hint="Aisle-rack-shelf" error={errors.bin}>
              {(props) => (
                <TextInput
                  {...props}
                  value={form.bin}
                  onChange={(event) => set({ bin: event.target.value })}
                  placeholder="C-04-12"
                  className="type-data"
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              {(props) => (
                <Select
                  {...props}
                  value={form.category}
                  onChange={(event) => set({ category: event.target.value })}
                >
                  {CATEGORY_NAMES.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <Field label="Unit">
              {(props) => (
                <Select
                  {...props}
                  value={form.uom}
                  onChange={(event) => set({ uom: event.target.value as UnitOfMeasure })}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
          </div>

          <Field label="Supplier">
            {(props) => (
              <Select
                {...props}
                value={form.supplierId}
                onChange={(event) => set({ supplierId: event.target.value })}
              >
                {snapshot.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name} ({supplier.leadTimeDays} day lead time)
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Reorder at" error={errors.reorderPoint}>
              {(props) => (
                <TextInput
                  {...props}
                  inputMode="numeric"
                  value={form.reorderPoint}
                  onChange={(event) => set({ reorderPoint: event.target.value })}
                />
              )}
            </Field>
            <Field label="Safety stock">
              {(props) => (
                <TextInput
                  {...props}
                  inputMode="numeric"
                  value={form.safetyStock}
                  onChange={(event) => set({ safetyStock: event.target.value })}
                />
              )}
            </Field>
            <Field label="Unit cost" error={errors.unitCost}>
              {(props) => (
                <TextInput
                  {...props}
                  inputMode="decimal"
                  value={form.unitCost}
                  onChange={(event) => set({ unitCost: event.target.value })}
                />
              )}
            </Field>
          </div>

          {mode === "create" && (
            <Field label="Opening quantity" hint="What is on the shelf right now">
              {(props) => (
                <TextInput
                  {...props}
                  inputMode="numeric"
                  value={form.openingQty}
                  onChange={(event) => set({ openingQty: event.target.value })}
                />
              )}
            </Field>
          )}

          {form.sku.trim() && (
            <div className="rounded-sm border border-line bg-paper px-4 py-3">
              <p className="type-meta mb-2 text-[0.625rem] text-ink-500">Shelf label</p>
              <Barcode value={form.sku.trim()} />
              <p className="type-data mt-1.5 text-center text-[0.75rem] tracking-[0.18em] text-ink-700">
                {form.sku.trim().toUpperCase()}
              </p>
            </div>
          )}
        </div>
      </Drawer>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete ${current?.name ?? "this part"}?`}
        body="The part and its movement history are removed from this browser. Reset the sample data to bring everything back."
        confirmLabel="Delete part"
        onConfirm={() => {
          if (current) void deleteItems([current.id]);
          onOpenChange(false);
        }}
      />
    </>
  );
}
