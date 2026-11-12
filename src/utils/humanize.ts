// "polo_shirt" / "Left_chest" -> "Polo Shirt" / "Left Chest"
export const humanize = (v) => (v == null || v === '' ? v : String(v).replace(/[_-]+/g, ' ').replace(/(?<![\w'’])\w/g, (c) => c.toUpperCase()));
