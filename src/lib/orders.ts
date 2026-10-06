import { db } from "./store";
import { PRICING } from "./config";

/** Shared order maths — plan + add-ons − discounts, GST-inclusive (AUD). */
export function priceOrder(planId: string, addOnIds: string[], discount: number) {
  const plan = db().plans.find((p) => p.id === planId);
  const addOns = PRICING.addOns.filter((a) => addOnIds.includes(a.id));
  const base = plan?.price ?? 0;
  const addOnTotal = addOns.reduce((s, a) => s + a.price, 0);
  const subtotal = base + addOnTotal;
  const capped = Math.min(discount, subtotal);
  const total = Math.max(0, subtotal - capped);
  const gstRate = PRICING.gstRate ?? 0.1;
  return {
    plan,
    addOns,
    base,
    addOnTotal,
    subtotal,
    discount: capped,
    total,
    gst: Math.round((total - total / (1 + gstRate)) * 100) / 100,
  };
}
