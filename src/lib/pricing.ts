export type AmanahPriceRole =
  | "distributor"
  | "mobile_stockist"
  | "branch_operator"
  | "marketing_officer";

export type PositionPricedProduct = {
  srp: number | string;
  distributor_price: number | string;
  mobile_stockist_price: number | string;
  branch_operator_price: number | string;
  marketing_officer_price: number | string;
};

const PRICE_FIELD_BY_ROLE: Record<AmanahPriceRole, keyof PositionPricedProduct> = {
  distributor: "distributor_price",
  mobile_stockist: "mobile_stockist_price",
  branch_operator: "branch_operator_price",
  marketing_officer: "marketing_officer_price",
};

/**
 * Returns the official product price for a member position.
 * Admin/retail display should explicitly use the SRP field.
 * This is a selection helper only; it does not authorize checkout or write orders.
 */
export function getAmanahProductPrice(
  product: PositionPricedProduct,
  role: AmanahPriceRole | "retail",
): number {
  const field = role === "retail" ? "srp" : PRICE_FIELD_BY_ROLE[role];
  const price = Number(product[field]);

  if (!Number.isFinite(price) || price < 0) {
    throw new Error(`Invalid AMANAH price in field: ${field}`);
  }

  return price;
}
