// Order quantity is never typed separately: standard sizing totals the size counts, custom sizing uses its one piece count.
// VFRB takes bulk orders only (OrderController: quantity_ordered min:100).
export const STD_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
export const MIN_ORDER_QTY = 100;

export const sizeTotal = sizes => STD_SIZES.reduce((a, sz) => a + (Number(sizes?.[sz]) || 0), 0);
export const orderQty = form => (form?.sizing_type === 'custom' ? Number(form.custom_qty) || 0 : sizeTotal(form?.sizes));
// Pieces still needed to reach the minimum (0 once met).
export const qtyShort = form => Math.max(0, MIN_ORDER_QTY - orderQty(form));
