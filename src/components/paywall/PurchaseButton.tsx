"use client";

import { useState } from "react";
import { PurchaseModal } from "./PurchaseModal";
import { formatPeso, PRODUCTS, type ProductKey } from "@/lib/payments/products";

interface PurchaseButtonProps {
  product: ProductKey;
  isLoggedIn: boolean;
  className?: string;
}

/** Opens PurchaseModal for the given product. Used on /pricing and /account. */
export function PurchaseButton({ product, isLoggedIn, className }: PurchaseButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        Unlock — {formatPeso(PRODUCTS[product].priceCentavos)}
      </button>
      {open && <PurchaseModal product={product} isLoggedIn={isLoggedIn} onClose={() => setOpen(false)} />}
    </>
  );
}
