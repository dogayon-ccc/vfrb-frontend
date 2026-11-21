// Which tab the garment chip opens: a design started from a reference photo reopens on References, everything else (started from
// scratch, blank, uploaded art) on the scratch templates. The chip never sends a scratch design to the reference gallery.
export type PickerTab = 'inspiration' | 'templates';
export const pickerTabFor = (cfg: { inspirationId?: unknown } | null | undefined): PickerTab => (cfg?.inspirationId ? 'inspiration' : 'templates');
