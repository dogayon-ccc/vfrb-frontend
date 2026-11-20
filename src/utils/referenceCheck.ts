import axios from 'axios';

export interface RefCheck { verdict: 'checking' | 'accepted' | 'needs_review' | 'rejected'; reason?: string; garments: string[]; colors: string[]; unknown: string[]; override?: boolean }

const UNAVAILABLE: RefCheck = { verdict: 'needs_review', reason: 'ai_unavailable', garments: [], colors: [], unknown: [] };

export async function checkReference(file: File): Promise<RefCheck> {
  const fd = new FormData();
  fd.append('reference', file);
  try {
    const { data } = await axios.post('/api/customer/ai/validate-reference', fd, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 90000 });
    return { garments: [], colors: [], unknown: [], ...data };
  } catch {
    return UNAVAILABLE;
  }
}

export const referenceNotes = (garment: string, colors: string[]) =>
  `${garment} made from the uploaded reference.${colors.length ? ` Main colours: ${colors.join(', ')}.` : ''}`;
