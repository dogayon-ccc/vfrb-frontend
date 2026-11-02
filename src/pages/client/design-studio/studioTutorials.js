// How-to tutorials: each one plays in the tour card, spotlighting the real control per step ([selector or null, title, body]).
// A step whose control is not on screen is skipped. Copy states only what the Studio does: no sizes, prices or 3D promises.
export const TUTORIALS = [
  { id: 'colour', title: 'Colour a part', summary: 'Body, collar, sleeves and trims, one at a time.', steps: [
    ['[data-tab=type]', 'Open Garment', 'Garment holds the colours, patterns and details of every part.'],
    ['.ds-stage-fit', 'Tap a part', 'Tap the body, collar or a sleeve on the garment. Its colour choices open in the panel.'],
    ['[data-tool=fill]', 'Paint bucket', 'Or pick the paint bucket (G) and tap parts to fill them with the active colour.'],
    ['[data-tool=sample]', 'Eyedropper', 'The eyedropper (I) picks a colour from the design, so trims can match the body exactly.'],
  ] },
  { id: 'logo', title: 'Add your logo', summary: 'Upload, place, resize and adjust a logo.', steps: [
    ['[data-tab=add]', 'Open Add', 'Add holds logos, text and drawing.'],
    [null, 'Upload the file', 'Choose your logo file in Add. It lands on the garment, ready to place.'],
    ['.ds-stage-fit', 'Place it', 'Drag the logo to move it; drag a corner to resize it. With Snap on it locks to the grid, the centre line and the chest line.'],
    [null, 'Adjust it', 'With the logo selected, the panel crops it, softens it with blur, changes its saturation or sets a blend mode.'],
  ] },
  { id: 'text', title: 'Add names and numbers', summary: 'School names, slogans and player numbers.', steps: [
    ['[data-tool=text]', 'Text tool', 'Choose Text (T) to add a name, slogan or number.'],
    [null, 'Edit the words', 'Type the words, then set the font, size and colour in the panel. The Garment panel says whether black or white text reads best on each part colour.'],
    ['.ds-stage-fit', 'Place it', 'Drag the text into place. Arrow keys nudge it one grid step; hold Shift for five.'],
  ] },
  { id: 'draw', title: 'Draw lines and shapes', summary: 'Pen, line, rectangle, ellipse and brush.', steps: [
    ['[data-tool=pen]', 'Pen', 'Click for corners, drag for curves; click the first point to close the shape.'],
    ['[data-tool=line]', 'Line', 'Drag a straight line. Hold Shift for 45° steps.'],
    ['[data-tool=rect],[data-tool=ellipse],[data-tool=shape]', 'Shapes', 'Drag out a rectangle or an ellipse in the active colour; hold Shift for a square or a circle.'],
    ['[data-tool=brush],[data-tool=eraser]', 'Brush and eraser', 'Draw freehand with the brush (B); the eraser (E) removes your own drawings and uploaded art, never the garment.'],
  ] },
  { id: 'layers', title: 'Arrange with layers', summary: 'Select, hide, lock and reorder items.', steps: [
    ['.ds-dock,[data-tab=layers]', 'Layers', 'Everything you placed is listed here, front-most first. Tap a row to select it.'],
    [null, 'Hide, lock, reorder', 'Use the eye to hide an item. Edit all renames, reorders, locks and sets the opacity of each item.'],
  ] },
  { id: 'precise', title: 'Place things precisely', summary: 'Grid, rulers, guides, snap and nudge.', steps: [
    ['.ds-vt', 'View toggles', 'Grid (Shift+G), rulers (R), snap and guides. They help you place things and never reach your saved design or its picture.'],
    ['.ds-stage-fit', 'Snap and nudge', 'With Snap on, a dragged item snaps to the grid and to the centre and chest lines. Arrow keys nudge one step; Shift nudges five.'],
    [null, 'Template units', 'Rulers show template units from 0 to 100, not centimetres. VFRB confirms real sizes with you.'],
  ] },
  { id: 'set', title: 'Design a full set', summary: 'Top and bottom together, ordered as one set.', steps: [
    ['.ds-piece-add,.ds-rail[data-strip],.ds-rail[data-set]', 'Add the matching piece', 'VFRB takes full sets: add the matching bottom (or top) here.'],
    ['.ds-rail-card', 'Switch pieces', 'Each piece has its own card. Tap one to edit it; Preview the set shows both together.'],
  ] },
  { id: 'views', title: 'Check front, back and 3D', summary: 'Turn the garment and preview it.', steps: [
    ['.ds-bar-view', '2D or 3D', '2D is the design VFRB produces from. Where a model exists, 3D (approx.) shows the shape; its colours and fit can differ.'],
    ['.ds-stage-fit', 'Zoom and pan', 'Z or Ctrl+scroll zooms, scrolling pans, and a double-click on the empty stage fits the garment again.'],
  ] },
  { id: 'order', title: 'Save and order', summary: 'Keep your work, then place the order.', steps: [
    ['.ds-bar-save-btn', 'Save', 'Saves the design to your account. It appears in My Designs.'],
    ['.ds-bar-primary', 'Review & order', 'Review the design, then add sizes, quantity and delivery in the order steps. VFRB reviews every order before production.'],
  ] },
];

export const tutorialById = id => TUTORIALS.find(t => t.id === id) ?? null;
