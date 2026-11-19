"use client";

import { useMemo, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Menu, Minus, Plus, ShoppingBag, ShieldCheck, X } from "lucide-react";
import { amanahProducts } from "@/lib/products";

type PortalRole = "admin" | "distributor";

export default function PublicLanding({ onLogin }: { onLogin: (role: PortalRole) => void }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const cartItems = useMemo(
    () => amanahProducts.filter((product) => cart[product.name]).map((product) => ({ ...product, quantity: cart[product.name] ?? 0 })),
    [cart],
  );
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const add = (name: string) => setCart((current) => ({ ...current, [name]: (current[name] ?? 0) + 1 }));
  const change = (name: string, amount: number) => setCart((current) => {
    const next = { ...current };
    const quantity = (next[name] ?? 0) + amount;
    if (quantity <= 0) delete next[name];
    else next[name] = quantity;
    return next;
  });

  return (
    <main className="amanah-storefront">
      <header className="store-header">
        <div className="store-nav">
          <a className="store-brand" href="#" aria-label="AMANAH home"><span className="store-brand-mark">A</span><span>AMANAH<small>DMC NETWORK</small></span></a>
          <button className="store-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
          <nav className={menuOpen ? "store-links is-open" : "store-links"}>
            <a href="#about" onClick={() => setMenuOpen(false)}>About us</a>
            <a href="#products" onClick={() => setMenuOpen(false)}>Products</a>
            <button className="store-cart-link" onClick={() => { setCartOpen(true); setMenuOpen(false); }}><ShoppingBag size={17} /> Cart <span>{cartCount}</span></button>
            <button className="store-login" onClick={() => onLogin("distributor")}>Member login <ArrowUpRight size={16} /></button>
          </nav>
        </div>
      </header>

      <section className="store-hero">
        <div className="store-hero-copy">
          <span className="store-eyebrow"><i /> TRUST · WELLNESS · OPPORTUNITY</span>
          <h1>Live well.<br /><em>Grow with purpose.</em></h1>
          <p>Discover AMANAH products and a community built around service, integrity, and shared progress.</p>
          <div className="store-hero-actions">
            <a className="store-primary" href="#products">Explore our products <ArrowRight size={17} /></a>
            <button className="store-secondary" onClick={() => onLogin("distributor")}>Member sign in</button>
          </div>
          <div className="store-assurance"><ShieldCheck size={17} /> A community built on trust and accountability</div>
        </div>
        <div className="store-hero-visual">
          <div className="store-hero-glow" />
          <img className="store-hero-product-main" src={amanahProducts[0].image} alt="AMANAH Glutagen CEE product" />
          <img className="store-hero-product-secondary store-hero-product-left" src={amanahProducts[1].image} alt="Baskug Coffee by AMANAH" />
          <img className="store-hero-product-secondary store-hero-product-right" src={amanahProducts[2].image} alt="AMANAH Herbal Oil" />
          <div className="store-hero-stamp"><span>AMANAH</span><small>CARE · QUALITY · TRUST</small></div>
          <div className="store-hero-note">PRODUCTS FOR YOUR EVERYDAY JOURNEY</div>
        </div>
      </section>

      <section className="store-about" id="about">
        <div className="store-section-kicker">ABOUT AMANAH</div>
        <div className="store-about-grid">
          <h2>Built on trust.<br /><em>Growing together.</em></h2>
          <p>AMANAH brings people, products, and a growing member network together in one place. We believe in clear information, responsible service, and progress grounded in genuine relationships.</p>
        </div>
        <div className="store-values">
          <article><span>01</span><strong>Integrity</strong><p>Honest information and responsible business practices.</p></article>
          <article><span>02</span><strong>Community</strong><p>People supporting one another through every step.</p></article>
          <article><span>03</span><strong>Wellness</strong><p>Discover products for your everyday lifestyle.</p></article>
        </div>
      </section>

      <section className="store-products" id="products">
        <div className="store-products-heading"><div><div className="store-section-kicker">THE AMANAH COLLECTION</div><h2>Explore our <em>products.</em></h2><p>Browse the current product showcase and add items to your selection.</p></div><span>{amanahProducts.length} products</span></div>
        <div className="store-product-grid">
          {amanahProducts.map((product) => (
            <article className="store-product-card" key={product.name}>
              <div className="store-product-image"><img src={product.image} alt={product.name} loading="lazy" /></div>
              <div className="store-product-info"><span>{product.category}</span><h3>{product.name}</h3><p>{product.detail}</p><div className="store-product-bottom"><small>Price to be confirmed</small><button onClick={() => add(product.name)}><Plus size={15} /> Add to cart</button></div></div>
            </article>
          ))}
        </div>
        <p className="store-catalog-note">Prices and product values will be displayed after authorized catalog confirmation. Adding items here does not place an order.</p>
      </section>

      <section className="store-member-cta">
        <div className="store-section-kicker">AMANAH UNILEVEL SYSTEM</div>
        <h2>Your member journey,<br /><em>all in one workspace.</em></h2>
        <p>Sign in to access the dashboard assigned to your approved AMANAH account.</p>
        <button className="store-primary" onClick={() => onLogin("distributor")}>Go to member login <ArrowRight size={17} /></button>
      </section>

      <footer className="store-footer"><a className="store-brand store-brand-light" href="#"><span className="store-brand-mark">A</span><span>AMANAH<small>DMC NETWORK</small></span></a><span>© {new Date().getFullYear()} AMANAH DMC. All rights reserved.</span><span>Built on trust. Managed with care.</span></footer>

      {cartOpen && <div className="store-cart-backdrop" role="presentation" onClick={() => setCartOpen(false)}>
        <aside className="store-cart-panel" role="dialog" aria-modal="true" aria-label="Your cart" onClick={(event) => event.stopPropagation()}>
          <div className="store-cart-heading"><div><span className="store-section-kicker">YOUR SELECTION</span><h2>Shopping cart ({cartCount})</h2></div><button onClick={() => setCartOpen(false)} aria-label="Close cart"><X /></button></div>
          {cartItems.length === 0 ? <div className="store-cart-empty"><ShoppingBag size={30} /><strong>Your cart is empty</strong><p>Add products from the catalogue to see them here.</p><button onClick={() => setCartOpen(false)}>Browse products</button></div> : <>
            <div className="store-cart-items">{cartItems.map((item) => <div className="store-cart-item" key={item.name}><img src={item.image} alt="" /><div><strong>{item.name}</strong><small>Price to be confirmed</small><div className="store-quantity"><button onClick={() => change(item.name, -1)} aria-label={`Remove one ${item.name}`}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => change(item.name, 1)} aria-label={`Add one ${item.name}`}><Plus size={13} /></button></div></div></div>)}</div>
            <div className="store-cart-disclaimer"><Check size={16} /> Your selection is saved in this page session only. No order or payment is submitted.</div>
            <button className="store-checkout-disabled" disabled>Checkout unavailable — prices not confirmed</button>
          </>}
        </aside>
      </div>}
    </main>
  );
}
