// Shared between client and server: the one product sold once a user is
// registered (the piano itself is free -- see GatedPiano). Safe to import
// from client components since it holds no secrets, just prices.

const DEFAULT_FULL_ACCESS_PRICE_PESOS = 149;
const DEFAULT_FULL_ACCESS_PRICE_USD = 3;

// NEXT_PUBLIC_ so the same price shows client- and server-side (the
// checkout/create-order routes charge this exact amount) without drifting.
function centsFromEnv(envValue: string | undefined, fallbackUnits: number): number {
  const units = Number(envValue);
  return Number.isFinite(units) && units > 0 ? Math.round(units * 100) : fallbackUnits * 100;
}

export type ProductKey = "full_access";

export const PRODUCTS: Record<
  ProductKey,
  {
    priceCentavos: number;
    priceUsdCents: number;
    label: string;
    description: string;
    checkoutDescription: string;
  }
> = {
  full_access: {
    priceCentavos: centsFromEnv(
      process.env.NEXT_PUBLIC_FULL_ACCESS_PRICE_PESOS,
      DEFAULT_FULL_ACCESS_PRICE_PESOS
    ),
    priceUsdCents: centsFromEnv(
      process.env.NEXT_PUBLIC_FULL_ACCESS_PRICE_USD,
      DEFAULT_FULL_ACCESS_PRICE_USD
    ),
    label: "Full access",
    description: "Letter notes, local recording, and no ads -- forever.",
    checkoutDescription: "Pianelo — full access (one-time)",
  },
};

export function isProductKey(value: unknown): value is ProductKey {
  return value === "full_access";
}

export function formatPeso(centavos: number): string {
  return `₱${(centavos / 100).toFixed(0)}`;
}

export function formatUsd(cents: number): string {
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}
