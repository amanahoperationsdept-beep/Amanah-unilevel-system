"use client";

import { useMemo, useState } from "react";

export type CatalogProduct = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  srp: number | string;
  distributor_price: number | string;
  is_active: boolean;
};

type CartLine = { product: CatalogProduct; quantity: number };
const peso = (value: number) => new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 2 }).format(value);

export function DistributorProductCatalog({ products }: { products: CatalogProduct[] }) {
  const [cart, setCart] = useState<Record<string, CartLine>>({});
  const lines = useMemo(() => Object.values(cart), [cart]);
  const total = lines.reduce((sum, line) => sum + Number(line.product.distributor_price) * line.quantity, 0);
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);

  function add(product: CatalogProduct) {
    setCart((current) => {
      const existing = current[product.id];
      return { ...current, [product.id]: { product, quantity: (existing?.quantity ?? 0) + 1 } };
    });
  }

  function changeQuantity(productId: string, quantity: number) {
    setCart((current) => {
      if (quantity <= 0) {
        const next = { ...current };
        delete next[productId];
        return next;
      }
      const existing = current[productId];
      return existing ? { ...current, [productId]: { ...existing, quantity } } : current;
    });
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_330px]">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#9a743e]">Official catalog</p><h2 className="mt-2 text-2xl font-semibold">AMANAH products</h2></div>
          <span className="rounded-full bg-stone-100 px-3 py-1.5 text-xs font-semibold text-stone-600">{products.length} active products</span>
        </div>
        {products.length === 0 ? <p className="rounded-xl bg-stone-50 p-5 text-sm text-stone-600">No active products are available right now.</p> : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {products.map((product) => {
              const price = Number(product.distributor_price);
              const validPrice = Number.isFinite(price) && price >= 0;
              return (
                <article key={product.id} className="flex flex-col rounded-xl border border-stone-200 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a743e]">{product.sku}</p>
                  <h3 className="mt-2 font-semibold">{product.name}</h3>
                  <p className="mt-1 min-h-10 text-xs leading-5 text-stone-500">{product.description || "AMANAH wellness product"}</p>
                  <div className="mt-4 flex items-end justify-between gap-2">
                    <div><p className="text-[10px] text-stone-500">Distributor price</p><p className="text-lg font-bold text-[#243c31]">{validPrice ? peso(price) : "Price unavailable"}</p></div>
                    <button type="button" disabled={!validPrice} onClick={() => add(product)} className="rounded-full bg-[#243c31] px-4 py-2 text-xs font-semibold text-white hover:bg-[#192d24] disabled:cursor-not-allowed disabled:opacity-40">Add</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
      <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Your cart</h2><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs font-semibold">{itemCount} items</span></div>
        {lines.length === 0 ? <p className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">Your cart is empty. Add products to begin.</p> : (
          <div className="mt-4 space-y-4">
            {lines.map(({ product, quantity }) => (
              <div key={product.id} className="border-b border-stone-100 pb-3">
                <div className="flex justify-between gap-3"><p className="text-sm font-medium">{product.name}</p><p className="text-sm font-semibold">{peso(Number(product.distributor_price) * quantity)}</p></div>
                <div className="mt-2 flex items-center gap-2">
                  <button type="button" aria-label={"Decrease " + product.name} onClick={() => changeQuantity(product.id, quantity - 1)} className="h-7 w-7 rounded-full border border-stone-300">−</button>
                  <span className="min-w-5 text-center text-sm">{quantity}</span>
                  <button type="button" aria-label={"Increase " + product.name} onClick={() => changeQuantity(product.id, quantity + 1)} className="h-7 w-7 rounded-full border border-stone-300">+</button>
                  <button type="button" onClick={() => changeQuantity(product.id, 0)} className="ml-auto text-xs text-rose-700">Remove</button>
                </div>
              </div>
            ))}
            <div className="flex justify-between border-t border-stone-200 pt-3 text-sm font-bold"><span>Subtotal</span><span>{peso(total)}</span></div>
          </div>
        )}
        <button type="button" disabled className="mt-5 w-full cursor-not-allowed rounded-full bg-stone-300 px-4 py-3 text-sm font-semibold text-stone-600">Checkout not enabled</button>
        <p className="mt-3 text-xs leading-5 text-stone-500">This is a temporary cart preview. No order or payment is submitted, and no inventory is changed.</p>
      </aside>
    </section>
  );
}
