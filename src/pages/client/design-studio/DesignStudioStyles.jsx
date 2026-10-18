export default function DesignStudioStyles() {
  return (
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      @keyframes dspin{to{transform:rotate(360deg)}}
      @keyframes dsIn{from{opacity:0;transform:translateY(6px)}}
      @keyframes aiPulse{0%,100%{opacity:0}50%{opacity:1}}
      body{background:var(--bg);overflow:hidden;}

      .ds{
        --ds-nav-h:56px;
        --ds-inset:env(safe-area-inset-bottom,0px);
        --ds-sheet-h:clamp(12.5rem,30dvh,17rem); /* phone half sheet: ~30% so the garment keeps over half the screen */
        --ds-sheet-full:min(80dvh,40rem);
        --ds-peek:78px;
        --ds-pad-b:0px;
        --ds-sketch-line:rgba(15,23,42,.55);         /* seams over light fills; mirrored in sketchLine.js */
        --ds-sketch-line-on-dark:rgba(255,255,255,.62); /* seams over dark fills */
        --text-2xs:11px;
        width:100%;height:100dvh;display:flex;flex-direction:column;overflow:hidden;
        background:var(--cx-paper);color:var(--cx-ink);font-family:var(--cx-sans);
      }
      .ds button:focus-visible,.ds [role=button]:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}

      /* Top bar: one row at every width; undo/redo and the single 2D/3D toggle never fold away */
      .ds-bar{height:calc(56px + env(safe-area-inset-top,0px));flex-shrink:0;display:flex;align-items:center;gap:8px;padding:env(safe-area-inset-top,0px) max(12px,env(safe-area-inset-right,0px)) 0 max(12px,env(safe-area-inset-left,0px));
        background:var(--cx-card);border-bottom:1px solid var(--cx-line);z-index:var(--cx-z-bar);}
      .ds-bar-btn{min-width:40px;height:40px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;flex-shrink:0;
        border:1px solid transparent;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink-2);font:600 13px/1 var(--cx-sans);cursor:pointer;
        transition:background var(--cx-dur-1),color var(--cx-dur-1);}
      .ds-bar-btn:hover:not(:disabled){background:var(--cx-hover);color:var(--cx-ink);}
      .ds-bar-btn:disabled{color:var(--cx-line-strong);cursor:not-allowed;}
      .ds-bar-btn[aria-pressed=true],.ds-bar-btn[aria-expanded=true]{background:var(--cx-thread-tint);color:var(--cx-thread-ink);}
      .ds-bar-back{border-color:var(--cx-line);}
      .ds-bar-title{font:400 19px/1 var(--cx-serif);color:var(--cx-ink);white-space:nowrap;flex-shrink:0;}
      .ds-bar-name{width:180px;min-width:0;height:40px;padding:0 12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-paper);
        color:var(--cx-ink);font:600 13px var(--cx-sans);outline:none;flex-shrink:1;}
      .ds-bar-name:focus-visible{border-color:var(--cx-thread);box-shadow:0 0 0 3px var(--cx-thread-ring);}
      .ds-bar-name::placeholder{color:var(--cx-ink-3);}
      .ds-bar-sp{flex:1;}
      .ds-bar-group{display:flex;gap:2px;flex-shrink:0;}
      .ds-bar-view{display:flex;flex-shrink:0;gap:2px;padding:3px;border-radius:var(--cx-r-md);background:var(--cx-paper-2);}
      .ds-bar-view button{min-width:44px;height:34px;border:0;border-radius:calc(var(--cx-r-md) - 3px);background:transparent;color:var(--cx-ink-2);
        font:700 12px var(--cx-sans);cursor:pointer;transition:background var(--cx-dur-1),color var(--cx-dur-1);}
      .ds-bar-view button[aria-checked=true]{background:var(--cx-card);color:var(--cx-thread-ink);box-shadow:var(--cx-elev-0);}
      .ds-bar-view button:disabled{opacity:.55;cursor:not-allowed;}

      /* Draft offer: an in-flow strip under the bar; it pushes the stage down and never covers menus or controls */
      .ds-draft{position:relative;z-index:var(--cx-z-banner);flex-shrink:0;display:flex;align-items:center;gap:10px;min-height:52px;padding:4px 6px 4px 16px;
        background:var(--cx-thread-tint);border-bottom:1px solid var(--cx-line);color:var(--cx-ink);font-size:13px;}
      .ds-draft svg{flex-shrink:0;color:var(--cx-thread-ink);}
      .ds-draft p{flex:1;min-width:0;line-height:1.35;}
      .ds-draft-go,.ds-draft-alt{min-height:44px;padding:0 16px;border-radius:var(--cx-r-md);font:700 13px var(--cx-sans);cursor:pointer;flex-shrink:0;}
      .ds-draft-go{border:0;background:var(--cx-thread);color:var(--cx-on-thread);}
      .ds-draft-alt{border:1px solid var(--cx-line-strong);background:var(--cx-card);color:var(--cx-ink);}
      .ds-draft-x{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink-2);cursor:pointer;flex-shrink:0;}
      .ds-draft-x:hover{background:var(--cx-hover);}
      .ds-body{flex:1;display:flex;overflow:hidden;min-height:0;position:relative;}
      .ds-empty{display:flex;flex-direction:column;align-items:center;gap:6px;padding:28px 14px;text-align:center;border:1px dashed var(--border);border-radius:var(--r-lg);background:var(--bg-surface);}
      .ds-empty-icon{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--teal-50);}
      .ds-empty-title{font-size:var(--text-xs);font-weight:800;color:var(--ink);}
      .ds-empty-sub{font-size:var(--text-2xs);color:var(--text-muted);line-height:1.5;max-width:210px;}
      .ds-sheet-icon{flex-shrink:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-md);background:var(--teal-50);color:var(--teal-dark);margin-right:10px;}

      .ds-strip{
        order:1;width:72px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;gap:4px;
        padding:12px 0;overflow-y:auto;background:var(--bg-card);border-right:1px solid var(--border);
      }
      .ds-tool-btn{
        width:60px;min-height:56px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;
        border:1px solid transparent;border-radius:var(--r-md);background:transparent;color:var(--cx-ink-2);
        cursor:pointer;transition:background .14s,border-color .14s,color .14s,transform .1s;
      }
      .ds-tool-btn span{font-size:13px;font-weight:700;line-height:1;}
      .ds-tool-btn:hover{background:var(--bg-surface);color:var(--ink);}
      .ds-tool-btn:active{transform:scale(.95);}
      .ds-tool-btn[aria-pressed="true"],.ds-tool-btn[aria-expanded="true"]{
        background:var(--teal-50);border-color:var(--teal);color:var(--teal-dark);
      }
      @media (min-width:1024px){.ds-tool-btn[aria-pressed="true"]{box-shadow:inset 3px 0 0 var(--teal);}}
      .ds-more-btn{display:none;}
      .ds-tool-btn[data-tool="draw"]{margin-top:10px;}

      .ds-panel{
        --text-2xs:11px;--text-xs:12px;--text-sm:13px;
        order:3;width:clamp(300px,24vw,372px);flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;
        background:var(--bg-card);border-left:1px solid var(--border);box-shadow:var(--shadow-xs);
      }
      .ds-panel-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;}
      .ds-panel-toggle{display:none;}
      @media (min-width:1024px){
        .ds-panel{position:relative;transition:width .2s ease;}
        .ds-panel-toggle{display:flex;position:absolute;top:8px;right:8px;z-index:3;width:32px;height:32px;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-card);color:var(--text-muted);cursor:pointer;}
        .ds-panel-toggle:hover{color:var(--ink);border-color:var(--teal);}
        .ds-panel:not([data-collapsed]) .ds-sections{padding-right:44px;}
        .ds-panel[data-collapsed]{width:48px;}
        .ds-panel[data-collapsed] > :not(.ds-panel-toggle){display:none;}
        .ds-panel[data-collapsed] .ds-panel-toggle{right:7px;}
      }
      @media (min-width:1024px) and (prefers-reduced-motion:reduce){.ds-panel{transition:none;}}
      .ds-sheet-head{
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
        padding:14px 16px 12px;border-bottom:1px solid var(--border);
      }
      .ds-sheet-head h2{font-size:var(--text-sm);font-weight:800;color:var(--ink);line-height:1.2;}
      .ds-sheet-title{flex:1;min-width:0;}
      .ds-sheet-title p{margin-top:3px;font-size:var(--text-2xs);color:var(--text-muted);line-height:1.35;}
      .ds-sheet-close{
        display:none;width:44px;height:44px;align-items:center;justify-content:center;
        border:0;border-radius:var(--r-md);background:transparent;color:var(--text-muted);cursor:pointer;
      }
      .ds-more-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;padding:12px;overflow-y:auto;}
      .ds-more-item{
        min-height:64px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
        border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-card);color:var(--ink);
        font-size:var(--text-xs);font-weight:600;cursor:pointer;
      }

      /* Stage: neutral workspace with a soft pool of light behind the garment; no dot grid. Dark swaps the stage tokens only. */
      .ds-cv{order:2;flex:1;min-width:0;display:flex;flex-direction:column;position:relative;overflow:hidden;padding-bottom:var(--ds-pad-b);
        background:radial-gradient(ellipse 58% 52% at 50% 46%,var(--cx-stage-lit) 0%,var(--cx-stage) 72%);color:var(--cx-stage-ink);}
      .ds-cv[data-stage=dark]{--cx-stage:#13252c;--cx-stage-lit:#24434d;--cx-stage-ink:#f5f1e8;--cx-stage-ink-2:#d2dbdd;}
      /* Stage lanes: chips, set bar, guides and 3D notes on top; zoom, Front/Back and the stage light below; the garment fits the area between */
      .ds-lane{position:relative;z-index:var(--cx-z-stage);flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:6px 8px;padding:10px 12px 0;min-width:0;}
      .ds-lane-bottom{padding:0 12px 12px;}
      .ds-lane-top{z-index:calc(var(--cx-z-stage) + 1);} /* the Guides popover opens over the fit area */
      .ds-stage-fit{position:relative;flex:1;min-height:0;}
      .ds-set2d{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;gap:10px;padding:56px 16px 64px;background:var(--cx-stage);}
      .ds-set2d-fit{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;}
      .ds-set2d-note{margin:0;max-width:52ch;text-align:center;font-size:13px;line-height:1.5;color:var(--cx-stage-ink-2);}
      .ds-pane{position:absolute;inset:0;}
      .ds-bottombar{max-width:100%;
        display:flex;align-items:center;gap:6px;padding:4px;border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);background:var(--cx-card);box-shadow:var(--cx-elev-1);}
      .ds-zoom,.ds-face{display:flex;gap:2px;}
      .ds-face{padding-left:6px;border-left:1px solid var(--cx-line);}
      .ds-zoom button,.ds-face button{position:relative;isolation:isolate;min-width:40px;min-height:40px;padding:0 10px;display:inline-flex;align-items:center;justify-content:center;
        border:0;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink);font:700 12.5px var(--cx-sans);font-variant-numeric:tabular-nums;cursor:pointer;}
      .ds-zoom button:hover,.ds-face button:hover:not(:disabled){background:var(--cx-hover);}
      .ds-face button{min-width:64px;}
      .ds-face button[aria-pressed=true]{color:var(--cx-thread-ink);}
      .ds-zoom button[aria-pressed=true]{background:var(--cx-hover);color:var(--cx-thread-ink);}
      .ds-stage-lbl{display:none;}
      @media (min-width:1024px){
        .ds-bottombar .ds-stage-btn:has(.ds-stage-lbl){width:auto;padding:0 12px;display:inline-flex;gap:6px;font:700 12.5px var(--cx-sans);}
        .ds-stage-lbl{display:inline;}
      }
      .ds-face button:disabled{color:var(--cx-ink-3);opacity:.6;cursor:not-allowed;}
      .ds-face-pill{position:absolute;inset:0;z-index:-1;border-radius:var(--cx-r-md);background:var(--cx-thread-tint);box-shadow:inset 0 0 0 1.5px var(--cx-thread);}
      /* Floating contextual toolbar, anchored above the selection */
      .ds-ftb{position:absolute;z-index:var(--cx-z-stage);display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:2px;max-width:calc(100% - 16px);padding:4px 4px 4px 12px;white-space:nowrap;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);background:var(--cx-card);box-shadow:var(--cx-elev-2);}
      .ds-ftb-kind{margin-right:6px;font-size:13px;font-weight:700;color:var(--cx-ink-2);}
      .ds-ftb-slot{display:contents;} /* alignment: centre one element on the garment, align 2+, distribute 3+ */
      .ds-ftb button{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink);cursor:pointer;transition:background var(--cx-dur-1);}
      .ds-ftb button:hover{background:var(--cx-hover);}
      .ds-ftb .ds-ftb-danger{color:var(--danger-text);}
      .ds-ftb .ds-ftb-danger:hover{background:var(--danger-bg);}
      .ds-stage-note{max-width:100%;padding:5px 12px;border-radius:var(--cx-r-pill);background:var(--cx-ink);color:var(--cx-paper);
        font-size:13px;font-weight:700;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ds-stage-note[data-tone=warn]{background:var(--warning-text);color:var(--text-on-accent);}
      .ds-stage-hint{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:var(--cx-stage-ink-2);}
      .ds-stage-text{color:var(--cx-stage-ink-2);font-size:13px;line-height:1.6;}
      .ds-bottombar .ds-stage-btn{width:40px;height:40px;border:0;border-left:1px solid var(--cx-line);border-radius:0 var(--cx-r-md) var(--cx-r-md) 0;box-shadow:none;background:transparent;}
      .ds-bottombar .ds-stage-btn:only-child{border-left:0;border-radius:var(--cx-r-md);}
      .ds-bottombar .ds-full-btn{border-radius:0;}
      .ds-bottombar .ds-stage-btn{flex-shrink:0;}
      /* Narrow phones: zoom, Fit, Front/Back, full screen and the stage light all fit one row (no horizontal scroll), 36px+ targets */
      @media (max-width:479px){
        .ds-bottombar{gap:4px;padding:3px;}
        .ds-zoom button,.ds-face button{min-width:36px;padding:0 6px;}
        .ds-face{padding-left:4px;}
        .ds-face button{min-width:50px;}
        .ds-bottombar .ds-stage-btn{width:36px;}
      }
      /* Full screen (native) or the expanded stage (app-level fallback): the top bar steps aside so the canvas gains its height. */
      .ds[data-expanded]{height:100dvh;}
      .ds[data-expanded=app]{position:fixed;inset:0;z-index:var(--cx-z-modal);}
      .ds[data-expanded] .ds-bar{display:none;}
      .ds[data-expanded] .ds-draft{display:none;}

      /* The one garment picker (inline on the empty stage, or in the picker modal) */
      .ds-pick{display:flex;flex-direction:column;align-items:center;gap:14px;width:100%;}
      .ds-pick[data-inline]{position:absolute;inset:0;z-index:var(--cx-z-stage);overflow-y:auto;overscroll-behavior:contain;padding:10px clamp(16px,4vw,48px) 0;}
      .ds-pick[data-inline]>.ds-pick-grid:last-child,.ds-pick[data-inline]>.ds-note:last-child{margin-bottom:24px;}
      .ds-pick-head{position:sticky;top:0;z-index:2;width:100%;max-width:1040px;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 0 10px;text-align:center;background:var(--cx-stage);}
      .ds-modal .ds-pick-head{padding-top:14px;background:var(--cx-card);}
      .ds-pick-titlebar{width:100%;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:4px;}
      .ds-pick-titlebar h2{grid-column:2;}
      .ds-pick-foot{position:sticky;bottom:0;z-index:2;width:100%;max-width:1040px;display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;padding:12px 0;
        border-top:1px solid var(--cx-line);background:var(--cx-stage);}
      .ds-modal .ds-pick-foot{background:var(--cx-card);}
      .ds-pick-foot .ds-btn{min-height:44px;}
      .ds-pick-count{margin-right:auto;font-size:13px;font-weight:600;color:var(--cx-ink-2);}
      .ds-pick[data-inline] .ds-pick-count{color:var(--cx-stage-ink-2);}
      .ds-pick-past{width:100%;max-width:1040px;}
      .ds-pick-head h2{font:400 clamp(22px,3vw,30px)/1.15 var(--cx-serif);color:var(--cx-stage-ink);}
      .ds-pick-head p{font-size:14px;line-height:1.5;color:var(--cx-stage-ink-2);}
      .ds-modal .ds-pick-head h2{color:var(--cx-ink);}
      .ds-modal .ds-pick-head p{color:var(--cx-ink-2);}
      .ds-pick-tabs{display:inline-flex;gap:2px;margin-top:4px;padding:3px;border-radius:var(--cx-r-md);background:var(--cx-paper-2);}
      .ds-pick-tabs button{min-height:40px;padding:0 18px;border:0;border-radius:calc(var(--cx-r-md) - 3px);background:transparent;color:var(--cx-ink-2);font:700 13px var(--cx-sans);cursor:pointer;}
      .ds-pick-tabs button[aria-selected=true]{background:var(--cx-card);color:var(--cx-thread-ink);box-shadow:var(--cx-elev-0);}
      .ds-pick-tools{width:100%;max-width:1040px;display:flex;flex-direction:column;gap:8px;}
      .ds-pick-search{width:100%;min-height:44px;padding:0 14px;border:1px solid var(--cx-line-strong);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink);font:14px var(--cx-sans);}
      .ds-pick-search:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:1px;}
      .ds-pick-filters{border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);}
      .ds-pick-filters>summary{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 14px;cursor:pointer;list-style:none;font-size:13px;font-weight:700;color:var(--cx-ink);}
      .ds-pick-filters>summary::-webkit-details-marker{display:none;}
      .ds-pick-filters[open]{padding-bottom:10px;}
      .ds-pick-filters>.ds-btn{margin:4px 14px 0;}
      .ds-pick-frow{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:6px 14px;}
      .ds-pick-frow>span{flex:0 0 64px;font-size:13px;font-weight:700;color:var(--cx-ink-2);}
      .ds-pick .ds-chips,.ds-pick-head .ds-chips{justify-content:center;}
      .ds-pick-tools .ds-chips{justify-content:flex-start;}
      .ds-pick-legend{width:100%;max-width:1040px;display:flex;flex-wrap:wrap;align-items:center;gap:6px 14px;font-size:13px;font-weight:600;color:var(--cx-stage-ink-2);}
      .ds-modal .ds-pick-legend{color:var(--cx-ink-2);}
      .ds-pick-legend{justify-content:center;}
      .ds-pick-key{display:inline-flex;align-items:center;gap:5px;}
      .ds-pick-key-ic{width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:var(--cx-card);color:var(--cx-ink);box-shadow:var(--cx-elev-1);}
      .ds-pick-grid{list-style:none;width:100%;max-width:1040px;display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px;}
      .ds-pick-grid li{animation:cx-rise var(--cx-dur-3) var(--cx-ease) both;animation-delay:calc(var(--i,0) * var(--cx-stagger));}
      .ds-pick-card{position:relative;width:100%;height:100%;display:flex;flex-direction:column;gap:6px;padding:8px 8px 10px;border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);
        background:var(--cx-card);color:var(--cx-ink);text-align:left;cursor:pointer;box-shadow:var(--cx-elev-0);
        transition:transform var(--cx-dur-2) var(--cx-ease),box-shadow var(--cx-dur-2) var(--cx-ease),border-color var(--cx-dur-2);}
      .ds-pick-card:hover{transform:translateY(-2px);box-shadow:var(--cx-elev-1);border-color:var(--cx-line-strong);}
      .ds-pick-card[aria-pressed=true]{border-color:var(--cx-thread);box-shadow:0 0 0 2px var(--cx-thread-ring);}
      .ds-pick-card:focus-within{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-pick-img{display:grid;place-items:center;aspect-ratio:3/4;border-radius:var(--cx-r-md);background:var(--cx-paper);overflow:hidden;color:var(--cx-thread-ink);}
      .ds-pick-img img{width:100%;height:100%;object-fit:contain;}
      .ds-pick-card strong{font-size:13px;font-weight:700;line-height:1.3;}
      .ds-pick-sub{font-size:13px;font-weight:600;color:var(--cx-ink-2);line-height:1.4;}
      .ds-pick-badge{position:absolute;top:14px;right:14px;width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:var(--cx-card);color:var(--cx-ink);box-shadow:var(--cx-elev-1);}
      .ds-pick-card:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none;}
      .ds-chip-x{display:inline-flex;align-items:center;gap:5px;}
      .ds-pick-link{min-height:44px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border:0;border-radius:var(--cx-r-pill);background:transparent;color:var(--cx-thread-ink);font:700 13px var(--cx-sans);cursor:pointer;}
      .ds-pick-preview{width:100%;max-width:640px;display:grid;justify-items:center;gap:8px;text-align:center;}
      .ds-pick-preview img{max-width:100%;max-height:min(50vh,420px);object-fit:contain;border-radius:var(--cx-r-md);background:var(--cx-paper);}
      .ds-pick-preview h3{font:400 22px/1.2 var(--cx-serif);color:var(--cx-ink);}
      .ds-pick[data-inline] .ds-pick-preview h3{color:var(--cx-stage-ink);}
      .ds-pick[data-inline] .ds-pick-preview .ds-note,.ds-pick[data-inline] .ds-pick-preview .ds-pick-sub{color:var(--cx-stage-ink-2);}
      .ds-pick-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;}
      .ds-pick-actions .ds-btn{min-height:44px;}
      .ds-pick-sum{max-width:52ch;font-size:14px;line-height:1.5;color:var(--cx-ink);}
      /* "Start from scratch" step 2 and the "From reference" group of derived templates. */
      .ds-pick-steps .ds-pick-img{width:min(220px,60vw);aspect-ratio:4/5;display:grid;place-items:center;position:relative;}
      .ds-pick-steps .ds-pick-frow{justify-content:center;}
      /* Build your own: shape controls (picker step and Garment panel) */
      .ds-pick-facets{display:flex;flex-direction:column;gap:2px;margin:4px 0 8px;}
      .ds-pick-facets .ds-pick-frow{padding:4px 0;}
      .ds-pick-pair{margin:4px 0 14px;padding:12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);background:var(--cx-paper-2);}
      .ds-pick-pair h3,.ds-pick-subh{margin:0 0 4px;font-size:14px;font-weight:800;}
      .ds-pick-subh{margin:6px 0 8px;}
      .ds-pick-pairnote{margin:4px 0 12px;}
      .ds-trace-slot{position:absolute;inset:0;pointer-events:none;}
      .ds-trace{position:absolute;max-width:none;pointer-events:none;user-select:none;object-fit:contain;}
      .ds-trace[data-over]{z-index:3;mix-blend-mode:multiply;}
      .ds-trace-ctl{display:grid;gap:6px;}
      .ds-byo{display:grid;gap:6px;width:100%;}
      .ds-byo-range{padding:4px 14px;}
      .ds-byo-range output{margin-left:4px;color:var(--cx-ink);font-variant-numeric:tabular-nums;}
      .ds-byo-ends{display:flex;justify-content:space-between;font-weight:600;color:var(--cx-ink-3);}
      .ds-byo-check{display:inline-flex;align-items:center;gap:6px;min-height:36px;padding:0 8px;font-size:13px;font-weight:600;cursor:pointer;}
      .ds-byo-check input{width:18px;height:18px;accent-color:var(--teal);}
      .ds-byo-note{margin:8px 14px 0;}
      .ds-byo-stage,.ds-byo-side{display:grid;justify-items:center;gap:8px;width:100%;min-width:0;}
      .ds-byo-stage .ds-pick-img{width:min(260px,64vw);}
      .ds-byo-stage .ds-pick-img svg{width:100%;height:auto;max-height:100%;}
      @media (min-width:900px){
        .ds-pick-preview.ds-byo-steps{max-width:1040px;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);align-items:start;gap:24px;text-align:left;}
        .ds-byo-stage{position:sticky;top:0;}
        .ds-byo-stage .ds-pick-img{width:min(440px,100%);}
        .ds-byo-side{justify-items:stretch;}
        .ds-byo-side .ds-pick-frow{justify-content:flex-start;}
      }
      .ds-byo-card .ds-pick-img{color:var(--cx-thread-ink);background:var(--cx-paper-2);}
      .ds-pick-tier{display:inline-flex;align-items:center;gap:8px;text-align:left;}
      .ds-pick-tier .ds-pick-badge{position:static;flex:none;}
      .ds-pick-sec{width:100%;max-width:1040px;display:grid;gap:6px;margin-top:18px;padding-top:14px;border-top:1px dashed var(--cx-line);}
      .ds-pick-sec>h3{font:600 15px/1.3 var(--cx-sans);color:var(--cx-ink);padding:0 14px;}
      .ds-pick[data-inline] .ds-pick-sec>h3{color:var(--cx-stage-ink);}
      .ds-pick-sec>.ds-note{padding:0 14px;}
      .ds-pick[data-inline] .ds-pick-sum{color:var(--cx-stage-ink);}
      .ds-pick-status{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:6px;}
      .ds-pick-status li{padding:3px 10px;border-radius:var(--cx-r-pill);background:var(--cx-paper-2);color:var(--cx-ink-2);font-size:13px;font-weight:600;}
      /* Photo + read-only 3D reference: side by side on desktop, a Photo | 3D switch below 1024px */
      .ds-pick-preview:has(.ds-pick-media){max-width:900px;}
      .ds-pick-media{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;}
      .ds-pick-media figure{margin:0;display:flex;flex-direction:column;gap:6px;min-width:0;}
      .ds-pick-media .ds-pick-photo img{width:100%;height:min(50vh,360px);max-height:none;}
      .ds-pick-media>.ds-pick-switch{display:none;}
      .ds-ref3d-stage{position:relative;width:100%;height:min(50vh,360px);border-radius:var(--cx-r-md);overflow:hidden;background:var(--cx-paper-2);touch-action:none;}
      .ds-ref3d-skel{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;font-size:12.5px;font-weight:600;color:var(--cx-ink-2);
        background:linear-gradient(100deg,var(--cx-paper-2) 30%,var(--cx-paper) 50%,var(--cx-paper-2) 70%) 0 0/300% 100%;animation:dsSkel 1.4s var(--cx-ease) infinite;}
      .ds-ref3d-skel span{width:42%;height:58%;border-radius:40% 40% 12% 12%;background:color-mix(in srgb,var(--cx-line) 70%,transparent);}
      @keyframes dsSkel{to{background-position:-150% 0}}
      /* Try colours on the 3D reference (preview only) */
      .ds-ref-try{display:flex;flex-direction:column;align-items:stretch;gap:8px;text-align:left;}
      .ds-ref-try>.ds-btn{align-self:center;min-height:44px;}
      .ds-ref-try .ds-zones{align-items:center;margin:0;}
      .ds-ref-approx{font-size:13px;font-weight:700;color:var(--cx-ink-2);font-style:italic;}
      .ds-ref-try .ds-swatch-dots{margin:0;}
      @media (prefers-reduced-motion:reduce){.ds-ref3d-skel{animation:none;}}
      @media (max-width:1023px){
        .ds-pick-media{grid-template-columns:1fr;}
        .ds-pick-media>.ds-pick-switch{display:flex;justify-self:center;margin:0;}
        .ds-pick-media>.ds-pick-switch button{min-width:80px;min-height:44px;}
        .ds-pick-media[data-view="3d"] .ds-pick-photo,.ds-pick-media[data-view="photo"] .ds-pick-3d{display:none;}
      }
      /* Colour controls: compact named dots, custom swatch + hex */
      .ds-colors{padding:8px 10px 16px;}
      .ds-zones{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
      .ds-zone{min-height:40px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-pill);background:var(--cx-card);color:var(--cx-ink-2);font:600 12.5px var(--cx-sans);cursor:pointer;}
      .ds-zone[aria-pressed=true]{border-color:var(--cx-thread);background:var(--cx-thread-tint);color:var(--cx-thread-ink);font-weight:700;}
      .ds-zone-sw{width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 1px rgb(var(--cx-shade) / .25);}
      .ds-swatch-dots{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:2px;margin:0 0 10px;}
      .ds-custom{display:flex;align-items:center;gap:10px;}
      .ds-custom-sw{width:44px;height:44px;padding:3px;flex-shrink:0;border:1px solid var(--cx-line-strong);border-radius:50%;background:var(--cx-card);cursor:pointer;}
      .ds-custom-sw::-webkit-color-swatch-wrapper{padding:0;}
      .ds-custom-sw::-webkit-color-swatch{border:0;border-radius:50%;}
      .ds-custom-sw::-moz-color-swatch{border:0;border-radius:50%;}
      .ds-custom-hex{flex:1;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--cx-ink-2);}
      .ds-custom-hex input{flex:1;min-width:0;min-height:44px;padding:0 12px;border:1px solid var(--cx-line-strong);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink);font:600 14px ui-monospace,monospace;text-transform:uppercase;}
      .ds-custom-hex input[aria-invalid=true]{border-color:var(--danger-text);}
      .ds-h3-val{text-transform:none;letter-spacing:0;color:var(--cx-ink);}
      /* Honest label on a flat template drawing (no photo base for it) */
      .ds-sketch{display:inline-block;padding:2px 7px;border-radius:var(--cx-r-pill);background:var(--cx-paper-2);color:var(--cx-ink-2);font-size:13px;font-weight:700;letter-spacing:.02em;}
      .ds-pick-img,.ds-sketch-wrap{position:relative;}
      .ds-pick-img .ds-sketch,.ds-sketch-wrap .ds-sketch{position:absolute;left:6px;bottom:6px;}
      /* Picker modal */
      .ds-modal{position:absolute;top:64px;left:50%;z-index:var(--cx-z-modal);width:min(760px,calc(100vw - 24px));max-height:calc(100dvh - 88px);overflow-y:auto;overscroll-behavior:contain;
        padding:0 clamp(12px,3vw,24px);border:1px solid var(--cx-line);border-radius:var(--cx-r-xl);background:var(--cx-card);box-shadow:var(--cx-elev-2);}
      .ds-pick-close{grid-column:3;width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink-2);cursor:pointer;}
      .ds-pick-sec{margin:0 0 8px;font-size:13px;font-weight:800;color:var(--cx-ink);}
      /* Garment panel and panel structure */
      .ds-panel-prompt{margin:16px;padding:14px;border:1px dashed var(--cx-line-strong);border-radius:var(--cx-r-md);font-size:13px;line-height:1.5;color:var(--cx-ink-2);text-align:center;}
      .ds-tp-change{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .ds-tp-change .ds-btn{min-height:40px;}
      .ds-acc-sw{padding:4px 14px 14px;}
      .ds-acc-sw .ds-swatch-chips{margin:0;}
      .ds-dock-sub{margin:0;font-size:13px;font-weight:600;color:var(--cx-ink-2);}
      .ds-lay-empty{margin:0;font-size:12.5px;line-height:1.45;color:var(--cx-ink-2);}
      .ds-tool-btn[aria-disabled=true]{opacity:.45;cursor:not-allowed;}
      .ds-tool-btn[aria-disabled=true]:hover{background:transparent;color:var(--text-subtle);}
      .ds-artboard{transition:opacity var(--cx-dur-2) var(--cx-ease);}
      .ds-artboard[data-fading]{opacity:.35;}
      .ds-artboard[data-empty]{position:absolute!important;visibility:hidden;}
      .ds-artboard canvas{filter:drop-shadow(0 16px 24px rgb(var(--cx-shade) / .26));}
      @media (prefers-reduced-motion:reduce){.ds-pick-grid li{animation:none;}.ds-pick-card,.ds-artboard{transition:none;}.ds-pick-card:hover{transform:none;}}

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
      .ds-act:disabled{opacity:.45;cursor:not-allowed;}
      .ds-act[aria-busy="true"]:disabled{opacity:.9;cursor:progress;}
      .ds-sum-card{display:flex;align-items:center;gap:12px;padding:10px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);box-shadow:var(--shadow-xs);}
      .ds-sum-thumb{flex-shrink:0;width:72px;height:84px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-sm,8px);background:var(--bg-card);}
      .ds-swatch-row{list-style:none;display:flex;flex-wrap:wrap;gap:10px 12px;}
      .ds-swatch-row li{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:44px;}
      .ds-swatch--lg{width:32px;height:32px;border-radius:50%;box-shadow:var(--shadow-xs);}
      .ds-swatch-row .ds-swatch-name{font-size:var(--text-2xs);}
      .ds-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-act--wide{grid-column:1 / -1;}
      .ds-link-danger{min-height:36px;display:flex;align-items:center;justify-content:center;gap:5px;border:0;background:none;color:var(--text-muted);font-size:var(--text-xs);font-weight:700;cursor:pointer;border-radius:var(--r-md);transition:color .14s,background .14s;}
      .ds-link-danger:hover{color:var(--danger-text);background:var(--danger-bg);}
      .ds-jump{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;background:var(--bg-card);}
      .ds-jump button{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;border:0;border-bottom:1px solid var(--border);background:none;color:var(--ink);font-size:var(--text-xs);font-weight:700;text-align:left;cursor:pointer;transition:background .14s;}
      .ds-jump button:last-child{border-bottom:0;}
      .ds-jump button:hover{background:var(--teal-50);}
      .ds-jump button span{flex:1;}
      .ds-jump button em{font-style:normal;font-weight:600;color:var(--text-muted);}
      .ds-act--primary{background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}

      .ds-hints{
        height:28px;flex-shrink:0;display:flex;align-items:center;gap:12px;justify-content:center;overflow:hidden;
        background:var(--bg-surface);border-top:1px solid var(--border);
      }
      .ai-pulse{
        position:absolute;inset:0;pointer-events:none;z-index:var(--cx-z-stage);border-radius:var(--r-lg);
        background:color-mix(in srgb,var(--teal) 8%,transparent);border:2px solid color-mix(in srgb,var(--teal) 40%,transparent);
        animation:aiPulse .6s ease-in-out 2;
      }


      .ds-assets{display:flex;flex-direction:column;flex:1;min-height:0;}
      .ds-assets-body{flex:1;min-height:0;overflow-y:auto;padding:14px 16px 20px;}
      .ds-stack{display:flex;flex-direction:column;gap:16px;}
      .ds-h3{font-size:var(--text-2xs);font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px;}
      .ds-note{font-size:var(--text-2xs);line-height:1.45;color:var(--text-muted);margin-top:6px;}
      .ds-seg{display:flex;gap:2px;margin:12px 16px 0;padding:3px;border-radius:var(--r-md);background:var(--bg-surface);border:1px solid var(--border);}
      .ds-seg--sm{margin:0;}
      .ds-seg button{
        flex:1;min-height:32px;display:flex;align-items:center;justify-content:center;gap:5px;padding:0 6px;
        border:0;border-radius:var(--r-sm);background:transparent;color:var(--text-muted);
        font-size:var(--text-xs);font-weight:700;cursor:pointer;transition:background .14s,color .14s;
      }
      .ds-seg button:hover{color:var(--ink);}
      .ds-seg button[aria-selected="true"],.ds-seg button[aria-checked="true"]{background:var(--bg-card);color:var(--teal-dark);box-shadow:0 1px 3px rgba(15,23,42,.12);}
      .ds-chips{display:flex;flex-wrap:wrap;gap:6px;}
      .ds-chip{
        min-height:32px;padding:0 12px;border:1px solid var(--border);border-radius:99px;background:var(--bg-card);
        color:var(--text-muted);font-size:var(--text-xs);font-weight:600;cursor:pointer;transition:all .14s;
      }
      .ds-chip:hover{border-color:var(--teal);color:var(--ink);}
      .ds-chip[aria-pressed="true"]{background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}
      .ds-chip:disabled{opacity:.4;cursor:not-allowed;}
      .ds-chip:disabled:hover{border-color:var(--border);color:var(--text-muted);}
      .ds-drop{
        display:flex;flex-direction:column;align-items:center;gap:6px;padding:22px 14px;text-align:center;
        border:2px dashed color-mix(in srgb,var(--teal) 45%,transparent);border-radius:var(--r-lg);
        background:var(--bg-surface);color:var(--text-muted);cursor:pointer;transition:all .15s;
      }
      .ds-drop strong{font-size:var(--text-xs);color:var(--ink);}
      .ds-drop span{font-size:var(--text-2xs);}
      .ds-drop:hover:not(:disabled),.ds-drop[data-drag]{border-color:var(--teal);background:var(--teal-50);}
      .ds-drop:disabled{opacity:.6;cursor:not-allowed;border-color:var(--border-strong);}
      .ds-status{padding:12px;border-radius:var(--r-md);border:1px solid var(--border);background:var(--bg-card);display:flex;flex-direction:column;gap:8px;}
      .ds-status[data-phase="done"]{border-color:color-mix(in srgb,var(--teal) 55%,transparent);background:var(--teal-50);}
      .ds-status[data-phase="error"]{border-color:var(--danger-text);background:var(--danger-bg);}
      .ds-status-row{display:flex;align-items:center;gap:8px;font-size:var(--text-xs);color:var(--ink);}
      .ds-status[data-phase="error"] .ds-status-row{color:var(--danger-text);}
      .ds-status .ds-note{margin-top:0;}
      .ds-status-actions{display:flex;flex-wrap:wrap;gap:6px;}
      .ds-status-actions .ds-btn{min-height:44px;}
      /* Upload review: before/after, the remove-background switch and "Use as" */
      .ds-ba{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-ba figure{margin:0;display:flex;flex-direction:column;gap:4px;}
      .ds-ba figcaption{font-size:13px;font-weight:700;color:var(--cx-ink-2);text-align:center;}
      .ds-switch{min-height:44px;display:flex;align-items:center;gap:10px;font-size:13px;font-weight:700;color:var(--cx-ink);cursor:pointer;}
      .ds-switch input,.ds-useas input{width:18px;height:18px;accent-color:var(--cx-thread);flex-shrink:0;}
      .ds-useas{border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:2px;}
      .ds-useas legend{margin-bottom:4px;font-size:13px;font-weight:800;color:var(--cx-ink);}
      .ds-useas label{min-height:44px;display:flex;align-items:center;gap:10px;padding:4px 6px;border-radius:var(--cx-r-md);cursor:pointer;}
      .ds-useas label:has(input:checked){background:var(--cx-thread-tint);}
      .ds-useas b{display:block;font-size:13px;color:var(--cx-ink);}
      .ds-useas small{display:block;font-size:13px;color:var(--cx-ink-2);}
      .ds-spin{width:14px;height:14px;border:2px solid color-mix(in srgb,var(--teal) 30%,transparent);border-top-color:var(--teal);border-radius:50%;animation:dspin .7s linear infinite;}
      .ds-bar-track{height:6px;border-radius:99px;background:var(--border);overflow:hidden;}
      .ds-bar-track span{display:block;height:100%;background:var(--teal);transition:width .2s;}
      .ds-btn{
        min-height:32px;padding:0 12px;display:inline-flex;align-items:center;gap:5px;border:1px solid var(--border-strong);
        border-radius:var(--r-sm);background:var(--bg-card);color:var(--ink);font-size:var(--text-xs);font-weight:700;cursor:pointer;
      }
      .ds-btn:hover{border-color:var(--teal);}
      .ds-btn--primary{background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}
      .ds-link{align-self:flex-start;border:0;background:none;padding:0;color:var(--text-muted);font-size:var(--text-2xs);text-decoration:underline;cursor:pointer;}
      .ds-checker{
        display:flex;align-items:center;justify-content:center;height:96px;border-radius:var(--r-sm);
        background:repeating-conic-gradient(#e2e8f0 0% 25%,#fff 0% 50%) 0 0/14px 14px;border:1px solid var(--border);
      }
      .ds-checker img{max-width:88%;max-height:88%;object-fit:contain;}
      .ds-card{
        display:flex;align-items:flex-start;gap:12px;padding:14px;text-align:left;border:1px solid var(--border);
        border-radius:var(--r-md);background:var(--bg-card);color:var(--teal-dark);cursor:pointer;transition:all .14s;
      }
      .ds-card:hover{border-color:var(--teal);background:var(--teal-50);transform:translateY(-1px);}
      .ds-card strong{display:block;font-size:var(--text-xs);color:var(--ink);}
      .ds-card small{display:block;margin-top:3px;font-size:var(--text-2xs);color:var(--text-muted);line-height:1.4;}
      .ds-shape-btn{
        display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px;border:1px solid var(--border);
        border-radius:var(--r-md);background:var(--bg-card);cursor:pointer;transition:all .14s;
      }
      .ds-shape-btn span{font-size:var(--text-2xs);font-weight:600;color:var(--text-muted);}
      .ds-shape-btn:hover{border-color:var(--teal);background:var(--teal-50);transform:translateY(-1px);}


      /* ── Garment picker (TypePanel) ── */
      .ds-tp{flex:1;min-height:0;overflow-y:auto;padding:14px 14px 20px;display:flex;flex-direction:column;gap:10px;}
      .ds-tp{min-width:0;}
      .ds-tp>*{flex-shrink:0;min-width:0;max-width:100%;}
      .ds-tp-catbar{display:flex;flex-wrap:wrap;gap:6px;}
      .ds-tp-catchip{flex:0 0 auto;}
      .ds-tp-catchip{
        min-height:36px;display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:0 10px;
        border:1px solid var(--border);border-radius:99px;background:var(--bg-card);color:var(--text-muted);
        font-size:var(--text-xs);font-weight:700;white-space:nowrap;cursor:pointer;
        transition:background .16s,border-color .16s,color .16s,transform .12s;
      }
      .ds-tp-catchip:hover{border-color:var(--teal);color:var(--ink);}
      .ds-tp-catchip:active{transform:scale(.96);}
      .ds-tp-catchip[aria-selected="true"]{background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}
      .ds-tp-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;}
      .ds-tp-row-actions{display:flex;align-items:center;gap:4px;}
      .ds-tp-mini{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:0;border-radius:var(--r-sm);background:var(--bg-surface);color:var(--text-muted);cursor:pointer;transition:background .14s;}
      .ds-tp-mini:hover{background:var(--teal-50);color:var(--teal-dark);}
      .ds-tp-clear{display:flex;align-items:center;gap:3px;padding:4px 6px;border:0;background:none;color:var(--text-muted);font-size:var(--text-2xs);font-weight:700;cursor:pointer;border-radius:var(--r-sm);}
      .ds-tp-clear:hover{color:var(--danger-text);background:var(--danger-bg);}
      .ds-tp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:10px;}
      .ds-tp-card{
        position:relative;display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px 8px;min-height:112px;animation:dsIn .22s ease backwards;animation-delay:calc(var(--i,0) * 24ms);
        border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg-card);cursor:pointer;
        transition:transform .16s,border-color .16s,box-shadow .16s,background .16s;
      }
      .ds-tp-card:hover{transform:translateY(-2px);border-color:var(--teal);box-shadow:var(--shadow-md);}
      .ds-tp-card:active{transform:scale(.97);box-shadow:none;}
      .ds-tp-card[aria-pressed="true"]{border-color:var(--teal);background:var(--teal-50);box-shadow:0 0 0 2px var(--teal),var(--shadow-sm);}
      .ds-tp-thumb{flex:1;display:flex;align-items:center;justify-content:center;width:100%;border-radius:var(--r-md);background:var(--bg-surface);padding:8px 0;}
      .ds-tp-card[aria-pressed="true"] .ds-tp-thumb{background:var(--bg-card);}
      .ds-tp-photo{display:block;height:128px;width:auto;max-width:100%;object-fit:contain;}
      @media (max-width:1023px){.ds-tp-photo{height:104px;}}
      .ds-tp-name{font-size:var(--text-xs);font-weight:700;color:var(--ink);text-align:center;line-height:1.2;}
      .ds-chip-note{font-size:13px;font-weight:800;color:var(--cx-ink-2);}
      .ds-tp-chip{white-space:nowrap;font-size:13px;font-weight:800;letter-spacing:.02em;padding:2px 7px;border-radius:99px;background:var(--bg-surface);color:var(--text-muted);}
      .ds-tp-chip[data-tone="ok"]{background:#f0fdfa;color:#0f766e;}
      .ds-tp-chip[data-tone="warn"]{background:#fffbeb;color:#b45309;}
      .ds-tp-check{position:absolute;top:7px;right:7px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--teal);box-shadow:var(--shadow-sm);}

      .ds-tp-swatches{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;justify-items:center;}
      .ds-acc{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;background:var(--bg-card);}
      .ds-acc-item+.ds-acc-item{border-top:1px solid var(--border);}
      .ds-acc-head{width:100%;min-height:46px;display:flex;align-items:center;gap:10px;padding:0 14px;border:0;background:none;cursor:pointer;
        font-size:var(--text-sm);font-weight:700;color:var(--ink);text-align:left;transition:background .15s;}
      .ds-acc-head:hover{background:var(--bg-surface);}
      .ds-acc-head span:nth-child(2){flex:1;}
      .ds-acc-head svg:last-child{color:var(--text-subtle);transition:transform .18s;}
      .ds-acc-head[aria-expanded="true"] svg:last-child{transform:rotate(90deg);}
      .ds-acc-body{overflow:hidden;}
      .ds-acc-body .ds-tp-swatches{padding:4px 14px 14px;}
      @media (prefers-reduced-motion:reduce){.ds-acc-head svg:last-child{transition:none;}}
      .ds-tp-sw{width:32px;height:32px;border-radius:50%;border:1px solid var(--border-strong);cursor:pointer;transition:transform .12s,box-shadow .16s;}
      .ds-tp-sw:hover{transform:scale(1.1);}
      .ds-tp-sw[aria-pressed="true"]{box-shadow:0 0 0 2px var(--bg-card),0 0 0 4px var(--teal);}
      .ds-dock{flex-shrink:0;display:flex;flex-direction:column;gap:10px;padding:12px 14px 14px;border-top:1px solid var(--border);
        background:var(--bg-card);box-shadow:0 -6px 16px rgba(15,23,42,.05);}
      .ds-dock-head{display:flex;align-items:center;gap:10px;}
      .ds-dock-thumb{width:44px;height:52px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:var(--r-sm);background:var(--bg-surface);}
      .ds-dock-title{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
      .ds-dock-title strong{font-size:var(--text-sm);font-weight:800;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .ds-dock-title span{font-size:var(--text-2xs);color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .ds-dock-empty{display:flex;align-items:center;gap:8px;font-size:var(--text-xs);font-weight:700;color:var(--text-muted);}
      .ds-dock-empty span{flex:1;}
      .ds-dock-more{display:flex;flex-direction:column;gap:10px;}
      .ds-dock-facts{list-style:none;display:flex;flex-wrap:wrap;gap:6px;}
      .ds-dock-facts li{display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:99px;background:var(--bg-surface);
        font-size:var(--text-2xs);font-weight:700;color:var(--text-muted);}
      .ds-dock-facts li[data-ok="true"]{background:var(--teal-50);color:var(--teal-dark);}
      .ds-dock-mat{display:flex;gap:10px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);color:var(--teal-dark);}
      .ds-dock-mat svg{flex-shrink:0;margin-top:1px;}
      .ds-dock-mat p{font-size:var(--text-2xs);line-height:1.45;color:var(--text-muted);}
      .ds-dock-mat strong{display:block;font-size:var(--text-xs);color:var(--ink);margin-bottom:1px;}
      .ds-dock-actions{display:grid;grid-template-columns:auto 1fr;gap:8px;}
      @media (max-height:800px){.ds-dock-more{display:none;}}
      @media (pointer:coarse){.ds-tp-sw{width:40px;height:40px;}.ds-tp-swatches{grid-template-columns:repeat(5,1fr);}.ds-tp-catchip{min-height:44px;}}
      @media (prefers-reduced-motion:reduce){.ds-tp-sw{transition:none;}}

      @media (prefers-reduced-motion:reduce){.ds-tp-card,.ds-tp-catchip,.ds-face .ds-face-thumb{transition:none;animation:none;}.ds-tp-card:hover{transform:none;}}


      /* ── Wireframe polish pass ── */
      /* Rail: sliding active pill (framer layoutId) replaces the per-button background swap */
      .ds-tool-btn{position:relative;isolation:isolate;}
      .ds-tool-btn[aria-pressed="true"],.ds-tool-btn[aria-expanded="true"]{background:transparent;border-color:transparent;}
      .ds-rail-pill{position:absolute;inset:0;z-index:-1;border-radius:var(--r-md);background:var(--teal-50);border:1px solid var(--teal);box-shadow:var(--shadow-xs);}
      /* Guides: one button in the top lane; its popover holds every guide toggle */
      .ds-guides{position:relative;}
      .ds-guides-btn,.ds-pan-btn{min-height:40px;display:inline-flex;align-items:center;gap:6px;padding:0 12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);
        background:var(--cx-card);color:var(--cx-ink);font:700 12.5px var(--cx-sans);cursor:pointer;box-shadow:var(--cx-elev-0);}
      .ds-pan-btn{padding:0 10px;}
      .ds-guides-btn[aria-expanded=true],.ds-pan-btn[aria-pressed=true]{border-color:var(--cx-thread);color:var(--cx-thread-ink);background:var(--cx-thread-tint);}
      .ds-guides-n{min-width:18px;height:18px;display:grid;place-items:center;padding:0 5px;border-radius:var(--cx-r-pill);background:var(--cx-thread);color:var(--cx-on-thread);font-size:11px;}
      .ds-guides-pop{z-index:var(--cx-z-popover);width:min(300px,calc(100vw - 24px));padding:6px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;overscroll-behavior:contain;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);background:var(--cx-card);box-shadow:var(--cx-elev-2);text-align:left;}
      /* Up to 1023px the guides panel is a modal dialog above everything (sheet, rulers), with a backdrop and a close button */
      .ds-guides-modal{position:fixed;inset:0;z-index:var(--cx-z-modal);display:flex;align-items:flex-end;justify-content:center;padding:12px 12px max(12px,env(safe-area-inset-bottom));}
      .ds-guides-scrim{position:absolute;inset:0;background:var(--cx-scrim);}
      .ds-guides-pop[data-modal]{position:relative;width:min(420px,100%);max-height:calc(100dvh - 24px);padding:4px 6px 8px;}
      .ds-guides-head{display:flex;align-items:center;justify-content:space-between;padding:4px 2px 4px 10px;}
      .ds-guides-head h2{font-size:15px;font-weight:800;color:var(--cx-ink);}
      .ds-guides-close{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink-2);cursor:pointer;}
      .ds-guides-row{display:flex;align-items:center;gap:8px;border-radius:var(--cx-r-md);}
      .ds-guides-row:hover{background:var(--cx-hover);}
      .ds-guides-row label{flex:1;min-height:44px;display:flex;align-items:center;gap:10px;padding:6px 8px;cursor:pointer;}
      .ds-guides-row input{width:18px;height:18px;flex-shrink:0;accent-color:var(--cx-thread);}
      .ds-guides-row b{display:block;font-size:13px;color:var(--cx-ink);}
      .ds-guides-row small{display:block;font-size:13px;line-height:1.35;color:var(--cx-ink-2);}
      .ds-guides-row select{min-height:36px;margin-right:6px;padding:0 6px;border:1px solid var(--cx-line-strong);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink);font:600 12px var(--cx-sans);}
      .ds-guides-row select:disabled{opacity:.5;}
      /* Stage grid: neutral ink under the artboard, aligned to it and zoomed with it; minor lines lighter than every 5th */
      .ds-cv{--ds-grid-ink:var(--cx-shade);}
      .ds-cv[data-stage=dark]{--ds-grid-ink:255 255 255;}
      .ds-sgrid{position:absolute;left:0;top:0;z-index:0;pointer-events:none;}
      .ds-sgrid line{stroke:rgb(var(--ds-grid-ink) / var(--ds-ga));stroke-width:1;shape-rendering:crispEdges;}
      .ds-sgrid line.ds-sgrid-major{stroke:rgb(var(--ds-grid-ink) / var(--ds-gA));}
      .ds-pane[data-garment]{touch-action:none;} /* pinch zoom and drags belong to the Studio, not the page */
      .ds-zoom-val{min-width:52px;display:inline-grid;place-items:center;font:700 12.5px var(--cx-sans);font-variant-numeric:tabular-nums;color:var(--cx-ink);}
      /* Rulers: % of the garment only (0-100), horizontal labels at 11px, ink on card (>= 4.5:1) on light and dark stages */
      .ds-cv[data-rulers] .ds-pane{top:20px;left:34px;}
      .ds-ruler,.ds-ruler-corner{position:absolute;z-index:3;background:var(--cx-paper-2);}
      .ds-ruler-corner{pointer-events:none;}
      .ds-ruler-x{cursor:row-resize;touch-action:none;}
      .ds-ruler-y{cursor:col-resize;touch-action:none;}
      .ds-ruler{overflow:hidden;}
      .ds-ruler-x{left:34px;top:0;box-shadow:inset 0 -1px 0 var(--cx-line-strong);}
      .ds-ruler-y{left:0;top:20px;box-shadow:inset -1px 0 0 var(--cx-line-strong);}
      .ds-ruler-corner{left:0;top:0;width:34px;height:20px;display:grid;place-items:center;font-size:11px;font-weight:700;color:var(--cx-ink-2);box-shadow:inset -1px -1px 0 var(--cx-line-strong);}
      .ds-ruler-art{fill:var(--cx-card);}
      .ds-ruler line{stroke:var(--cx-ink-3);stroke-width:1;shape-rendering:crispEdges;}
      .ds-ruler text{fill:var(--cx-ink-2);font-family:inherit;font-weight:600;font-variant-numeric:tabular-nums;pointer-events:none;}
      .ds-ruler g[data-key] text{fill:var(--cx-ink);font-weight:800;}
      .ds-ruler g[data-key] line{stroke:var(--cx-ink);}
      .ds-ruler-mark{stroke:var(--cx-thread-ink);stroke-width:2;opacity:0;pointer-events:none;}
      /* Ruler guides (session only): a 1px thread line inside a 9px hit band; label shows on hover, focus and while dragging */
      .ds-rguide{position:absolute;z-index:3;outline:none;}
      .ds-rguide[data-axis=v]{top:0;bottom:0;width:9px;margin-left:-4px;cursor:col-resize;}
      .ds-rguide[data-axis=h]{left:0;right:0;height:9px;margin-top:-4px;cursor:row-resize;}
      .ds-rguide::before{content:"";position:absolute;background:var(--cx-thread-ink);}
      .ds-rguide[data-axis=v]::before{top:0;bottom:0;left:4px;width:1px;}
      .ds-rguide[data-axis=h]::before{left:0;right:0;top:4px;height:1px;}
      .ds-rguide[data-live]{pointer-events:none;}
      .ds-rguide span{position:absolute;top:24px;left:8px;padding:1px 6px;border-radius:var(--cx-r-pill);background:var(--cx-thread-ink);color:var(--cx-on-thread);font-size:11px;font-weight:700;white-space:nowrap;opacity:0;}
      .ds-rguide[data-axis=h] span{top:8px;left:38px;}
      .ds-rguide:hover span,.ds-rguide:focus-visible span,.ds-rguide[data-live] span{opacity:1;}
      .ds-rguide:focus-visible::before{box-shadow:0 0 0 2px var(--cx-thread-ring);}
      .ds-pane[data-pan]{cursor:grab;touch-action:none;}
      .ds-pan-layer{position:absolute;inset:0;z-index:1;cursor:grab;touch-action:none;}
      .ds-pan-layer:active,.ds-pane[data-pan]:active{cursor:grabbing;}
      .ds-stage-btn{position:relative;z-index:2;width:40px;height:40px;display:grid;place-items:center;border-radius:var(--r-md);
        border:1px solid var(--border);background:var(--bg-card);color:var(--ink);cursor:pointer;box-shadow:var(--shadow-sm);transition:transform .12s,background .16s;}
      .ds-stage-btn:active{transform:scale(.94);}
      /* Contact shadow under the garment */
      .ds-stage-floor{position:absolute;left:8%;right:8%;bottom:-3%;height:7%;border-radius:50%;pointer-events:none;
        background:radial-gradient(ellipse at center,rgb(var(--cx-shade) / .34),transparent 70%);filter:blur(6px);}
      .ds-cv[data-stage=dark] .ds-stage-floor{background:radial-gradient(ellipse at center,rgb(0 0 0 / .55),transparent 70%);}
      /* Quiet status badge (Sketch / Derived / Photo): plain text in a soft pill, never truncated */
      .ds-ctx-chip{display:inline-flex;align-items:center;gap:6px;flex:none;min-height:28px;padding:0 10px;border-radius:99px;background:var(--cx-paper-2);
        color:var(--cx-ink-2);font-size:13px;font-weight:700;white-space:nowrap;}
      .ds-ctx-chip strong{font-weight:800;color:var(--cx-ink);}
      /* Summary: stat chips + icon jump rows with an active state */
      .ds-stats{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-stats li{display:flex;flex-direction:column;gap:2px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-card);}
      .ds-stats b{font-size:var(--text-lg,18px);font-weight:800;color:var(--ink);line-height:1;}
      .ds-stats span{font-size:var(--text-2xs);color:var(--text-muted);font-weight:600;}
      .ds-jump button svg:first-child{color:var(--text-subtle);flex-shrink:0;}
      .ds-jump button[data-active="true"]{background:var(--teal-50);box-shadow:inset 3px 0 0 var(--teal);}
      .ds-jump button[data-active="true"] svg:first-child{color:var(--teal-dark);}
      .ds-zone-now{display:flex;align-items:center;gap:8px;padding:10px 12px;margin-bottom:12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);font-size:var(--text-xs);color:var(--text-muted);}
      .ds-zone-now b{color:var(--ink);}
      .ds-zone-now code{margin-left:auto;font-size:var(--text-2xs);color:var(--text-muted);}
      .ds-zone-dot{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(15,23,42,.18);flex-shrink:0;transition:background .2s;}
      /* Centred with margins, not translateX: framer-motion owns transform for the enter animation and would drop the centring. */
      .ds-toast{position:absolute;z-index:var(--cx-z-popover);left:0;right:0;margin-inline:auto;width:max-content;max-width:calc(100% - 24px);bottom:84px;display:flex;align-items:center;gap:8px;
        padding:10px 16px;border-radius:var(--cx-r-pill);background:var(--cx-ink);color:var(--cx-paper);font-size:var(--text-xs);font-weight:700;box-shadow:var(--cx-elev-2);}
      .ds-toast svg{flex:none;color:var(--teal-2);}
      .ds-grab{display:none;}
      /* Inspector body takes its content height; Layers + History fill the rest above the sticky dock (no dead space) */
      .ds-panel-scroll{flex:1;min-height:0;display:flex;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;}
      .ds-panel-scroll>.ds-panel-body,.ds-panel-scroll>.ds-more-grid{flex:0 0 auto;overflow:visible;}
      /* Inside the panel's one scroller, inner panels never become scroll boxes of their own: an inner box that grows to its content
         but keeps overflow:auto + overscroll-behavior:contain swallowed the wheel, so the inspector's lower controls (flip, order,
         duplicate, delete) could not be scrolled to. */
      .ds-panel-scroll .ds-sum,.ds-panel-scroll .ds-ins{overflow:visible;overscroll-behavior:auto;min-height:auto;}
      .ds-under{flex:0 0 auto;display:flex;flex-direction:column;border-top:1px solid var(--cx-line);}
      .ds-under:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:-2px;}
      .ds-under .ds-lay{flex:0 0 auto;overflow:visible;}
      .ds-under-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 8px 0 14px;}
      .ds-under-head h3{font-size:13px;font-weight:800;color:var(--cx-ink-2);}
      .ds-under-hist{display:flex;gap:2px;}
      .ds-under .ds-lay{padding-top:6px;}
      .ds-swatch-chips{list-style:none;display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px;}

      /* Short phones: the canvas must stay the focal area, so the sheet shrinks (its body scrolls; the grabber still expands it to 80dvh). */
      @media (min-width:1024px){
        .ds-tool-btn[data-narrow-only]{display:none;}
      }
      @media (max-width:1023px){
        .ds{--ds-pad-b:calc(var(--ds-nav-h) + var(--ds-inset));}
        .ds[data-snap=peek]{--ds-pad-b:calc(var(--ds-nav-h) + var(--ds-inset) + var(--ds-peek));}
        .ds[data-snap=half]{--ds-pad-b:calc(var(--ds-nav-h) + var(--ds-inset) + var(--ds-sheet-h));}
        .ds[data-snap=full]{--ds-pad-b:calc(var(--ds-nav-h) + var(--ds-inset) + var(--ds-sheet-full));}
        .ds-bar{padding:0 6px;gap:4px;}
        .ds-bar-back span,.ds-bar-title,.ds-bar-text span,.ds-bar-sp{display:none;}
        .ds-bar-back{border-color:transparent;}
        .ds-bar-btn{min-width:44px;height:44px;padding:0;}
        .ds-bar-name{flex:1;width:auto;padding:0 8px;}
        .ds-bar-view button{min-width:48px;height:44px;}
        .ds-strip{position:fixed;left:0;right:0;bottom:0;z-index:var(--cx-z-sheet);width:100%;
          height:calc(var(--ds-nav-h) + var(--ds-inset));padding:0 6px var(--ds-inset);
          flex-direction:row;justify-content:space-around;gap:0;overflow:hidden;border-right:0;border-top:1px solid var(--cx-line);}
        .ds-tool-btn{flex:1;width:auto;min-width:0;height:var(--ds-nav-h);}
        .ds-tool-btn[data-group="more"]{display:none;}
        .ds-tool-btn[data-tool="draw"]{margin-top:0;}
        .ds-more-btn{display:flex;}
        /* Bottom sheet with three snaps: peek (Save and Order only), half, full. It sits above the tool bar; the stage pane ends where it starts. */
        .ds-panel{position:fixed;left:0;right:0;z-index:var(--cx-z-sheet);width:auto;height:var(--ds-peek);
          bottom:calc(var(--ds-nav-h) + var(--ds-inset));border-left:0;border-top:1px solid var(--cx-line);border-radius:var(--cx-r-xl) var(--cx-r-xl) 0 0;box-shadow:var(--cx-elev-2);
          transition:height var(--cx-dur-3) var(--cx-ease),transform var(--cx-dur-3) var(--cx-ease);}
        .ds[data-snap=none] .ds-panel{transform:translateY(calc(100% + var(--ds-nav-h)));visibility:hidden;}
        .ds[data-snap=half] .ds-panel{height:var(--ds-sheet-h);}
        .ds[data-snap=full] .ds-panel{height:var(--ds-sheet-full);}
        .ds-grab{order:0;display:flex;justify-content:center;align-items:center;height:12px;flex-shrink:0;cursor:grab;touch-action:none;}
        .ds-grab span{width:38px;height:4px;border-radius:var(--cx-r-pill);background:var(--cx-line-strong);}
        .ds-dock{order:1;padding:0 12px 10px;gap:6px;border-top:0;box-shadow:none;}
        .ds-dock-state:not([data-tone]){display:none;}
        .ds-sheet-head{order:2;padding:0 6px 0 16px;border-top:1px solid var(--cx-line);}
        .ds-panel-scroll{order:3;}
        .ds[data-snap=peek] :is(.ds-sheet-head,.ds-panel-scroll,.ds-dock-export,.ds-dock-sub,.ds-dock-state){display:none;}
        .ds-sheet-close{display:flex;}
        .ds-sheet-title p{display:none;}
        .ds-assets-body{padding:12px 14px 16px;}
        .ds-hints{display:none;}
        .ds-toast{bottom:calc(var(--ds-pad-b) + 16px);}
        .ds-lane{padding:8px 8px 0;}
        /* Phones and tablets: the top lane is one row (icon Guides with its count, a truncating garment chip, a compact set switch) */
        .ds-lane-top:not([data-notes]){flex-wrap:nowrap;}
        .ds-lane-top>*{flex-shrink:0;}
        /* A row wider than the phone (Guides + set switch) scrolls sideways from its start; auto margins centre it only when it fits, so Guides never sits off-screen */
        .ds-lane-top:not([data-notes]){justify-content:flex-start;overflow-x:auto;scrollbar-width:none;}
        .ds-lane-top:not([data-notes])::-webkit-scrollbar{display:none;}
        .ds-lane-top:not([data-notes])>:first-child{margin-left:auto;}
        .ds-lane-top:not([data-notes])>:last-child{margin-right:auto;}
        .ds-guides-txt{display:none;}
        .ds-guides-btn{padding:0 10px;}
        .ds-piece button{padding:0 12px;}
        /* With a 3D note in the lane the lane cannot scroll, so the set bar wraps its Apply-to group onto a second row (it was cut off at 375px). */
        .ds-piece{flex-wrap:wrap;justify-content:center;max-width:100%;border-radius:22px;}
        .ds-piece .ds-apply{margin-left:0;padding-left:0;border-left:0;}
        /* Half sheet (~30%): the active tool only. Save/Order (peek, full), Layers (full) and the zoom lane (pinch instead) step aside. */
        .ds[data-snap=half] :is(.ds-dock,.ds-under,.ds-lane-bottom){display:none;}
        .ds-sheet-head{min-height:0;}
        .ds-sheet-head .ds-sheet-close{width:44px;height:44px;}
        .ds-lane-bottom{padding:0 8px 8px;}
        .ds-wide-only{display:none;}
        /* Phone first run: no garment yet, so no sheet and no tool bar; the picker gets the full height */
        .ds[data-first]{--ds-pad-b:0px;}
        .ds[data-first] :is(.ds-strip,.ds-panel){display:none;}
        .ds-pick[data-inline]{padding:4px 12px 0;}
        .ds-pick-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
        .ds-modal{top:60px;max-height:calc(100dvh - 72px);}
        .ds-ftb{padding:4px;}
        .ds-ftb-kind{display:none;}
        .ds-draft{padding-left:12px;font-size:12.5px;}
        /* Expanded on a phone: the sheet hides (the tool bar stays to reopen tools), so the stage ends at the tool bar, never under it. */
        .ds[data-expanded] .ds-panel{display:none;}
        .ds[data-expanded]{--ds-pad-b:calc(var(--ds-nav-h) + var(--ds-inset));}
        .ds[data-expanded] .ds-lane-bottom{display:flex;}
      }
      @media (prefers-reduced-motion:reduce){
        .ds-panel{transition:none!important;}
        .ai-pulse{animation:none;}
      }
      @media (pointer:coarse){
        .ds-zoom button,.ds-face button,.ds-touch,.ds-ftb button,.ds-bar-btn,.ds-bar-view button,.ds-stage-btn,.ds-guides-btn,.ds-pan-btn{min-width:44px;min-height:44px;}
        .ds input[type="range"]{min-height:44px;}
      }

      .ds-tp-current{display:flex;align-items:center;gap:10px;padding:10px;border:1px solid var(--teal);border-radius:var(--r-md);background:var(--teal-50);}
      .ds-tp-thumb--sm{flex:none;width:52px;height:52px;padding:0;background:var(--bg-card);}
      .ds-tp-current-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
      .ds-tp-current-txt strong{font-size:var(--text-sm);font-weight:800;color:var(--ink);}
      .ds-tp-current-txt span{font-size:var(--text-2xs);color:var(--text-muted);}
      .ds-tp-prev{display:flex;flex-direction:column;gap:10px;padding:4px 14px 14px;}
      .ds-seg button:disabled{opacity:.4;cursor:not-allowed;}
      .ds-acc-item[data-open="true"] > .ds-acc-head{background:var(--teal-50);color:var(--teal-dark);box-shadow:inset 3px 0 0 var(--teal);}

      .ds-lay{display:flex;flex-direction:column;gap:8px;padding:12px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;}
      .ds-lay-count{font-size:var(--text-2xs);font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--text-muted);}
      .ds-lay-list{list-style:none;display:flex;flex-direction:column;gap:4px;margin:0;padding:0;}
      .ds-lay-row{border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);transition:background .12s,border-color .12s;}
      .ds-lay-row[data-sel]{border-color:var(--teal);background:var(--teal-50);}
      .ds-lay-row[data-over]{outline:2px solid var(--teal);}
      .ds-lay-row[data-hidden] .ds-lay-pick{opacity:.45;}
      .ds-lay-main{display:flex;align-items:center;gap:2px;padding:2px 4px 2px 2px;}
      .ds-lay-pick{flex:1;min-width:0;min-height:40px;display:flex;align-items:center;gap:8px;padding:0 6px;border:0;background:none;cursor:pointer;text-align:left;color:var(--ink);}
      .ds-lay-type{width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:6px;background:var(--bg-card);color:var(--text-muted);}
      .ds-lay-name{flex:1;min-width:0;display:flex;flex-direction:column;font-size:var(--text-xs);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .ds-lay-name em{font-style:normal;font-size:13px;font-weight:600;color:var(--text-subtle);}
      .ds-lay-edit{flex:1;min-width:0;height:32px;padding:0 8px;border:1px solid var(--teal);border-radius:6px;font-size:var(--text-xs);}
      .ds-lay-btn{width:34px;height:34px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:8px;background:none;color:var(--text-muted);cursor:pointer;}
      .ds-lay-btn:hover:not(:disabled){background:var(--bg-card);color:var(--ink);}
      .ds-lay-btn[aria-pressed="true"]{color:var(--teal-dark);background:var(--teal-50);}
      .ds-lay-btn:disabled{opacity:.35;cursor:not-allowed;}
      .ds-lay-del:hover:not(:disabled){color:#dc2626;}
      .ds-lay-detail{display:flex;flex-direction:column;gap:6px;padding:4px 8px 8px;border-top:1px solid var(--border);}
      .ds-lay-op{display:flex;flex-direction:column;gap:4px;font-size:var(--text-2xs);font-weight:700;color:var(--text-muted);}
      .ds-lay-op input,.ds-ins-range input{width:100%;accent-color:var(--teal);}
      .ds-lay-tools{display:flex;gap:2px;justify-content:flex-end;}
      .ds-lay-base{display:flex;align-items:center;gap:8px;padding:8px;border:1px dashed var(--border-strong);border-radius:var(--r-md);color:var(--text-muted);}

      .ds-ins{display:flex;flex-direction:column;gap:12px;padding:12px 14px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;}
      .ds-ins-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .ds-ins-sec{display:flex;flex-direction:column;gap:8px;}
      .ds-ins-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-ins-field{display:flex;flex-direction:column;gap:4px;font-size:var(--text-2xs);font-weight:700;color:var(--text-muted);}
      .ds-ins-field input,.ds-ins-field select{width:100%;min-height:36px;padding:0 9px;border:1px solid var(--border-strong);border-radius:8px;background:var(--bg-card);color:var(--ink);font-size:var(--text-sm);}
      .ds-ins-field input[type="color"]{padding:2px;min-height:38px;cursor:pointer;}
      .ds-ins-field input:disabled,.ds-ins-field select:disabled{opacity:.5;}
      .ds-ins-range{display:flex;flex-direction:column;gap:4px;font-size:var(--text-2xs);font-weight:700;color:var(--text-muted);}
      .ds-ins-note{font-size:var(--text-2xs);color:var(--text-subtle);text-align:center;line-height:1.5;margin:0;}
      .ds-act--danger{color:#dc2626;border-color:rgba(220,38,38,.3);}
      .ds-ins-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-set-wrap{max-width:100%;}
      .ds-ins-align{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:6px;}
      .ds-ins-align .ds-act{min-height:36px;padding:0 6px;font-size:13px;justify-content:center;}
      .ds-ins-actions .ds-act{min-height:44px;}

      .ds-dock{flex-shrink:0;padding-bottom:max(14px,env(safe-area-inset-bottom));}
      .ds-dock-state{min-height:16px;margin:0;font-size:var(--text-2xs);font-weight:700;color:var(--text-subtle);}
      .ds-dock-state[data-tone="ok"]{color:var(--cx-thread-ink);}
      .ds-dock-state[data-tone="err"]{color:var(--danger-text);}
      .ds-dock-actions{grid-template-columns:auto 1fr auto;}
      .ds-dock-actions .ds-act{min-height:44px;}
      .ds-act--icon{width:44px;padding:0;}
      .ds-act--primary{background:var(--cx-thread);border-color:var(--cx-thread);color:var(--cx-on-thread);}
      .ds-spin--on-thread{border-color:rgb(255 255 255 / .4);border-top-color:var(--cx-on-thread);}
      .ds-dock-export{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-dock-export .ds-act{min-height:44px;font-size:13px;justify-content:center;}
      @media (pointer:coarse){.ds-lay-btn{width:44px;height:44px;}.ds-lay-pick{min-height:44px;}.ds-ins-field input,.ds-ins-field select{min-height:44px;}.ds-ins .ds-seg button,.ds-ins-align .ds-act{min-height:44px;}.ds-ins-range input{min-height:44px;}}

      /* Stage piece selector: Top / Bottom / Set as one segmented control (PieceSelector.jsx) */
      .ds-piece{display:flex;align-items:center;gap:2px;padding:3px;border-radius:999px;background:var(--cx-card);border:1px solid var(--cx-line);box-shadow:var(--cx-elev-1,0 2px 8px rgb(15 23 42 / .06));}
      .ds-piece button{display:inline-flex;align-items:center;gap:6px;min-height:38px;padding:0 14px;border:0;border-radius:999px;background:transparent;
        font:700 12.5px var(--cx-sans);color:var(--cx-ink-2);cursor:pointer;white-space:nowrap;}
      .ds-piece button span{font-weight:600;color:var(--cx-ink-2);}
      .ds-piece button[aria-pressed=true]{background:var(--cx-thread);color:var(--cx-on-thread);}
      .ds-piece button[aria-pressed=true] span{color:inherit;opacity:.85;}
      .ds-piece button[data-add]{color:var(--cx-thread-ink);}
      .ds-piece button:disabled{opacity:.45;cursor:not-allowed;}
      .ds-piece .ds-piece-leave{min-width:38px;padding:0;justify-content:center;font-size:18px;}
      @media (pointer:coarse){.ds-piece button{min-height:44px;}}
      .ds-apply{display:inline-flex;align-items:center;gap:2px;margin-left:4px;padding-left:8px;border-left:1px solid var(--cx-line);font-size:13px;color:var(--cx-ink-2);}
      .ds-apply > span{margin-right:4px;}
      .ds-piece .ds-apply button{min-height:32px;padding:0 10px;font-size:13px;}
      .ds-piece .ds-apply button[aria-checked=true]{background:var(--cx-thread-ring,var(--teal-50));color:var(--cx-ink);box-shadow:inset 0 0 0 1.5px var(--cx-thread);}
      @media (pointer:coarse){.ds-piece .ds-apply button{min-height:44px;}}

      /* Plain colour swatches in the Studio (the kit's woven hatch hid the true colour) */
      .ds .cx-swatch-dot{background:var(--sw);}

      /* Desktop right panel: the uniform's sections as tabs; the rail keeps the tools that add things */
      .ds-sections{display:none;}
      @media (min-width:1024px){
        .ds-sections{display:flex;gap:2px;padding:6px 10px 0;border-bottom:1px solid var(--cx-line);overflow-x:auto;scrollbar-width:none;}
        .ds-sections button{flex:1 0 auto;min-height:40px;padding:0 8px;margin-bottom:-1px;border:0;border-bottom:2px solid transparent;background:none;
          font:700 12.5px var(--cx-sans);color:var(--cx-ink-2);cursor:pointer;}
        .ds-sections button:hover{color:var(--cx-ink);}
        .ds-sections button[aria-current]{color:var(--cx-thread-ink);border-bottom-color:var(--cx-thread);}
        .ds-tool-btn[data-section]{display:none;}
      }

      /* Details: pockets, buttons, closures (DetailsPanel.jsx) */
      .ds-det{display:flex;flex-direction:column;gap:10px;padding:10px 12px 16px;}
      .ds-det-note{margin:0;padding:8px 10px;border-radius:var(--cx-r-md);background:var(--cx-paper-2);font-size:13px;line-height:1.45;color:var(--cx-ink-2);}
      .ds-det-add{display:flex;flex-direction:column;gap:8px;}
      .ds-det-pockets{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:6px;}
      .ds-det-pocket{flex-direction:column;gap:4px;min-height:58px;justify-content:center;color:var(--cx-thread-ink);}
      .ds-det-pocket span{color:var(--cx-ink);font-size:13px;}
      .ds-det-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px;}
      .ds-det-row{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:48px;padding:0 4px 0 12px;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);}
      .ds-det-row[data-focus]{border-color:var(--cx-thread);}
      .ds-det-row--col{flex-direction:column;align-items:stretch;padding:0;}
      .ds-det-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:48px;padding:0 12px;border:0;background:none;font:inherit;color:var(--cx-ink);cursor:pointer;text-align:left;}
      .ds-det-name{display:flex;align-items:center;gap:10px;font:700 13px var(--cx-sans);color:var(--cx-ink);}
      .ds-det-name .ds-link{align-self:center;}
      .ds-det-val{display:inline-flex;align-items:center;gap:6px;font-size:13px;color:var(--cx-ink-2);}
      .ds-det-body{padding:8px 12px 12px;border-top:1px solid var(--cx-line);}
      .ds-switch{flex:none;width:56px;height:44px;display:flex;align-items:center;justify-content:center;border:0;background:none;cursor:pointer;}
      .ds-switch span{position:relative;width:40px;height:24px;border-radius:999px;background:var(--cx-line-strong);transition:background var(--cx-dur-2) var(--cx-ease);}
      .ds-switch span::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgb(0 0 0 / .25);transition:transform var(--cx-dur-2) var(--cx-ease);}
      .ds-switch[aria-checked=true] span{background:var(--cx-thread);}
      .ds-switch[aria-checked=true] span::after{transform:translateX(16px);}
      @media (prefers-reduced-motion:reduce){.ds-switch span,.ds-switch span::after{transition:none;}}

      /* Picker header: tabs + Upload on one row; after scrolling it collapses to that row alone, opaque, over the grid */
      .ds-pick[data-inline],.ds-modal{overflow-anchor:none;}
      .ds-pick-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:4px;}
      .ds-pick-row .ds-pick-tabs{margin-top:0;}
      .ds-tab-short{display:none;}
      .ds-pick-upbtn{display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:0 16px;border:1.5px dashed var(--cx-thread);border-radius:var(--cx-r-md);
        background:var(--cx-card);color:var(--cx-thread-ink);font:700 13px var(--cx-sans);cursor:pointer;white-space:nowrap;}
      .ds-pick-upbtn[data-over]{border-style:solid;box-shadow:0 0 0 3px var(--cx-thread-ring);}
      .ds-pick-upbtn:focus-within{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-pick[data-compact] .ds-pick-head{padding:8px 0;box-shadow:0 1px 0 var(--cx-line),0 8px 16px -12px rgb(0 0 0 / .3);}
      .ds-pick[data-compact] .ds-pick-head::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:48px;background:inherit;}
      .ds-pick[data-compact] .ds-pick-head>:is(p,.ds-pick-legend){display:none;}
      .ds-pick[data-compact] .ds-pick-titlebar{position:absolute;top:8px;right:0;width:auto;display:block;}
      .ds-pick[data-compact] .ds-pick-titlebar h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
      .ds-pick[data-compact][data-inline] .ds-pick-titlebar{display:none;}
      .ds-pick[data-compact] .ds-pick-row{margin-top:0;flex-wrap:nowrap;}
      .ds-modal .ds-pick[data-compact] .ds-pick-row{padding-right:48px;}
      @media (max-width:599px){
        .ds-pick[data-compact] .ds-tab-long{display:none;}
        .ds-pick[data-compact] .ds-tab-short{display:inline;}
        .ds-pick[data-compact] .ds-pick-tabs button{padding:0 14px;}
      }
      ::-webkit-scrollbar{width:3px;}
      ::-webkit-scrollbar-thumb{background:var(--border-strong);border-radius:2px;}
    
`}</style>
  );
}
