// 2D first: Split is the default only where each half still leaves a usable panel. Kept apart so the host does not pull in the lazy workspace.
export const default2dMode = (): 'pattern' | 'split' => (window.matchMedia('(min-width: 1280px)').matches ? 'split' : 'pattern');
