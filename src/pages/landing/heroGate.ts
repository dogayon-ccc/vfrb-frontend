// Landing hero 3D runs only on the two-column hero (>= 960px) with WebGL, without Save-Data or reduced motion; else the 2D pattern stays.
export const HERO_3D_MIN_WIDTH = 960;
export const hero3DAllowed = ({ width, saveData, calm, webgl }: any) => width >= HERO_3D_MIN_WIDTH && !saveData && !calm && !!webgl;
