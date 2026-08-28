// Shared between client and server: the one product sold once a user is
// registered (the piano itself is free -- see GatedPiano). Safe to import
// from client components since it holds no secrets, just prices.

export type ProductKey = "full_access";

export const PRODUCTS: Record<
  ProductKey,
  { priceCentavos: number; label: string; description: string; paymongoDescription: string }
> = {
  full_access: {
    priceCentavos: 14900, // ₱149.00
    label: "Full access",
    description: "Letter notes, local recording, and no ads -- forever.",
    paymongoDescription: "Pianelo — full access (one-time)",
  },
};

export function isProductKey(value: unknown): value is ProductKey {
  return value === "full_access";
}

export function formatPeso(centavos: number): string {
  return `₱${(centavos / 100).toFixed(0)}`;
}
