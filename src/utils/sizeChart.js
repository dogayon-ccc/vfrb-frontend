// ── Philippine Standard Garment Size Chart ────────────────────────────────────
// Source: common institutional uniform sizing used by PH school/hospital suppliers.
// Measurements in centimeters. Shown as a modal from StepQuantitySize; the Studio reads size M lengths for set proportions (never shown there).
export const PH_SIZE_CHART = {
  tops: {
    label: 'Tops (Polo, Scrubs, Blouses)',
    headers: ['Size', 'Chest', 'Shoulder', 'Body Length', 'Sleeve'],
    rows: [
      ['XS',  '84–88',  '38',  '66', '19'],
      ['S',   '88–92',  '40',  '68', '20'],
      ['M',   '92–96',  '42',  '70', '21'],
      ['L',   '96–100', '44',  '72', '22'],
      ['XL',  '100–106','46',  '74', '23'],
      ['XXL', '106–112','48',  '76', '24'],
      ['3XL', '112–118','50',  '78', '25'],
    ],
    unit: 'cm',
  },
  bottoms: {
    label: 'Bottoms (Pants, Shorts, Skirts)',
    headers: ['Size', 'Waist', 'Hip', 'Length', 'Inseam'],
    rows: [
      ['XS',  '60–64',  '84–88',  '96', '70'],
      ['S',   '64–68',  '88–92',  '98', '72'],
      ['M',   '68–72',  '92–96',  '100','74'],
      ['L',   '72–76',  '96–102', '102','76'],
      ['XL',  '76–82',  '102–108','104','77'],
      ['XXL', '82–88',  '108–114','106','78'],
      ['3XL', '88–96',  '114–122','108','79'],
    ],
    unit: 'cm',
  },
};

// Length in cm of one size from the chart (tops: Body Length, bottoms: Length); null if the row or column is missing.
export function chartLengthCm(kind, size = 'M') {
  const c = PH_SIZE_CHART[kind];
  const col = c?.headers.indexOf(kind === 'tops' ? 'Body Length' : 'Length');
  const n = Number(c?.rows.find(r => r[0] === size)?.[col]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
