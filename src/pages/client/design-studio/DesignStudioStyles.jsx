export default function DesignStudioStyles() {
  return (
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      @keyframes dspin{to{transform:rotate(360deg)}}
      @keyframes aiPulse{0%,100%{opacity:0}50%{opacity:1}}
      body{background:var(--bg);overflow:hidden;}

      .ds{
        --ds-nav-h:56px;
        --ds-inset:env(safe-area-inset-bottom,0px);
        --ds-sheet-h:min(46dvh,22rem);
        --ds-pad-b:0px;
        width:100%;height:100dvh;display:flex;flex-direction:column;overflow:hidden;
        background:var(--bg);color:var(--ink);
        font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;
      }
      .ds button:focus-visible{outline:2px solid var(--teal);outline-offset:2px;}

      .ds-bar{
        height:52px;flex-shrink:0;display:flex;align-items:center;padding:0 14px;gap:10px;
        background:var(--bg-card);border-bottom:1px solid var(--border);z-index:20;
      }
      .ds-body{flex:1;display:flex;overflow:hidden;min-height:0;}

      .ds-strip{
        width:56px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;
        padding:12px 0;overflow-y:auto;background:var(--bg-card);border-right:1px solid var(--border);
      }
      .ds-tool-btn{
        width:48px;min-height:48px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;
        border:1px solid transparent;border-radius:var(--r-md);background:transparent;color:var(--text-subtle);
        cursor:pointer;transition:background .14s,border-color .14s;
      }
      .ds-tool-btn span{font-size:var(--text-2xs);font-weight:600;line-height:1;}
      .ds-tool-btn:hover{background:var(--bg-surface);}
      .ds-tool-btn[aria-pressed="true"],.ds-tool-btn[aria-expanded="true"]{
        background:var(--teal-50);border-color:var(--teal);color:var(--teal-dark);
      }
      .ds-more-btn{display:none;}

      .ds-panel{
        width:224px;flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;
        background:var(--bg-card);border-right:1px solid var(--border);
      }
      .ds-panel-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;}
      .ds-sheet-head{
        display:none;align-items:center;justify-content:space-between;flex-shrink:0;
        padding:0 6px 0 16px;border-bottom:1px solid var(--border);
      }
      .ds-sheet-head h2{font-size:var(--text-xs);font-weight:700;color:var(--ink);}
      .ds-sheet-close{
        width:44px;height:44px;display:flex;align-items:center;justify-content:center;
        border:0;border-radius:var(--r-md);background:transparent;color:var(--text-muted);cursor:pointer;
      }
      .ds-more-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;padding:12px;overflow-y:auto;}
      .ds-more-item{
        min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
        border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-card);color:var(--ink);
        font-size:var(--text-xs);font-weight:600;cursor:pointer;
      }

      .ds-cv{
        flex:1;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;
        background:var(--bg-surface);
      }
      .ds-pane{position:absolute;top:0;left:0;right:0;bottom:var(--ds-pad-b);}
      .ds-zoom,.ds-face{
        position:absolute;z-index:2;display:flex;gap:3px;padding:3px;
        border-radius:var(--r-md);background:var(--bg-card);border:1px solid var(--border);
      }
      .ds-zoom{top:14px;left:14px;}
      .ds-face,.ds-selbar{left:0;right:0;margin-inline:auto;width:max-content;}
      .ds-face{bottom:12px;}
      .ds-zoom button,.ds-face button,.ds-touch{
        min-width:32px;min-height:32px;padding:0 10px;border:0;border-radius:var(--r-sm);background:transparent;
        color:var(--ink);font-size:var(--text-xs);font-weight:700;cursor:pointer;
      }
      .ds-face button[aria-pressed="true"]{background:var(--teal);color:var(--text-on-accent);}
      .ds-selbar{
        position:absolute;z-index:3;bottom:64px;display:flex;align-items:center;gap:10px;
        padding:6px 6px 6px 14px;border-radius:var(--r-md);background:var(--bg-card);border:1px solid var(--border);
        box-shadow:var(--shadow-md);white-space:nowrap;font-size:var(--text-xs);color:var(--text-muted);
      }
      .ds-selbar button{min-height:32px;padding:0 12px;border:0;border-radius:var(--r-sm);background:var(--danger-bg);color:var(--danger-text);font-size:var(--text-xs);font-weight:700;cursor:pointer;}

      .ds-info{
        width:280px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;padding:12px;overflow-y:auto;
        background:var(--bg-card);border-left:1px solid var(--border);
      }
      .ds-sum{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;padding:12px;overflow-y:auto;}
      .ds-eyebrow{font-size:var(--text-xs);font-weight:700;color:var(--text-muted);}
      .ds-group-label{font-size:var(--text-2xs);font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin:14px 0 2px;}
      .ds-swatches{list-style:none;display:flex;flex-direction:column;gap:6px;}
      .ds-swatches li{display:flex;align-items:center;gap:8px;}
      .ds-swatch{width:24px;height:24px;flex-shrink:0;border-radius:var(--r-sm);border:1px solid var(--border-strong);}
      .ds-swatch-name{display:block;font-size:var(--text-xs);color:var(--text-muted);}
      .ds-swatch-hex{display:block;font-size:var(--text-2xs);font-weight:600;color:var(--text-subtle);font-family:ui-monospace,monospace;}
      .ds-sum-title{font-size:var(--text-sm);font-weight:700;color:var(--ink);}
      .ds-sum-sub{font-size:var(--text-xs);color:var(--text-subtle);}
      .ds-act{
        min-height:44px;display:flex;align-items:center;justify-content:center;gap:6px;padding:0 12px;
        border:1px solid var(--border-strong);border-radius:var(--r-md);background:var(--bg-card);color:var(--ink);
        font-size:var(--text-xs);font-weight:700;cursor:pointer;
      }
      .ds-act--primary{background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}

      .ds-hints{
        height:28px;flex-shrink:0;display:flex;align-items:center;gap:12px;justify-content:center;overflow:hidden;
        background:var(--bg-surface);border-top:1px solid var(--border);
      }
      .ai-pulse{
        position:absolute;inset:0;pointer-events:none;z-index:50;border-radius:var(--r-lg);
        background:color-mix(in srgb,var(--teal) 8%,transparent);border:2px solid color-mix(in srgb,var(--teal) 40%,transparent);
        animation:aiPulse .6s ease-in-out 2;
      }

      @media (min-width:768px) and (max-width:1023px){
        .ds-info{display:none;}
        .ds-panel{width:220px;}
      }
      @media (min-width:1024px){
        .ds-tool-btn[data-narrow-only]{display:none;}
      }
      @media (max-width:767px){
        .ds{--ds-pad-b:calc(var(--ds-nav-h) + var(--ds-inset));}
        .ds[data-sheet="open"]{--ds-pad-b:calc(var(--ds-nav-h) + var(--ds-inset) + var(--ds-sheet-h));}
        .ds-bar{padding:0 10px;gap:6px;}
        .ds-bar .ds-bar-date{display:none;}
        .ds-bar-name{width:76px!important;font-size:11px!important;padding:5px 7px!important;}
        .ds-strip{
          position:fixed;left:0;right:0;bottom:0;z-index:50;width:100%;
          height:calc(var(--ds-nav-h) + var(--ds-inset));padding:0 6px var(--ds-inset);
          flex-direction:row;justify-content:space-around;gap:0;overflow:hidden;
          border-right:0;border-top:1px solid var(--border);
        }
        .ds-tool-btn{flex:1;width:auto;min-width:0;height:var(--ds-nav-h);}
        .ds-tool-btn[data-group="more"]{display:none;}
        .ds-more-btn{display:flex;}
        .ds-panel{
          position:fixed;left:0;right:0;z-index:49;width:auto;height:var(--ds-sheet-h);
          bottom:calc(var(--ds-nav-h) + var(--ds-inset));
          border-right:0;border-top:1px solid var(--border);border-radius:var(--r-lg) var(--r-lg) 0 0;box-shadow:var(--shadow-lg);
          transform:translateY(calc(100% + var(--ds-nav-h)));visibility:hidden;
          transition:transform .2s ease-out,visibility 0s linear .2s;
        }
        .ds[data-sheet="open"] .ds-panel{transform:none;visibility:visible;transition:transform .2s ease-out,visibility 0s;}
        .ds-sheet-head{display:flex;}
        .ds-info,.ds-hints{display:none;}
      }
      @media (prefers-reduced-motion:reduce){
        .ds-panel{transition:none!important;}
        .ai-pulse{animation:none;}
      }
      @media (pointer:coarse){
        .ds-zoom button,.ds-face button,.ds-touch,.ds-selbar button{min-width:44px;min-height:44px;}
      }
      ::-webkit-scrollbar{width:3px;}
      ::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:2px;}
    `}</style>
  );
}
