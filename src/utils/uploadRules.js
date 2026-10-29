import axios from 'axios';
import { useEffect, useState } from 'react';
import { acceptAttr, kindsLabel } from './fileCheck';

// Used only until GET /api/customer/upload-rules answers, or if it fails; the server validates either way.
export const REFERENCE_FALLBACK = { mimes: ['jpg', 'jpeg', 'png', 'pdf'], max_kb: 5120 };

// Server rule ({ mimes, max_kb }) to what the pickers need. jpeg folds into jpg; unknown mimes are dropped.
export function toPickerRules({ mimes, max_kb }) {
  const kinds = [...new Set(mimes.map((m) => (m === 'jpeg' ? 'jpg' : m)))].filter((k) => ['jpg', 'png', 'webp', 'pdf'].includes(k));
  const maxBytes = max_kb * 1024;
  return { kinds, maxBytes, accept: acceptAttr(kinds), label: `${kindsLabel(kinds)}, up to ${Math.round(maxBytes / 1048576)} MB` };
}

let pending = null;
const fetchReference = () => (pending ??= axios.get('/api/customer/upload-rules')
  .then(({ data }) => toPickerRules(data.reference))
  .catch(() => { pending = null; return null; }));

export function useReferenceRules() {
  const [rules, setRules] = useState(() => toPickerRules(REFERENCE_FALLBACK));
  useEffect(() => {
    let live = true;
    fetchReference().then((r) => { if (live && r) setRules(r); });
    return () => { live = false; };
  }, []);
  return rules;
}
