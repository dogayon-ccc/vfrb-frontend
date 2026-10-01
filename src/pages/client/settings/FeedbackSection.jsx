import { useState } from 'react';
import axios from 'axios';
import { Card, Button, Field } from '../../../components/ui';

// Categories mirror FeedbackController validation: bug | suggestion | other
const CATS = [['bug', 'Bug'], ['suggestion', 'Suggestion'], ['other', 'Other']];
const MAX = 2000;

export default function FeedbackSection() {
  const [category, setCategory] = useState('suggestion');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!message.trim()) { setErr('Please write your feedback first.'); return; }
    setBusy(true); setErr('');
    try {
      await axios.post('/api/customer/feedback', { category, message: message.trim() });
      setDone(true); setMessage('');
    } catch (e) {
      setErr(e.response?.data?.message ?? 'Could not send feedback. Please try again.');
    } finally { setBusy(false); }
  };

  if (done) return (
    <Card>
      <div role="status" style={{ textAlign: 'center', padding: '12px 0' }}>
        <p style={{ fontWeight: 800, fontSize: 15, margin: '0 0 6px', color: 'var(--ink)' }}>Thank you — feedback sent</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px' }}>The VFRB team will review it.</p>
        <Button variant="ghost" onClick={() => setDone(false)}>Send another</Button>
      </div>
    </Card>
  );

  return (
    <Card title="Send Feedback">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div role="radiogroup" aria-label="Feedback category" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {CATS.map(([v, l]) => (
            <button key={v} role="radio" aria-checked={category === v} onClick={() => setCategory(v)}
              style={{ minHeight: 44, padding: '0 16px', borderRadius: 99, cursor: 'pointer', fontSize: 13, fontWeight: 700,
                border: category === v ? '1.5px solid var(--teal)' : '1px solid var(--border)',
                background: category === v ? 'var(--teal-50)' : 'var(--bg-card)',
                color: category === v ? 'var(--teal)' : 'var(--text-muted)' }}>{l}</button>
          ))}
        </div>
        <Field as="textarea" label="Message" value={message} maxLength={MAX} rows={5}
          onChange={e => setMessage(e.target.value)} placeholder="Tell us what happened or what would help."/>
        <p style={{ fontSize: 11, color: 'var(--text-faint)', margin: '-8px 0 0', textAlign: 'right' }}>{message.length}/{MAX}</p>
        {err && <p role="alert" style={{ fontSize: 12, fontWeight: 700, color: 'var(--danger)', margin: 0 }}>{err}</p>}
        <Button variant="primary" fullWidth loading={busy} onClick={submit}>{err && !busy ? 'Retry' : busy ? 'Sending…' : 'Send Feedback'}</Button>
      </div>
    </Card>
  );
}
