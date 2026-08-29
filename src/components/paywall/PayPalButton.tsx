"use client";

import { useEffect, useRef } from "react";

const CLIENT_ID = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
const SDK_SCRIPT_ID = "paypal-sdk";

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        style?: Record<string, unknown>;
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError: (err: unknown) => void;
      }) => { render: (container: HTMLElement) => void };
    };
  }
}

interface PayPalButtonProps {
  onError: (message: string) => void;
}

/**
 * Renders PayPal's Buttons widget for the full_access purchase. Encapsulates
 * the PayPal JS SDK entirely -- PurchaseModal just drops this in and doesn't
 * need to know about script loading, createOrder/capture-order plumbing, or
 * PayPal's own callback shape.
 */
export function PayPalButton({ onError }: PayPalButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderedRef = useRef(false);

  useEffect(() => {
    if (!CLIENT_ID) return;

    function renderButtons() {
      if (!window.paypal || !containerRef.current || renderedRef.current) return;
      renderedRef.current = true;

      window.paypal
        .Buttons({
          style: { layout: "horizontal", height: 45 },
          createOrder: async () => {
            const res = await fetch("/api/payments/paypal/create-order", { method: "POST" });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Could not start checkout.");
            return json.orderId as string;
          },
          onApprove: async (data) => {
            const res = await fetch("/api/payments/paypal/capture-order", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ orderId: data.orderID }),
            });
            const json = await res.json();
            if (!res.ok || !json.hasFullAccess) {
              onError(json.error ?? "Could not confirm your payment. Please try again.");
              return;
            }
            window.location.href = "/";
          },
          onError: () => onError("PayPal ran into a problem. Please try again."),
        })
        .render(containerRef.current);
    }

    if (window.paypal) {
      renderButtons();
      return;
    }

    const existing = document.getElementById(SDK_SCRIPT_ID);
    if (existing) {
      existing.addEventListener("load", renderButtons);
      return () => existing.removeEventListener("load", renderButtons);
    }

    const script = document.createElement("script");
    script.id = SDK_SCRIPT_ID;
    script.src = `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&currency=USD&intent=capture`;
    script.addEventListener("load", renderButtons);
    document.body.appendChild(script);
    return () => script.removeEventListener("load", renderButtons);
  }, [onError]);

  if (!CLIENT_ID) return null;

  return <div ref={containerRef} />;
}
