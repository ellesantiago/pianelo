"use client";

import { useState } from "react";
import { PurchaseModal } from "./PurchaseModal";

interface PurchaseButtonProps {
  isLoggedIn: boolean;
  className?: string;
}

/**
 * Opens PurchaseModal for full access. Used on /pricing and /account.
 *
 * Deliberately price-less: there's more than one price now (QRPH charges
 * pesos, PayPal charges dollars), and this button is used in places that
 * don't have room to show both correctly -- the modal itself is where each
 * price is shown next to its own payment method, unambiguously.
 */
export function PurchaseButton({ isLoggedIn, className }: PurchaseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Unlock
      </button>
      {open && <PurchaseModal isLoggedIn={isLoggedIn} onClose={() => setOpen(false)} />}
    </>
  );
}
