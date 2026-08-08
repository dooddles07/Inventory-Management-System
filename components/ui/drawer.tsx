"use client";

import { Dialog } from "radix-ui";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Right-hand sheet on a Radix dialog, so focus trapping, escape and scroll locking
 * are handled properly and the panel escapes every scroll container on the page.
 */
export function Drawer({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const spring = reduced
    ? { duration: 0 }
    : ({ type: "spring", stiffness: 320, damping: 32 } as const);

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-navy-900/35"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
              />
            </Dialog.Overlay>

            <Dialog.Content asChild forceMount>
              <motion.div
                className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-line bg-surface shadow-pop outline-none"
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={spring}
              >
                <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                  <div className="min-w-0">
                    <Dialog.Title className="type-title text-[1rem] text-ink-900">
                      {title}
                    </Dialog.Title>
                    {description && (
                      <Dialog.Description className="type-data mt-0.5 text-[0.75rem] text-ink-500">
                        {description}
                      </Dialog.Description>
                    )}
                  </div>
                  <Dialog.Close
                    aria-label="Close"
                    className="-mt-1 cursor-pointer rounded-sm p-1.5 text-ink-500 transition-colors duration-150 hover:bg-blue-50 hover:text-ink-900"
                  >
                    <X size={17} strokeWidth={2} aria-hidden="true" />
                  </Dialog.Close>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>

                {footer && (
                  <div className="flex items-center justify-end gap-2 border-t border-line bg-paper px-5 py-3">
                    {footer}
                  </div>
                )}
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  body: string;
  confirmLabel: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-navy-900/35" />
        <Dialog.Content className="fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-md border border-line bg-surface p-5 shadow-pop outline-none">
          <Dialog.Title className="type-title text-[1rem] text-ink-900">{title}</Dialog.Title>
          <Dialog.Description className="mt-2 text-[0.875rem] leading-relaxed text-ink-700">
            {body}
          </Dialog.Description>
          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close className="inline-flex h-9 cursor-pointer items-center rounded-sm border border-line-strong px-4 text-[0.875rem] font-medium text-ink-900 transition-colors duration-150 hover:bg-blue-50">
              Keep it
            </Dialog.Close>
            <button
              type="button"
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className="inline-flex h-9 cursor-pointer items-center rounded-sm border border-out bg-out px-4 text-[0.875rem] font-medium text-white transition-[filter] duration-150 hover:brightness-110"
            >
              {confirmLabel}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
