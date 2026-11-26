import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { uvBakedAssetFor, assetRefFor, type UvBakedAsset, type PanelArt } from './design-studio/studioAssets';
import { colorKeys, serializeDraft, parseDraft, DRAFT_KEY } from './design-studio/pilotPanels';
import { PanelWorkspace, type PanelDetails } from './design-studio/PanelWorkspace';

// Internal diagnostic fixture (/design-studio/pilot). The main Studio mounts the same PanelWorkspace; this page only adds device-local persistence.
export default function PilotStudio() {
  const asset = useMemo(() => uvBakedAssetFor('Scrub Top', 'Short', 'male'), []);
  if (!asset) return (
    <main className="ps-gate">
      <h1>Pilot garment is not switched on</h1>
      <p>This screen needs the pilot flag in the build. Ask the VFRB team to enable it for this environment.</p>
      <Link className="ps-btn" to="/design-studio">Back to the Studio</Link>
    </main>
  );
  return <Standalone asset={asset} />;
}

function Standalone({ asset }: { asset: UvBakedAsset }) {
  const ref = useMemo(() => assetRefFor(asset)!, [asset]);
  const draft = useMemo(() => {
    let stored: string | null = null;
    try { stored = localStorage.getItem(DRAFT_KEY); } catch { /* storage blocked: start empty */ }
    return parseDraft(stored, ref, colorKeys(asset));
  }, [asset, ref]);
  const [colors, setColors] = useState<Record<string, string>>({ body: '#1B2A4A', ...(draft.draft?.colors ?? {}) });
  const [details, setDetails] = useState<PanelDetails>(draft.draft?.details ?? {});
  const notice = draft.reason === 'stale' ? 'A draft saved with an older version of this garment was not opened. Your next change replaces it.'
    : draft.reason === 'invalid' ? 'The saved draft is damaged and was not opened. Your next change replaces it.' : null;
  const initialArt = useMemo<PanelArt | null>(() => (draft.draft ? { front: draft.draft.art.front?.objects ?? [], back: draft.draft.art.back?.objects ?? [] } : null), [draft]);

  const onArt = useCallback((art: PanelArt) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(serializeDraft(ref, { colors, details, art: { front: { objects: art.front }, back: { objects: art.back } } })));
      return 'saved' as const;
    } catch { return 'full' as const; }
  }, [ref, colors, details]);

  return <PanelWorkspace asset={asset} colors={colors} setColors={setColors} details={details} setDetails={setDetails} initialArt={initialArt} onArt={onArt} persist="device" initialNotice={notice} />;
}
