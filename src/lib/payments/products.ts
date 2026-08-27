// Shared between client and server: the two one-time products sold once a
// user is registered (the piano itself is free -- see GatedPiano). Safe to
// import from client components since it holds no secrets, just prices.

export type ProductKey = "content_unlock" | "remove_ads";

export const PRODUCTS: Record<
  ProductKey,
  { priceCentavos: number; label: string; description: string; paymongoDescription: string }
> = {
  content_unlock: {
    priceCentavos: 14900, // ₱149.00
    label: "Letter notes + recording",
    description: "Unlock letter notes and local recording, forever.",
    paymongoDescription: "Pianelo — letter notes + recording (one-time)",
  },
  remove_ads: {
    priceCentavos: 9900, // ₱99.00
    label: "Remove ads",
    description: "No more ads, anywhere on Pianelo.",
    paymongoDescription: "Pianelo — remove ads (one-time)",
  },
};

export function isProductKey(value: unknown): value is ProductKey {
  return value === "content_unlock" || value === "remove_ads";
}

export function formatPeso(centavos: number): string {
  return `₱${(centavos / 100).toFixed(0)}`;
}
