import { useEffect, useState } from 'react';

// A blob URL for a File, revoked when the file changes or the component unmounts; null for no file.
export function useObjectUrl(file) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!file) { setUrl(null); return undefined; }
    const u = URL.createObjectURL(file); setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url;
}
