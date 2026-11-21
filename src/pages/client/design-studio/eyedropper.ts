// Screen eyedropper (Chrome/Edge EyeDropper API). Where the browser has none, callers hide the button; the Eyedropper rail tool still samples garment parts.
export const hasScreenEyedropper = () => typeof window !== 'undefined' && 'EyeDropper' in window;
export async function pickScreenColour(): Promise<string | null> {
  try {
    const r = await new (window as any).EyeDropper().open();
    return /^#[0-9a-f]{6}$/i.test(r?.sRGBHex ?? '') ? r.sRGBHex.toLowerCase() : null;
  } catch { return null; } // Esc / cancelled
}
