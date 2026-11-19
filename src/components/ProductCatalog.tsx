import { amanahProducts } from "@/lib/products";

export default function ProductCatalog() {
  return (
    <section className="product-catalog">
      <div className="product-catalog-heading">
        <div>
          <span className="section-kicker">AMANAH PRODUCT MANAGEMENT</span>
          <h2>Product catalog</h2>
          <p>Manage the products available across the AMANAH network.</p>
        </div>
        <span className="product-count">{amanahProducts.length} products</span>
      </div>
      <div className="product-catalog-grid">
        {amanahProducts.map((product) => (
          <article className="product-catalog-card" key={product.name}>
            <div className="product-image-wrap">
              <img src={product.image} alt={product.name} loading="lazy" />
            </div>
            <div className="product-card-copy">
              <span className="product-category">{product.category}</span>
              <h3>{product.name}</h3>
              <p>{product.detail}</p>
              <div className="product-card-meta">
                <span>Price <strong>Not set</strong></span>
                <span>PV <strong>Not set</strong></span>
              </div>
            </div>
          </article>
        ))}
      </div>
      <p className="product-catalog-note">Product prices and PV values are intentionally left blank until confirmed by an authorized administrator.</p>
    </section>
  );
}
