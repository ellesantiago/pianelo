"use client";

import { useState } from "react";
import { PurchaseModal } from "./PurchaseModal";
import { formatPeso, PRODUCTS } from "@/lib/payments/products";

interface PurchaseButtonProps {
  isLoggedIn: boolean;
  className?: string;
}

/** Opens PurchaseModal for full access. Used on /pricing and /account. */
export function PurchaseButton({ isLoggedIn, className }: PurchaseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Unlock — {formatPeso(PRODUCTS.full_access.priceCentavos)}
      </button>
      {open && <PurchaseModal isLoggedIn={isLoggedIn} onClose={() => setOpen(false)} />}
    </>
  );
}
