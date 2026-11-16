const products = [
  {
    name: "Glutagen CEE",
    category: "Beauty & wellness",
    detail: "Glutathione, collagen and sodium ascorbate",
    image: "https://bqgxvnrgjmngezknqhsl.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_erqnc3erqnc3erqn.jpg",
    prices: ["₱600", "₱522", "₱460", "₱390", "₱366"],
  },
  {
    name: "Baskug Coffee",
    category: "Herbal coffee",
    detail: "Tongkat ali, maca and Agaricus blazei",
    image: "https://bqgxvnrgjmngezknqhsl.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_jybv4xjybv4xjybv.jpg",
    prices: ["₱450", "₱391", "₱355", "₱317", "₱279"],
  },
  {
    name: "AMANAH Herbal Oil",
    category: "Topical herbal care",
    detail: "Available in 10 ml and 60 ml bottles",
    image: "https://bqgxvnrgjmngezknqhsl.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_mjmdqumjmdqumjmd.jpg",
    prices: ["₱180", "₱156", "₱140", "₱125", "₱110"],
  },
  {
    name: "Barakah Green Coffee Mix",
    category: "Coffee & wellness",
    detail: "Green coffee blend with L-carnitine",
    image: "https://bqgxvnrgjmngezknqhsl.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_s9qnxps9qnxps9qn.jpg",
    prices: ["₱450", "₱391", "₱355", "₱317", "₱279"],
  },
  {
    name: "AMANAH Herbal Rub",
    category: "Topical herbal care",
    detail: "Cooling and soothing herbal rub",
    image: "https://bqgxvnrgjmngezknqhsl.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_toe9wxtoe9wxtoe9.jpg",
    prices: ["₱125", "₱108", "₱110", "₱90", "₱77"],
  },
  {
    name: "Serpentina",
    category: "Botanical supplement",
    detail: "Andrographis paniculata · 50 capsules",
    image: "https://bqgxvnrgjmngezknqhsl.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_ut2yd8ut2yd8ut2y.jpg",
    prices: ["₱600", "₱522", "₱460", "₱390", "₱336"],
  },
  {
    name: "Spirulina",
    category: "Nutritional supplement",
    detail: "Blue-green algae · 100 tablets",
    image: "https://bqgxvnrgjmngezknqhsl.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_vm18ixvm18ixvm18.jpg",
    prices: ["₱350", "₱304", "₱273", "₱227", "₱196"],
  },
  {
    name: "Max C Pro",
    category: "Vitamins & minerals",
    detail: "Daily vitamins, minerals and antioxidant nutrition",
    image: "https://bqgxvnrgjmngezknqhsl.supabase.co/storage/v1/object/public/products/Gemini_Generated_Image_vt2wfmvt2wfmvt2w.jpg",
    prices: ["₱1,000", "₱870", "₱800", "₱710", "₱620"],
  },
];

const priceLevels = [
  "SRP",
  "Distributor",
  "Mobile Stockist",
  "Branch Operator",
  "Marketing Officer",
];

export default function ProductCatalog() {
  return (
    <section className="product-catalog">
      <div className="product-catalog-heading">
        <div>
          <span className="section-kicker">AMANAH PRODUCT MANAGEMENT</span>
          <h2>Product catalog & price list</h2>
          <p>Reference prices for each AMANAH membership and operating level.</p>
        </div>
        <span className="product-count">{products.length} products</span>
      </div>

      <div className="product-catalog-grid">
        {products.map((product) => (
          <article className="product-catalog-card" key={product.name}>
            <div className="product-image-wrap">
              <img src={product.image} alt={product.name} loading="lazy" />
            </div>
            <div className="product-card-copy">
              <span className="product-category">{product.category}</span>
              <h3>{product.name}</h3>
              <p>{product.detail}</p>
              <div style={{ overflowX: "auto", marginTop: 16 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "7px 5px", color: "#777", fontWeight: 600 }}>Price level</th>
                      <th style={{ padding: "7px 5px", color: "#777", fontWeight: 600, textAlign: "right" }}>Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {priceLevels.map((level, index) => (
                      <tr key={level} style={{ borderTop: "1px solid #e9e6df" }}>
                        <td style={{ padding: "7px 5px", color: "#555" }}>{level}</td>
                        <td style={{ padding: "7px 5px", textAlign: "right", fontWeight: 700, color: index === 0 ? "#98713b" : "#27352d", whiteSpace: "nowrap" }}>
                          {product.prices[index]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </article>
        ))}
      </div>

      <p className="product-catalog-note">
        Price reference only. These values are currently stored in this catalog component and are not yet editable from the database or administrator controls. PV values have not been assigned.
      </p>
    </section>
  );
}
