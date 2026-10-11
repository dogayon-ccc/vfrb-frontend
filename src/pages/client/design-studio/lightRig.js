// The Studio's calibrated local light rig (no HDRI, no network), shared by the editable 3D view and the reference viewer so a colour
// looks the same in both. A front-facing panel receives ~1x its colour under linear tone mapping (measured dE, see logic checks).
export const LIGHT = { fill: 0.42, key: 0.85, rim: 1.0 };
export const KEY_POS = [2.5, 3.5, 4], RIM_POS = [-3, 2.5, -4];
