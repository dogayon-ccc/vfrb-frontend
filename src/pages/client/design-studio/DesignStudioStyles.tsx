import { getAccentVars, DEFAULT_ACCENT_HEX, DARK_ON_ACCENT } from '../../../utils/accentColor';

// The Studio's teal, lifted for dark surfaces, as declarations for the dark chrome.
const CHROME_ACCENT = Object.entries({ ...getAccentVars(DEFAULT_ACCENT_HEX, true), '--on-teal': DARK_ON_ACCENT, '--text-on-accent': DARK_ON_ACCENT })
  .map(([k, v]) => `${k}:${v};`).join('');

export default function DesignStudioStyles() {
  return (
    <style>{`
      *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
      @keyframes dspin{to{transform:rotate(360deg)}}
      @keyframes dsIn{from{opacity:0;transform:translateY(6px)}}
      @keyframes aiPulse{0%,100%{opacity:0}50%{opacity:1}}
      body{background:var(--bg);overflow:hidden;}

      .ds{
        --ds-pad-b:0px;
        --text-2xs:13px;--text-xs:13px;--text-sm:15px; /* the Studio type scale: 13 / 15 / 18 / 24 / 32 */
        --ds-sketch-line:rgba(15,23,42,.55);         /* seams over light fills; mirrored in sketchLine.js */
        --ds-sketch-line-on-dark:rgba(255,255,255,.62); /* seams over dark fills */
        --text-2xs:11px;
        width:100%;height:100dvh;display:flex;flex-direction:column;overflow:hidden;
        background:var(--cx-paper);color:var(--cx-ink);font-family:var(--cx-sans);
      }
      .ds button:focus-visible,.ds [role=button]:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      /* Navy chrome (bar, Pieces rail) on the pattern table, chalk panel: navy bases; customer.css derives the rest */
      .ds .ds-chrome{color-scheme:dark;${CHROME_ACCENT}
        --color-page:#16233F;--color-surface:#16233F;--color-surface-2:#2B3E66;--color-card:#1B2A4A;--color-line:#46587F;--color-line-strong:#7686A6;
        --color-ink:#F4F5F2;--color-ink-2:#D8DCE4;--color-ink-3:#B4BDCC;
        --cx-shade:0 0 0;--cx-weave-light:rgb(255 255 255 / .05);--cx-weave-dark:rgb(0 0 0 / .25);--cx-scrim:rgb(0 0 0 / .55);
        --shadow-1:0 1px 2px rgba(0,0,0,.45);--shadow-2:0 2px 6px rgba(0,0,0,.4),0 18px 40px -14px rgba(0,0,0,.7);
        color:var(--cx-ink);}
      .ds-bar.ds-chrome{border-bottom:1px dashed rgb(201 162 122 / .55);}
      .ds-rail.ds-chrome{border-right:1px dashed rgb(201 162 122 / .55);}
      .ds-chrome .ds-bar-primary{background:#028090;color:#fff;}
      .ds-chrome .ds-bar-primary:hover:not(:disabled){background:#046A78;}
      .ds-chrome .ds-bar-view button[aria-checked=true]{background:#C9A27A;color:#1B2A4A;}
      .ds-matnote{display:grid;grid-template-columns:auto minmax(0,1fr) 44px;align-items:start;gap:8px;margin:12px 12px 0;padding:8px 0 8px 12px;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-paper-2);font-size:13px;line-height:1.45;color:var(--cx-ink-2);}
      .ds-matnote > svg{margin-top:2px;color:var(--cx-thread-ink);}
      .ds-matnote strong{display:block;color:var(--cx-ink);font-weight:700;}
      .ds-matnote-x{width:44px;height:44px;margin:-8px 0;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:none;color:var(--cx-ink-2);cursor:pointer;}
      .ds-matnote-x:hover{background:var(--cx-hover);color:var(--cx-ink);}

      /* Top bar: one row at every width; undo/redo and the single 2D/3D toggle never fold away */
      .ds-bar{height:calc(56px + env(safe-area-inset-top,0px));flex-shrink:0;display:flex;align-items:center;gap:8px;padding:env(safe-area-inset-top,0px) max(12px,env(safe-area-inset-right,0px)) 0 max(12px,env(safe-area-inset-left,0px));
        background:var(--cx-card);border-bottom:1px solid var(--cx-line);z-index:var(--cx-z-bar);}
      .ds-bar-btn{min-width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 8px;flex-shrink:0;
        border:1px solid transparent;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink-2);font:600 13px/1 var(--cx-sans);cursor:pointer;
        transition:background .15s,color .15s;}
      .ds-bar-btn:hover:not(:disabled){background:var(--cx-hover);color:var(--cx-ink);}
      .ds-bar-btn:disabled{color:var(--cx-line-strong);cursor:not-allowed;}
      .ds-bar-btn[aria-pressed=true],.ds-bar-btn[aria-expanded=true]{background:var(--cx-thread-tint);color:var(--cx-thread-ink);}
      .ds-bar-back{border-color:var(--cx-line);}
      .ds-bar-title{font:400 18px/1 var(--cx-serif);color:var(--cx-ink);white-space:nowrap;flex-shrink:0;}
      .ds-bar-name{width:180px;min-width:0;height:44px;padding:0 12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-paper);
        color:var(--cx-ink);font:600 13px var(--cx-sans);outline:none;flex-shrink:1;}
      .ds-bar-name:focus-visible{border-color:var(--cx-thread);box-shadow:0 0 0 3px var(--cx-thread-ring);}
      .ds-bar-name{border-color:var(--cx-line-strong);}
      .ds-bar-name::placeholder{color:var(--cx-ink-3);}
      .ds-bar-sp{flex:1;}
      /* The one primary action (Review & order / Reorder) and the bar's Save and "..." menu */
      .ds-bar-primary{min-height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 16px;flex-shrink:0;border:0;border-radius:var(--cx-r-md);
        background:var(--cx-thread);color:var(--cx-on-thread);font:700 13px/1 var(--cx-sans);cursor:pointer;white-space:nowrap;transition:background .15s;}
      .ds-bar-primary:hover:not(:disabled){background:var(--cx-thread-ink);}
      .ds-bar-primary:disabled{opacity:.5;cursor:not-allowed;}
      .ds-bar-primary:focus-visible,.ds-bar-btn:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-bar-text{border-color:var(--cx-line);}
      .ds-bar-menu{flex-shrink:0;}
      .ds-bar-menu .ui-menu-btn{width:44px;height:44px;}
      .ds-rail-acts .ds-btn[aria-pressed=true]{background:var(--cx-thread-tint);border-color:var(--cx-thread);color:var(--cx-thread-ink);}
      .ds-bar-save{display:inline-flex;align-items:center;gap:8px;min-height:28px;padding:0 10px;border:1px solid var(--cx-line);border-radius:14px;background:var(--cx-paper);font-size:13px;font-weight:700;color:var(--text-subtle);white-space:nowrap;}
      .ds-bar-save-dot{width:8px;height:8px;border-radius:50%;background:currentColor;}
      .ds-bar-save[data-tone="ok"]{color:var(--cx-thread-ink);}
      .ds-bar-save[data-tone="err"]{color:var(--danger-text);}
      .ds-bar-group{display:flex;gap:2px;flex-shrink:0;}
      .ds-bar-view{display:flex;flex-shrink:0;gap:2px;padding:4px;border-radius:var(--cx-r-md);background:var(--cx-paper-2);}
      .ds-bar-view button{min-width:44px;height:44px;border:0;border-radius:12px;background:transparent;color:var(--cx-ink-2);
        font:700 13px var(--cx-sans);cursor:pointer;transition:background .15s,color .15s;}
      .ds-bar-view button[aria-checked=true]{background:var(--cx-card);color:var(--cx-thread-ink);box-shadow:var(--cx-elev-0);}
      .ds-bar-view button:disabled{opacity:.55;cursor:not-allowed;}

      /* Draft offer: an in-flow strip under the bar; it pushes the stage down and never covers menus or controls */
      .ds-draft{position:relative;z-index:var(--cx-z-banner);flex-shrink:0;display:flex;align-items:center;gap:8px;min-height:52px;padding:4px 8px 4px 16px;
        background:var(--cx-thread-tint);border-bottom:1px solid var(--cx-line);color:var(--cx-ink);font-size:13px;}
      .ds-draft svg{flex-shrink:0;color:var(--cx-thread-ink);}
      .ds-draft p{flex:1;min-width:0;line-height:1.35;}
      .ds-draft-go,.ds-draft-alt{min-height:44px;padding:0 16px;border-radius:var(--cx-r-md);font:700 13px var(--cx-sans);cursor:pointer;flex-shrink:0;}
      .ds-draft-go{border:0;background:var(--cx-thread);color:var(--cx-on-thread);}
      .ds-draft-alt{border:1px solid var(--cx-line-strong);background:var(--cx-card);color:var(--cx-ink);}
      .ds-draft-x{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink-2);cursor:pointer;flex-shrink:0;}
      .ds-draft-x:hover{background:var(--cx-hover);}
      .ds-body{flex:1;display:flex;overflow:hidden;min-height:0;position:relative;}
      /* Desktop Pieces rail (PiecesRail.jsx) takes the left column; phones and tablets keep the bottom bar and the stage piece switch */
      .ds-rail{display:none;}
      @media (min-width:1024px){
        .ds-rail{order:1;width:216px;flex-shrink:0;display:flex;flex-direction:column;gap:16px;padding:16px;overflow-y:auto;overflow-x:hidden;background:var(--cx-card);border-right:1px solid var(--cx-line);}
      }
      /* Small desktops: a narrower Pieces column so the garment keeps its share of the stage */
      @media (min-width:1024px) and (max-width:1279px){.ds-rail{width:184px;padding:12px;}.ds-rail .ds-rail-thumb{width:36px;}.ds-rail .ds-rail-card{gap:8px;padding:6px;}.ds-rail .ds-rail-txt strong{font-size:14px;}}
      /* Short desktop screens: the zoom hint row gives its height to the garment, as on phones */
      @media (min-width:1024px) and (max-height:820px){.ds-lane-bottom .ds-stage-hint{display:none;}}
      .ds-rail-h{font:400 18px/1.2 var(--cx-serif);color:var(--cx-ink);}
      .ds-rail-list{list-style:none;display:flex;flex-direction:column;gap:8px;margin:0;padding:0;}
      .ds-rail-card{width:100%;min-height:72px;display:flex;align-items:center;gap:12px;padding:8px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);
        background:var(--cx-card);color:var(--cx-ink);text-align:left;font:inherit;transition:border-color .15s,background .15s;}
      button.ds-rail-card{cursor:pointer;}
      button.ds-rail-card:hover{border-color:var(--cx-line-strong);}
      .ds-rail-card[aria-pressed=true],.ds-rail-card[data-single]{border-color:var(--cx-thread);background:var(--cx-thread-tint);box-shadow:inset 0 0 0 1px var(--cx-thread);}
      .ds-rail-card:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      /* Chalk tile: a navy or black garment stays visible on the dark rail */
      .ds-rail-thumb{flex:none;width:56px;height:64px;display:grid;place-items:center;border-radius:12px;background:#F4F5F2;}
      .ds-rail-txt{min-width:0;display:flex;flex-direction:column;gap:2px;}
      .ds-rail-txt small{font-size:13px;font-weight:600;color:var(--cx-ink-2);}
      /* Every width: a long piece name wraps to two lines instead of "Mandarin B…" */
      .ds-rail-txt strong{font-size:15px;font-weight:700;overflow:hidden;white-space:normal;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;line-height:1.25;overflow-wrap:break-word;}
      .ds-rail-acts{display:flex;flex-direction:column;align-items:flex-start;gap:8px;}
      .ds-rail-acts .ds-btn{width:100%;min-height:44px;justify-content:center;}
      .ds-rail-note{margin:0;font-size:13px;line-height:1.4;color:var(--cx-ink-2);}
      .ds-rail-note[data-sheet]{padding:12px 16px 0;}
      /* Docked layers (desktop): fills the column under the pieces and scrolls on its own; the shortcut card sits at the foot */
      .ds-dock{flex:1 1 auto;min-height:120px;display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--cx-line);}
      .ds-dock-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .ds-dock-head h3{display:flex;align-items:center;gap:8px;margin:0;font:400 18px/1.2 var(--cx-serif);color:var(--cx-ink);}
      .ds-dock-head h3 span{min-width:24px;padding:1px 8px;border-radius:999px;background:var(--cx-paper);font:700 12px/18px var(--cx-sans);color:var(--cx-ink-2);text-align:center;}
      .ds-dock-link{min-height:44px;padding:0 4px;border:0;background:none;font:600 13px var(--cx-sans);color:var(--cx-thread-ink);text-decoration:underline;text-underline-offset:3px;cursor:pointer;}
      .ds-dock-list{flex:1;min-height:0;overflow-y:auto;list-style:none;display:flex;flex-direction:column;gap:2px;margin:0 -4px;padding:0 4px;}
      .ds-dock-row{display:flex;align-items:center;border-radius:var(--cx-r-md);}
      .ds-dock-row:hover{background:var(--cx-hover);}
      .ds-dock-row[data-sel]{background:var(--cx-thread-tint);box-shadow:inset 3px 0 0 var(--cx-thread);}
      .ds-dock-row[data-hidden] .ds-dock-pick{opacity:.5;}
      .ds-dock-pick{flex:1;min-width:0;min-height:44px;display:flex;align-items:center;gap:8px;padding:0 4px 0 10px;border:0;background:none;color:var(--cx-ink);font:600 13px var(--cx-sans);text-align:left;cursor:pointer;}
      .ds-dock-pick span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .ds-dock-pick svg{flex:none;color:var(--cx-ink-2);}
      .ds-dock-eye{flex:none;width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:none;color:var(--cx-ink-2);cursor:pointer;}
      .ds-dock-eye:hover{color:var(--cx-ink);}
      :is(.ds-dock-pick,.ds-dock-eye,.ds-dock-link,.ds-keys summary):focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:-2px;}
      .ds-dock-empty{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:16px 12px;border:1px dashed var(--cx-line-strong);border-radius:var(--cx-r-md);text-align:center;}
      .ds-dock-empty p{margin:0;font-size:13px;color:var(--cx-ink-2);}
      .ds-keys{flex:none;margin-top:auto;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-paper-2,transparent);}
      .ds-keys summary{min-height:44px;display:flex;align-items:center;padding:0 12px;font:600 13px var(--cx-sans);color:var(--cx-ink-2);cursor:pointer;list-style-position:inside;}
      .ds-keys dl{display:grid;gap:4px;max-height:240px;overflow-y:auto;margin:0;padding:0 12px 12px;}
      .ds-keys dl>div{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px;}
      .ds-keys dd{margin:0;font-size:13px;color:var(--cx-ink-2);}
      .ds-keys kbd{display:inline-block;min-width:24px;padding:2px 6px;border:1px solid var(--cx-line-strong);border-bottom-width:2px;border-radius:6px;font:600 12px var(--cx-sans);color:var(--cx-ink);text-align:center;}
      /* Help foot of the Pieces column: tour and "?" shortcuts */
      .ds-help{flex:none;margin-top:auto;display:flex;flex-direction:column;gap:8px;}
      .ds-help .ds-keys{margin-top:0;}
      .ds-help-acts{display:grid;grid-template-columns:1fr 44px;gap:8px;}
      .ds-help-howto{grid-column:1/-1;}
      .ds-help-acts .ds-btn{min-height:44px;justify-content:center;}
      .ds-help-acts kbd{font:700 15px var(--cx-sans);}
      .ds-nav-slot:empty{display:none;}
      /* Navigator (desktop Pieces column): live thumbnail, the stage's view framed, zoom slider */
      .ds-navi{flex:none;display:flex;flex-direction:column;gap:8px;padding-top:16px;border-top:1px solid var(--cx-line);}
      .ds-navi-pct{font:700 12px var(--cx-sans);color:var(--cx-ink-2);font-variant-numeric:tabular-nums;}
      .ds-navi-box{max-width:100%;display:grid;place-items:center;border-radius:var(--cx-r-md);background:var(--ds-mat,#d5ddd2);box-shadow:inset 0 0 0 1px var(--cx-line);overflow:hidden;}
      .ds-navi-art{position:relative;cursor:grab;touch-action:none;}
      .ds-navi-art:active{cursor:grabbing;}
      .ds-navi-art:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-navi-art canvas{display:block;}
      .ds-navi-frame{position:absolute;border:2px solid #C4313B;border-radius:3px;box-shadow:0 0 0 999px rgb(15 23 42 / .28);pointer-events:none;}
      .ds-navi-zoom{display:grid;grid-template-columns:44px 1fr 44px 44px;align-items:center;}
      .ds-navi-zoom input{width:100%;min-height:44px;accent-color:var(--cx-thread);}
      @media (max-width:1023px){.ds-navi{display:none;}}
      /* Colours: one-tap rows (this design, recent) and the contrast guide */
      .ds-quick{margin-top:4px;}
      .ds-quick-row{display:flex;flex-wrap:wrap;gap:6px;}
      .ds-quick-sw{width:44px;height:44px;border:2px solid var(--cx-card);border-radius:50%;box-shadow:0 0 0 1px var(--cx-line-strong);cursor:pointer;}
      .ds-quick-sw[aria-pressed=true]{box-shadow:0 0 0 2px var(--cx-thread);}
      .ds-quick-sw:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:3px;}
      .ds-contrast{display:grid;grid-template-columns:auto 1fr;align-items:center;gap:12px;margin-top:16px;padding:12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-paper-2,transparent);}
      .ds-contrast p{margin:0;font-size:13px;line-height:1.45;color:var(--cx-ink-2);}
      .ds-contrast b{color:var(--cx-ink);}
      .ds-contrast[data-level=low] b{color:#C4313B;}
      .ds-contrast-demo{width:44px;height:44px;display:grid;place-items:center;border-radius:12px;font:400 20px var(--cx-serif);box-shadow:inset 0 0 0 1px rgb(15 23 42 / .12);}
      .ds-contrast-pair{display:flex;}
      .ds-contrast-pair i{width:28px;height:44px;box-shadow:inset 0 0 0 1px rgb(15 23 42 / .12);}
      .ds-contrast-pair i:first-child{border-radius:12px 0 0 12px;}
      .ds-contrast-pair i:last-child{border-radius:0 12px 12px 0;}
      /* Gesture confirmation on the stage (undo, fit) */
      .ds-gesture{position:absolute;left:50%;top:16px;z-index:calc(var(--cx-z-stage) + 2);transform:translateX(-50%);padding:8px 16px;border-radius:999px;
        background:#1B2A4A;color:#F4F5F2;font:600 13px var(--cx-sans);box-shadow:0 8px 24px -8px rgb(15 23 42 / .5);pointer-events:none;animation:ds-gesture-in .2s ease-out;}
      @keyframes ds-gesture-in{from{opacity:0;transform:translate(-50%,-6px);}}
      /* Tour and shortcut dialog */
      .ds-tour{position:fixed;inset:0;z-index:calc(var(--cx-z-modal) + 10);}
      .ds-tour-dim{position:absolute;inset:0;background:rgb(15 23 42 / .62);}
      .ds-tour-spot{position:absolute;border-radius:14px;box-shadow:0 0 0 9999px rgb(15 23 42 / .62),0 0 0 2px #028090;pointer-events:none;transition:left .2s,top .2s,width .2s,height .2s;}
      .ds-tour-card,.ds-keysdlg{position:absolute;width:min(340px,calc(100vw - 24px));padding:16px 18px;border-radius:16px;background:#F4F5F2;color:#1B2A4A;
        box-shadow:0 24px 48px -16px rgb(15 23 42 / .55);transition:left .2s,top .2s;}
      .ds-tour-card h2,.ds-keysdlg h2{margin:4px 0 6px;font:400 22px/1.2 var(--cx-serif);color:#1B2A4A;}
      .ds-tour-card p{margin:0;font-size:14px;line-height:1.55;color:#33415c;}
      .ds-tour-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .ds-tour-step{font:600 12px var(--cx-sans);color:#046A78;}
      .ds-tour-x{width:44px;height:44px;margin:-8px -10px -8px 0;display:grid;place-items:center;border:0;border-radius:12px;background:none;color:#1B2A4A;cursor:pointer;}
      .ds-tour-x:hover{background:rgb(27 42 74 / .08);}
      .ds-tour-dots{display:flex;gap:5px;margin:14px 0 4px;}
      .ds-tour-dots i{width:6px;height:6px;border-radius:3px;background:rgb(27 42 74 / .18);transition:width .2s,background .2s;}
      .ds-tour-dots i[data-on]{width:18px;background:#028090;}
      .ds-tour-acts{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px;}
      .ds-tour-acts .ds-link{min-height:44px;color:#046A78;}
      .ds-tour-nav{display:flex;gap:8px;}
      .ds-tour .ds-btn{min-height:44px;}
      .ds-tour :is(button,[tabindex]):focus-visible{outline:2px solid #046A78;outline-offset:2px;}
      .ds-keysdlg{left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,calc(100vw - 24px));max-height:calc(100dvh - 48px);overflow-y:auto;transition:none;}
      .ds-keysdlg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px 24px;margin-top:8px;}
      .ds-keysdlg h3{margin:0 0 8px;font:700 13px var(--cx-sans);color:#046A78;}
      .ds-keysdlg dl{display:grid;gap:6px;margin:0;}
      .ds-keysdlg dl>div{display:grid;grid-template-columns:minmax(96px,auto) 1fr;align-items:center;gap:10px;}
      .ds-keysdlg dd{margin:0;font-size:13px;color:#33415c;}
      .ds-keysdlg kbd{display:inline-block;padding:2px 7px;border:1px solid rgb(27 42 74 / .25);border-bottom-width:2px;border-radius:6px;background:#fff;font:600 12px var(--cx-sans);color:#1B2A4A;}
      .ds-howto-lede{margin:0 0 12px;font-size:14px;color:#33415c;}
      .ds-howto-list{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:8px;}
      .ds-howto-list button{width:100%;min-height:44px;display:grid;gap:2px;text-align:left;padding:12px 14px;border:1px solid rgb(27 42 74 / .14);border-radius:12px;background:#fff;color:#1B2A4A;cursor:pointer;transition:border-color .2s,transform .2s;}
      .ds-howto-list button:hover{border-color:#028090;transform:translateY(-1px);}
      .ds-howto-list strong{font:700 14px var(--cx-sans);}
      .ds-howto-list span{font-size:13px;color:#33415c;}
      .ds-howto-list small{font:600 12px var(--cx-sans);color:#046A78;margin-top:4px;}
      @keyframes ds-dlg-in{from{opacity:0;transform:translate(-50%,-48%) scale(.97);}}
      @keyframes ds-card-in{from{opacity:0;transform:translateY(6px);}}
      .ds-keysdlg{animation:ds-dlg-in .2s ease-out;}
      .ds-tour-card{animation:ds-card-in .2s ease-out;}
      .ds-tour-dim{animation:ds-fade .2s ease-out;}
      @keyframes ds-fade{from{opacity:0;}}
      @media (prefers-reduced-motion:reduce){.ds-tour-spot,.ds-tour-card,.ds-tour-dots i,.ds-howto-list button{transition:none;}.ds-gesture,.ds-keysdlg,.ds-tour-card,.ds-tour-dim{animation:none;}}
      @media (prefers-reduced-motion:reduce){.ds-rail-card{transition:none;}}
      .ds-empty{display:flex;flex-direction:column;align-items:center;gap:8px;padding:28px 16px;text-align:center;border:1px dashed var(--border);border-radius:var(--r-lg);background:var(--bg-surface);}
      .ds-empty-icon{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--teal-50);}
      .ds-empty-title{font-size:var(--text-xs);font-weight:800;color:var(--ink);}
      .ds-empty-sub{font-size:var(--text-2xs);color:var(--text-muted);line-height:1.5;max-width:210px;}
      .ds-sheet-icon{flex-shrink:0;width:30px;height:30px;display:flex;align-items:center;justify-content:center;border-radius:var(--r-md);background:var(--teal-50);color:var(--teal-dark);margin-right:8px;}


      .ds-panel{
        --text-2xs:13px;--text-xs:13px;--text-sm:15px;
        order:3;width:clamp(344px,26vw,392px);flex-shrink:0;display:flex;flex-direction:column;overflow:hidden;
        background:var(--bg-card);border-left:1px solid var(--border);box-shadow:var(--shadow-xs);
      }
      .ds-panel-body{display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;}
      .ds-panel-toggle{display:none;}
      .ds-panel-toggle-t{font-size:12px;font-weight:600;}
      @media (max-width:1023px){.ds-panel-toggle-t{display:none;}}
      @media (min-width:1024px){
        .ds-panel{position:relative;transition:width .2s ease;}
        .ds-panel-toggle{display:flex;position:absolute;top:8px;right:8px;z-index:3;width:44px;height:44px;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-card);color:var(--text-muted);cursor:pointer;}
        .ds-panel-toggle:hover{color:var(--ink);border-color:var(--teal);}
        .ds-sheet-head .ds-panel-toggle{position:static;flex:none;margin-left:8px;width:auto;padding:0 12px;gap:6px;font:600 12px/1 inherit;}
        .ds-panel[data-collapsed]{width:0;min-width:0;border:0;background:transparent;overflow:visible;box-shadow:none;}
        .ds-panel[data-collapsed] > :not(.ds-panel-toggle){display:none;}
        .ds-panel[data-collapsed] .ds-panel-toggle{right:8px;z-index:var(--cx-z-popover);background:var(--cx-card,#fff);border-color:var(--teal);color:var(--teal);box-shadow:var(--shadow-xs);}
      }
      @media (min-width:1024px) and (prefers-reduced-motion:reduce){.ds-panel{transition:none;}}
      .ds-sheet-head{
        display:flex;align-items:center;justify-content:space-between;flex-shrink:0;
        padding:16px 16px 12px;border-bottom:1px solid var(--border);
      }
      .ds-sheet-head h2{font-size:var(--text-sm);font-weight:800;color:var(--ink);line-height:1.2;}
      .ds-sheet-title{flex:1;min-width:0;}
      .ds-sheet-title p{margin-top:4px;font-size:var(--text-2xs);color:var(--text-muted);line-height:1.35;}

      /* Stage: a sage cutting mat with a faint 1 cm screen grid (decoration on the stage, never on the garment or the export) and a
         soft pool of light behind the garment. Dark swaps the mat tokens only; stage ink stays >= 4.5:1 on both. */
      .ds-cv{--ds-mat:#E4E7E1;--ds-mat-lit:#F4F5F2;--ds-mat-line:transparent;--ds-cut:#046A78;
        --cx-stage:var(--ds-mat);--cx-stage-lit:var(--ds-mat-lit);
        order:2;flex:1;min-width:0;display:flex;flex-direction:column;position:relative;overflow:hidden;padding-bottom:var(--ds-pad-b);
        background:linear-gradient(var(--ds-mat-line) 1px,transparent 1px) 0 0/1cm 1cm,linear-gradient(90deg,var(--ds-mat-line) 1px,transparent 1px) 0 0/1cm 1cm,
          radial-gradient(ellipse 58% 52% at 50% 46%,var(--cx-stage-lit) 0%,var(--cx-stage) 72%);color:var(--cx-stage-ink);}
      .ds-cv[data-stage=dark]{--ds-cut:#C9A27A;--ds-mat:#1B2A4A;--ds-mat-lit:#3A5180;--ds-mat-line:transparent;--cx-stage-ink:#F4F5F2;--cx-stage-ink-2:#D8DCE4;}
      .ds-cv[data-stage=dark] :is(.ds-lane,.ds-ruler,.ds-ruler-corner),.ds-pick[data-inline] .ds-pick-head{--cx-stage-ink:#F4F5F2;--cx-stage-ink-2:#D8DCE4;--cx-card:#1B2A4A;--cx-paper:#16233F;--cx-paper-2:#16233F;--cx-line:#46587F;--cx-line-strong:#7686A6;--cx-ink:#F4F5F2;--cx-ink-2:#D8DCE4;--cx-ink-3:#B4BDCC;
        --cx-hover:#2B3E66;--cx-thread:#C9A27A;--cx-thread-ink:#C9A27A;--cx-on-thread:#1B2A4A;--cx-thread-tint:rgb(201 162 122 / .16);}
      .ds-cv[data-stage=dark] .ds-lane .ds-tools{border-color:#7686A6;}
      .ds-cv[data-stage=dark] .ds-lane :is(.ds-tools-btn[aria-pressed=true],.ds-guides-btn[aria-expanded=true]){background:#F4F5F2;border-color:#F4F5F2;color:#1B2A4A;}
      /* Stage lanes: chips, set bar, guides and 3D notes on top; zoom, Front/Back and the stage light below; the garment fits the area between */
      .ds-lane{position:relative;z-index:var(--cx-z-stage);flex:none;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 8px;padding:8px 8px 0;min-width:0;}
      .ds-lane-bottom{padding:0 8px 8px;}
      .ds-lane-top{z-index:calc(var(--cx-z-stage) + 1);} /* the Guides popover opens over the fit area */
      .ds-stage-fit{position:relative;flex:1;min-height:0;}
      .ds-set2d{position:absolute;inset:0;z-index:4;display:flex;flex-direction:column;align-items:center;gap:8px;padding:56px 16px 64px;background:var(--cx-stage);}
      .ds-set2d-fit{flex:1;min-height:0;width:100%;display:flex;align-items:center;justify-content:center;}
      .ds-set2d-note{margin:0;max-width:52ch;text-align:center;font-size:13px;line-height:1.5;color:var(--cx-stage-ink-2);}
      .ds-pane{position:absolute;inset:0;}
      /* First run: the garment picker is the empty state, so no empty panel beside it */
      .ds[data-first] .ds-panel{display:none;}
      /* Swatch names on hover and keyboard focus (the dot's hidden name becomes a label above it) */
      .ds .ds-swatch-dots li{position:relative;}
      .ds .ds-swatch-dots .cx-swatch:is(:hover,:focus-visible) .sr-only{position:absolute;bottom:calc(100% + 4px);left:50%;z-index:5;width:auto;height:auto;margin:0;padding:4px 8px;
        clip:auto;clip-path:none;overflow:visible;white-space:nowrap;transform:translateX(-50%);border-radius:12px;background:var(--cx-ink);color:var(--cx-paper);
        font:600 13px/1.2 var(--cx-sans);box-shadow:var(--shadow-xs);pointer-events:none;}
      /* Colour changes ease over 200ms in the panel (the garment repaints at once) */
      .ds :is(.ds-zone-dot,.ds-zone-sw,.cx-swatch-dot){transition:background-color .2s var(--cx-ease);}
      @media (prefers-reduced-motion:reduce){.ds :is(.ds-zone-dot,.ds-zone-sw,.cx-swatch-dot){transition:none;}}
      /* Stage bar: at most five labelled controls (CanvasViewport.jsx); the zoom level and hints sit on the row under it */
      .ds-ctrlbar{max-width:100%;display:flex;align-items:stretch;gap:2px;padding:4px;border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);background:var(--cx-card);box-shadow:var(--cx-elev-1);}
      .ds-ctrl{min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;border:1px solid transparent;border-radius:var(--cx-r-md);
        background:transparent;color:var(--cx-ink);font:600 13px/1.15 var(--cx-sans);white-space:nowrap;cursor:pointer;transition:background .15s,color .15s;}
      .ds-ctrl:hover:not(:disabled){background:var(--cx-hover);}
      .ds-ctrl[aria-pressed=true]{background:var(--cx-thread-tint);border-color:var(--cx-thread);color:var(--cx-thread-ink);}
      .ds-ctrl:disabled{color:var(--cx-ink-3);cursor:not-allowed;}
      .ds-ctrl:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-ctrl--lane{border-color:var(--cx-line);background:var(--cx-card);}
      .ds-lane-bottom{flex-direction:column;gap:4px;}
      .ds-lane-bottom .ds-stage-hint output{font-variant-numeric:tabular-nums;font-weight:700;color:var(--cx-stage-ink);}
      @media (max-width:599px){
        .ds-ctrlbar{width:100%;}
        .ds-ctrlbar .ds-ctrl{flex:1 1 0;min-width:0;flex-direction:column;gap:2px;padding:4px 2px;font-size:13px;white-space:normal;text-align:center;}
      }
      @media (prefers-reduced-motion:reduce){.ds-ctrl{transition:none;}}
      /* Floating contextual toolbar, anchored above the selection */
      .ds-ftb{position:absolute;z-index:var(--cx-z-stage);display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:2px;max-width:calc(100% - 16px);padding:4px 4px 4px 12px;white-space:nowrap;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);background:var(--cx-card);box-shadow:var(--cx-elev-2);}
      .ds-ftb-kind{margin-right:8px;font-size:13px;font-weight:700;color:var(--cx-ink-2);}
      .ds-ftb-slot{display:contents;} /* alignment: centre one element on the garment, align 2+, distribute 3+ */
      .ds-ftb button{width:40px;height:40px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink);cursor:pointer;transition:background .15s;}
      .ds-ftb button:hover{background:var(--cx-hover);}
      .ds-ftb .ds-ftb-danger{color:var(--danger-text);}
      .ds-ftb .ds-ftb-danger:hover{background:var(--danger-bg);}
      .ds-stage-note{max-width:100%;padding:4px 12px;border-radius:var(--cx-r-md);background:var(--cx-ink);color:var(--cx-paper);
        font-size:13px;font-weight:700;pointer-events:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .ds-stage-note[data-tone=warn]{background:var(--warning-text);color:var(--text-on-accent);}
      .ds-stage-hint{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:var(--cx-stage-ink-2);}
      .ds-stage-text{color:var(--cx-stage-ink-2);font-size:13px;line-height:1.6;}
      /* Full screen (native) or the expanded stage (app-level fallback): the top bar steps aside so the canvas gains its height. */
      .ds[data-expanded]{height:100dvh;}
      .ds[data-expanded=app]{position:fixed;inset:0;z-index:var(--cx-z-modal);}
      .ds[data-expanded] .ds-bar{display:none;}
      .ds[data-expanded] .ds-draft{display:none;}
      /* Immersive 3D: only the model and one Exit button. */
      .ds[data-immersive] :is(.ds-bar,.ds-draft,.ds-rail,.ds-panel,.ds-sheet,.ds-lane,.ds-toast,.ds-ruler,.ds-ruler-corner,.ds-pill){display:none !important;}
      .ds[data-immersive] .ds-cv{padding:0 !important;}
      .ds[data-immersive] .ds-pane{inset:0 !important;}
      .ds-exit3d{position:absolute;top:max(12px,env(safe-area-inset-top));right:max(12px,env(safe-area-inset-right));z-index:var(--cx-z-popover);display:flex;align-items:center;gap:8px;}
      .ds-exit3d button{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid var(--cx-line-strong,#7686A6);border-radius:999px;background:#1B2A4A;color:#F4F5F2;font:700 14px/1 inherit;cursor:pointer;box-shadow:0 2px 10px rgba(0,0,0,.25);transition:background .15s,transform .15s;}
      .ds-exit3d button:hover{background:#028090;}
      .ds-exit3d button:focus-visible{outline:3px solid #02C39A;outline-offset:2px;}
      @media (prefers-reduced-motion:reduce){.ds-exit3d button{transition:none;}}

      /* The one garment picker (inline on the empty stage, or in the picker modal) */
      .ds-pick{display:flex;flex-direction:column;align-items:center;gap:16px;width:100%;}
      .ds-pick[data-inline]{position:absolute;inset:0;z-index:var(--cx-z-stage);overflow-y:auto;overscroll-behavior:contain;padding:8px clamp(16px,4vw,48px) 0;}
      .ds-pick[data-inline]>.ds-pick-grid:last-child,.ds-pick[data-inline]>.ds-note:last-child{margin-bottom:24px;}
      .ds-pick-head{position:sticky;top:0;z-index:2;width:100%;max-width:1040px;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 0 8px;text-align:center;background:var(--cx-stage);}
      .ds-modal .ds-pick-head{padding-top:16px;background:var(--cx-card);}
      .ds-pick-titlebar{width:100%;display:grid;grid-template-columns:44px 1fr 44px;align-items:center;gap:4px;}
      .ds-pick-titlebar h2{grid-column:2;}
      .ds-pick-foot{position:sticky;bottom:0;z-index:2;width:100%;max-width:1040px;display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px;padding:12px 0;
        border-top:1px solid var(--cx-line);background:var(--cx-stage);}
      .ds-modal .ds-pick-foot{background:var(--cx-card);}
      .ds-pick-foot .ds-btn{min-height:44px;}
      @media (max-width:599px){
        .ds-pick-foot:has(.ds-btn--primary){flex-direction:column-reverse;align-items:stretch;}
        .ds-pick-foot:has(.ds-btn--primary) .ds-btn{width:100%;}
        .ds-pick-foot:has(.ds-btn--primary)>.ds-btn:first-child{border-color:transparent;background:none;box-shadow:none;color:#046A78;text-decoration:underline;}
      }
      .ds-pick-count{margin-right:auto;font-size:13px;font-weight:600;color:var(--cx-ink-2);}
      .ds-pick[data-inline] .ds-pick-count{color:var(--cx-stage-ink-2);}
      .ds-pick-past{width:100%;max-width:1040px;}
      .ds-pick-head h2{font:400 clamp(22px,3vw,30px)/1.15 var(--cx-serif);color:var(--cx-stage-ink);}
      .ds-pick-head p{font-size:13px;line-height:1.5;color:var(--cx-stage-ink-2);}
      .ds-modal .ds-pick-head h2{color:var(--cx-ink);}
      .ds-modal .ds-pick-head p{color:var(--cx-ink-2);}
      .ds-pick-tabs{display:inline-flex;gap:2px;margin-top:4px;padding:4px;border-radius:var(--cx-r-md);background:var(--cx-paper-2);}
      .ds-pick-tabs button{min-height:40px;padding:0 16px;border:0;border-radius:12px;background:transparent;color:var(--cx-ink-2);font:700 13px var(--cx-sans);cursor:pointer;}
      .ds-pick-tabs button[aria-checked=true]{background:var(--cx-card);color:var(--cx-thread-ink);box-shadow:var(--cx-elev-0);}
      .ds-pick-tools{width:100%;max-width:1040px;display:flex;flex-direction:column;gap:8px;}
      .ds-pick-search{width:100%;min-height:44px;padding:0 16px;border:1px solid var(--cx-line-strong);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink);font:13px var(--cx-sans);}
      .ds-pick-search:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:1px;}
      .ds-pick-filters{border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);}
      .ds-pick-filters>summary{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 16px;cursor:pointer;list-style:none;font-size:13px;font-weight:700;color:var(--cx-ink);}
      .ds-pick-filters>summary::-webkit-details-marker{display:none;}
      .ds-pick-filters[open]{padding-bottom:8px;}
      .ds-pick-filters>.ds-btn{margin:4px 16px 0;}
      .ds-pick-frow{display:flex;flex-wrap:wrap;align-items:center;gap:8px;padding:8px 16px;}
      .ds-pick-frow>span{flex:0 0 64px;font-size:13px;font-weight:700;color:var(--cx-ink-2);}
      .ds-pick .ds-chips,.ds-pick-head .ds-chips{justify-content:center;}
      .ds-pick-tools .ds-chips{justify-content:flex-start;}
      .ds-pick-legend{width:100%;max-width:1040px;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;font-size:13px;font-weight:600;color:var(--cx-stage-ink-2);}
      .ds-modal .ds-pick-legend{color:var(--cx-ink-2);}
      .ds-pick-legend{justify-content:center;}
      .ds-pick-key{display:inline-flex;align-items:center;gap:4px;}
      .ds-pick-key-ic{width:20px;height:20px;display:grid;place-items:center;border-radius:50%;background:var(--cx-card);color:var(--cx-ink);box-shadow:var(--cx-elev-1);}
      .ds-pick-grid{list-style:none;width:100%;max-width:1040px;display:grid;grid-template-columns:repeat(auto-fill,minmax(148px,1fr));gap:12px;}
      .ds-pick-viewsw{align-self:flex-start;margin-bottom:8px;}
      .ds-pick-viewsw button{min-width:44px;}
      .ds-car{width:100%;max-width:720px;display:flex;flex-direction:column;align-items:center;gap:12px;}
      .ds-car-stage{width:100%;display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;gap:8px;}
      .ds-car-nav{width:44px;height:44px;display:flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:50%;background:var(--bg-surface);color:var(--ink);cursor:pointer;}
      .ds-car-nav:disabled{opacity:.35;cursor:default;}
      .ds-car-hero{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;}
      .ds-car-hero .ds-pick-img{width:min(100%,280px);aspect-ratio:1;position:relative;display:flex;align-items:center;justify-content:center;border-radius:var(--r-lg);background:var(--bg-card);}
      .ds-car-hero .ds-pick-img img,.ds-car-hero .ds-pick-img svg{max-width:85%;max-height:85%;}
      .ds-car-hero figcaption{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;text-align:center;}
      .ds-car-hero .ds-pick-badge{position:static;flex:none;}
      .ds-car-tier{display:inline-flex;align-items:center;gap:8px;font-size:var(--text-xs);color:var(--text-muted);}
      .ds-car-pos{font-size:var(--text-xs);color:var(--text-subtle);}
      .ds-car-colour{width:100%;display:flex;flex-direction:column;gap:8px;font-size:var(--text-xs);font-weight:600;color:var(--text-muted);}
      .ds-car-strip{list-style:none;margin:0;padding:4px 2px;width:100%;display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;}
      .ds-car-strip li{flex:none;scroll-snap-align:center;}
      .ds-car-thumb{width:64px;height:64px;padding:0;border:2px solid var(--border);border-radius:var(--r-md);background:var(--bg-card);cursor:pointer;overflow:hidden;}
      .ds-car-thumb[aria-pressed="true"]{border-color:var(--teal);}
      .ds-car-thumb .ds-pick-img{width:100%;height:100%;display:flex;align-items:center;justify-content:center;}
      .ds-car-thumb .ds-pick-img img,.ds-car-thumb .ds-pick-img svg{max-width:90%;max-height:90%;}
      .ds-car-thumb .ds-sketch{display:none;}
      .ds-car-go{min-height:44px;width:min(100%,320px);}
      @media (prefers-reduced-motion: reduce){.ds-car-hero .ds-pick-img{animation:none;}}
      .ds-pick-card{position:relative;width:100%;height:100%;display:flex;flex-direction:column;gap:8px;padding:8px 8px 8px;border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);
        background:var(--cx-card);color:var(--cx-ink);text-align:left;cursor:pointer;box-shadow:var(--cx-elev-0);
        transition:transform var(--cx-dur-2) var(--cx-ease),box-shadow var(--cx-dur-2) var(--cx-ease),border-color var(--cx-dur-2);}
      .ds-pick-card:hover{box-shadow:var(--cx-elev-1);border-color:var(--cx-line-strong);}
      .ds-pick-card[aria-pressed=true]{border-color:var(--cx-thread);box-shadow:0 0 0 2px var(--cx-thread-ring);}
      .ds-pick-card:focus-within{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-pick-img{display:grid;place-items:center;aspect-ratio:3/4;border-radius:var(--cx-r-md);background:var(--cx-paper);overflow:hidden;color:var(--cx-thread-ink);}
      .ds-pick-img img{width:100%;height:100%;object-fit:contain;}
      .ds-pick-card strong{font-size:13px;font-weight:700;line-height:1.3;}
      .ds-cap3d{display:inline-flex;align-items:center;gap:5px;max-width:100%;padding:3px 8px;border-radius:999px;border:1px solid var(--cx-line);background:var(--cx-card);color:var(--cx-ink);font:700 12px/16px var(--cx-sans);}
      .ds-cap3d[data-cap=verified]{color:#046A78;border-color:currentColor;}
      .ds-cap3d[data-cap=none],.ds-cap3d[data-cap=reference]{color:var(--cx-ink-2);}
      .ds-pick-card .ds-cap3d{align-self:flex-start;margin-top:auto;}
      .ds-pick-sub{font-size:13px;font-weight:600;color:var(--cx-ink-2);line-height:1.4;}
      .ds-pick-badge{position:absolute;top:14px;right:14px;width:26px;height:26px;display:grid;place-items:center;border-radius:50%;background:var(--cx-card);color:var(--cx-ink);box-shadow:var(--cx-elev-1);}
      .ds-pick-card:disabled{opacity:.45;cursor:not-allowed;transform:none;box-shadow:none;}
      .ds-chip-x{display:inline-flex;align-items:center;gap:4px;}
      .ds-pick-link{min-height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 12px;border:0;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-thread-ink);font:700 13px var(--cx-sans);cursor:pointer;}
      .ds-pick-preview{width:100%;max-width:640px;display:grid;justify-items:center;gap:8px;text-align:center;}
      .ds-pick-preview img{max-width:100%;max-height:min(50vh,420px);object-fit:contain;border-radius:var(--cx-r-md);background:var(--cx-paper);}
      .ds-pick-preview h3{font:400 24px/1.2 var(--cx-serif);color:var(--cx-ink);}
      .ds-pick[data-inline] .ds-pick-preview h3{color:var(--cx-stage-ink);}
      .ds-pick[data-inline] .ds-pick-preview .ds-note,.ds-pick[data-inline] .ds-pick-preview .ds-pick-sub{color:var(--cx-stage-ink-2);}
      .ds-pick-actions{display:flex;flex-wrap:wrap;justify-content:center;gap:8px;}
      .ds-pick-actions .ds-btn{min-height:44px;}
      .ds-pick-sum{max-width:52ch;font-size:13px;line-height:1.5;color:var(--cx-ink);}
      /* "Start from scratch" step 2 and the "From reference" group of derived templates. */
      .ds-pick-steps .ds-pick-img{width:min(220px,60vw);aspect-ratio:4/5;display:grid;place-items:center;position:relative;}
      .ds-pick-steps .ds-pick-frow{justify-content:center;}
      /* Build your own: shape controls (picker step and Garment panel) */
      .ds-pick-facets{display:flex;flex-direction:column;gap:2px;margin:4px 0 8px;}
      .ds-pick-facets .ds-pick-frow{padding:4px 0;}
      .ds-pick-pair{margin:4px 0 16px;padding:12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);background:var(--cx-paper-2);}
      .ds-pick-pair h3,.ds-pick-subh{margin:0 0 4px;font-size:13px;font-weight:800;}
      .ds-pick-subh{margin:8px 0 8px;}
      .ds-pick-pairnote{margin:4px 0 12px;}
      .ds-trace-slot{position:absolute;inset:0;pointer-events:none;}
      .ds-trace{position:absolute;max-width:none;pointer-events:none;user-select:none;object-fit:contain;}
      .ds-trace[data-over]{z-index:3;mix-blend-mode:multiply;}
      .ds-trace-ctl{display:grid;gap:8px;}
      .ds-byo{display:grid;gap:8px;width:100%;}
      .ds-byo-range{padding:4px 16px;}
      .ds-byo-range output{margin-left:4px;color:var(--cx-ink);font-variant-numeric:tabular-nums;}
      .ds-byo-ends{display:flex;justify-content:space-between;font-weight:600;color:var(--cx-ink-3);}
      .ds-byo-check{display:inline-flex;align-items:center;gap:8px;min-height:36px;padding:0 8px;font-size:13px;font-weight:600;cursor:pointer;}
      .ds-byo-check input{width:18px;height:18px;accent-color:var(--teal);}
      .ds-byo-note{margin:8px 16px 0;}
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
      .ds-pick-sec{width:100%;max-width:1040px;display:grid;gap:8px;margin-top:16px;padding-top:16px;border-top:1px dashed var(--cx-line);}
      .ds-pick-sec>h3{font:600 15px/1.3 var(--cx-sans);color:var(--cx-ink);padding:0 16px;}
      .ds-pick[data-inline] .ds-pick-sec>h3{color:var(--cx-stage-ink);}
      .ds-pick-sec>.ds-note{padding:0 16px;}
      .ds-pick[data-inline] .ds-pick-sum{color:var(--cx-stage-ink);}
      .ds-pick-status{list-style:none;display:flex;flex-wrap:wrap;justify-content:center;gap:8px;}
      .ds-pick-status li{padding:4px 8px;border-radius:var(--cx-r-md);background:var(--cx-paper-2);color:var(--cx-ink-2);font-size:13px;font-weight:600;}
      /* Photo + read-only 3D reference: side by side on desktop, a Photo | 3D switch below 1024px */
      .ds-pick-preview:has(.ds-pick-media){max-width:900px;}
      .ds-pick-media{width:100%;display:grid;grid-template-columns:1fr 1fr;gap:12px;align-items:start;}
      .ds-pick-media figure{margin:0;display:flex;flex-direction:column;gap:8px;min-width:0;}
      .ds-pick-media .ds-pick-photo img{width:100%;height:min(50vh,360px);max-height:none;}
      .ds-pick-media>.ds-pick-switch{display:none;}
      .ds-ref3d-stage{position:relative;width:100%;height:min(50vh,360px);border-radius:var(--cx-r-md);overflow:hidden;background:var(--cx-paper-2);touch-action:none;}
      .ds-ref3d-skel{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font-size:13px;font-weight:600;color:var(--cx-ink-2);
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
      .ds-colors{padding:8px 8px 16px;}
      .ds-zones{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}
      .ds-zone-more{margin:0 0 12px;}
      .ds-zone-more summary{min-height:44px;line-height:44px;font:600 13px/44px var(--cx-sans);color:var(--cx-ink-2);cursor:pointer;}
      .ds-zone-more[open] summary{margin-bottom:8px;}
      .ds-zone{min-height:40px;display:inline-flex;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink-2);font:600 13px var(--cx-sans);cursor:pointer;}
      .ds-zone[aria-pressed=true]{border-color:var(--cx-thread);background:var(--cx-thread-tint);color:var(--cx-thread-ink);font-weight:700;}
      .ds-zone-sw{width:14px;height:14px;border-radius:50%;box-shadow:inset 0 0 0 1px rgb(var(--cx-shade) / .25);}
      .ds-swatch-dots{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(44px,1fr));gap:2px;margin:0 0 8px;}
      .ds-custom{display:flex;align-items:center;gap:8px;}
      .ds-custom-sw{width:44px;height:44px;padding:4px;flex-shrink:0;border:1px solid var(--cx-line-strong);border-radius:50%;background:var(--cx-card);cursor:pointer;}
      .ds-custom-sw::-webkit-color-swatch-wrapper{padding:0;}
      .ds-custom-sw::-webkit-color-swatch{border:0;border-radius:50%;}
      .ds-custom-sw::-moz-color-swatch{border:0;border-radius:50%;}
      .ds-custom-hex{flex:1;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--cx-ink-2);}
      .ds-custom-hex input{flex:1;min-width:0;min-height:44px;padding:0 12px;border:1px solid var(--cx-line-strong);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink);font:600 13px ui-monospace,monospace;text-transform:uppercase;}
      .ds-custom-hex input[aria-invalid=true]{border-color:var(--danger-text);}
      .ds-h3-val{text-transform:none;letter-spacing:0;color:var(--cx-ink);}
      /* Honest label on a flat template drawing (no photo base for it) */
      .ds-sketch{display:inline-block;padding:2px 8px;border-radius:var(--cx-r-md);background:var(--cx-paper-2);color:var(--cx-ink-2);font-size:13px;font-weight:700;letter-spacing:.02em;}
      .ds-pick-img,.ds-sketch-wrap{position:relative;}
      .ds-pick-img .ds-sketch,.ds-sketch-wrap .ds-sketch{position:absolute;left:6px;bottom:6px;}
      /* Picker modal */
      .ds-modal{position:absolute;top:64px;left:50%;z-index:var(--cx-z-modal);width:min(760px,calc(100vw - 24px));max-height:calc(100dvh - 88px);overflow-y:auto;overscroll-behavior:contain;
        padding:0 clamp(12px,3vw,24px);border:1px solid var(--cx-line);border-radius:var(--cx-r-xl);background:var(--cx-card);box-shadow:var(--cx-elev-2);}
      .ds-pick-close{grid-column:3;width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink-2);cursor:pointer;}
      .ds-pick-sec{margin:0 0 8px;font-size:13px;font-weight:800;color:var(--cx-ink);}
      /* Garment panel and panel structure */
      .ds-panel-prompt{margin:16px;padding:16px;border:1px dashed var(--cx-line-strong);border-radius:var(--cx-r-md);font-size:13px;line-height:1.5;color:var(--cx-ink-2);text-align:center;}
      .ds-tp-change{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .ds-tp-change .ds-btn{min-height:40px;}
      /* Whole uniform and one-part views */
      .ds-wu-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;}
      .ds-wu-head h3{margin:0;font:400 20px/1.2 var(--cx-serif);color:var(--cx-ink);}
      .ds-wu-sum{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px 16px;margin:0 0 8px;padding:12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-paper-2);}
      .ds-wu-sum dt{font-size:13px;font-weight:700;color:var(--cx-ink-2);}
      .ds-wu-sum dd{margin:0;font-size:14px;font-weight:700;color:var(--cx-ink);overflow-wrap:anywhere;}
      .ds-parts{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;margin-bottom:12px;}
      .ds-part{min-height:52px;display:grid;grid-template-columns:auto 1fr;grid-template-rows:auto auto;column-gap:8px;align-items:center;padding:6px 12px;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink);text-align:left;cursor:pointer;
        transition:border-color var(--cx-dur-1) var(--cx-ease),background-color var(--cx-dur-1) var(--cx-ease);}
      .ds-pieces-h{font:400 20px/1.2 var(--cx-serif);color:var(--cx-ink);}
      .ds-pieces-sub{margin:2px 0 8px;font-size:13px;color:var(--cx-ink-2);}
      .ds-piece{grid-row:span 2;width:32px;height:36px;overflow:visible;}
      .ds-piece path{stroke:rgb(27 42 74 / .6);stroke-width:1px;vector-effect:non-scaling-stroke;}
      .ds-part>.ds-zone-sw{grid-row:span 2;width:22px;height:22px;}
      .ds-part>.ds-zone-sw[data-off]{background:repeating-linear-gradient(-45deg,var(--cx-line) 0 2px,transparent 2px 5px);}
      .ds-part-name{font:700 14px var(--cx-sans);}
      .ds-part-val{font:600 13px var(--cx-sans);color:var(--cx-ink-2);}
      .ds-part:hover{border-color:var(--cx-thread);}
      .ds-part[aria-pressed=true]{border-color:var(--cx-thread);background:var(--cx-thread-tint);}
      .ds-part--link{min-height:44px;width:100%;grid-template-columns:auto 1fr auto;grid-template-rows:auto;}
      .ds-part-head{display:flex;align-items:stretch;gap:8px;margin-bottom:12px;}
      .ds-part-head .ds-zone-now{flex:1;min-width:0;margin:0;}
      .ds-part-done{min-width:72px;justify-content:center;}
      .ds-part-sec{margin:0 0 12px;}
      @media (prefers-reduced-motion:reduce){.ds-part{transition:none;}}
      .ds-acc-sw{padding:4px 16px 16px;}
      .ds-acc-sw .ds-swatch-chips{margin:0;}
      .ds-lay-empty{display:flex;flex-direction:column;align-items:flex-start;gap:8px;font-size:13px;line-height:1.5;color:var(--cx-ink-2);}
      .ds-lay-empty .ds-btn{min-height:44px;}
      .ds-artboard{transition:opacity var(--cx-dur-2) var(--cx-ease);}
      .ds-artboard[data-fading]{opacity:.35;}
      .ds-table-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;}
      .ds-cut,.ds-cut-hole{fill:none;stroke-linejoin:round;}
      .ds-cut{stroke:var(--ds-cut);}
      .ds-cut-hole{stroke:#000;fill:#000;}
      .ds-open{fill-rule:evenodd;transform-box:fill-box;transform-origin:center;animation:440ms cubic-bezier(.2,.8,.2,1) backwards;}
      .ds-open-bd{animation-name:dsOpenB;}
      .ds-open-sl{animation-name:dsOpenL;animation-delay:80ms;}
      .ds-open-sr{animation-name:dsOpenR;animation-delay:80ms;}
      .ds-open-cl{animation-name:dsOpenC;animation-delay:120ms;}
      .ds-open-pk{animation-name:dsOpenP;animation-delay:160ms;}
      @keyframes dsOpenB{from{transform:translateY(2%)}}
      @keyframes dsOpenL{from{transform:translate(-55%,12%) rotate(-11deg)}}
      @keyframes dsOpenR{from{transform:translate(55%,12%) rotate(11deg)}}
      @keyframes dsOpenC{from{transform:translateY(-20%)}}
      @keyframes dsOpenP{from{transform:translateY(25%) scale(.9)}}
      @keyframes dsOpenCanvas{0%,75%{opacity:0}100%{opacity:1}}
      .ds-artboard[data-opening] .canvas-container{animation:dsOpenCanvas 600ms linear both;}
      @media (prefers-reduced-motion:reduce){.ds-open{display:none;}.ds-artboard[data-opening] .canvas-container{animation:none;}}
      .ds-artboard[data-empty]{position:absolute!important;visibility:hidden;}
      .ds-artboard canvas{filter:drop-shadow(0 16px 24px rgb(var(--cx-shade) / .26));}
      @media (prefers-reduced-motion:reduce){.ds-pick-grid li{animation:none;}.ds-pick-card,.ds-artboard{transition:none;}.ds-pick-card:hover{transform:none;}}

      .ds-sum{display:flex;flex-direction:column;gap:8px;flex:1;min-height:0;padding:12px;overflow-y:auto;}
      .ds-eyebrow{font-size:var(--text-xs);font-weight:700;color:var(--text-muted);}
      .ds-group-label{font-size:var(--text-2xs);font-weight:800;color:var(--text-muted);margin:16px 0 2px;}
      .ds-swatches{list-style:none;display:flex;flex-direction:column;gap:8px;}
      .ds-swatches li{display:flex;align-items:center;gap:8px;}
      .ds-swatch{width:24px;height:24px;flex-shrink:0;border-radius:12px;border:1px solid var(--border-strong);}
      .ds-swatch-name{display:block;font-size:var(--text-xs);color:var(--text-muted);}
      .ds-swatch-hex{display:block;font-size:var(--text-2xs);font-weight:600;color:var(--text-subtle);font-family:ui-monospace,monospace;}
      .ds-sum-title{font-size:var(--text-sm);font-weight:700;color:var(--ink);}
      .ds-sum-sub{font-size:var(--text-xs);color:var(--text-subtle);}
      .ds-act{
        min-height:44px;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 12px;
        border:1px solid var(--border-strong);border-radius:var(--r-md);background:var(--bg-card);color:var(--ink);
        font-size:var(--text-xs);font-weight:700;cursor:pointer;
      }
      .ds-act:disabled{opacity:.45;cursor:not-allowed;}
      .ds-act[aria-busy="true"]:disabled{opacity:.9;cursor:progress;}
      .ds-sum-card{display:flex;align-items:center;gap:12px;padding:8px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);box-shadow:var(--shadow-xs);}
      .ds-sum-thumb{flex-shrink:0;width:72px;height:84px;display:flex;align-items:center;justify-content:center;border-radius:12px;background:var(--bg-card);}
      .ds-swatch-row{list-style:none;display:flex;flex-wrap:wrap;gap:8px 12px;}
      .ds-swatch-row li{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:44px;}
      .ds-swatch--lg{width:32px;height:32px;border-radius:50%;box-shadow:var(--shadow-xs);}
      .ds-swatch-row .ds-swatch-name{font-size:var(--text-2xs);}
      .ds-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-act--wide{grid-column:1 / -1;}
      .ds-link-danger{min-height:36px;display:flex;align-items:center;justify-content:center;gap:4px;border:0;background:none;color:var(--text-muted);font-size:var(--text-xs);font-weight:700;cursor:pointer;border-radius:var(--r-md);transition:color .15s,background .15s;}
      .ds-link-danger:hover{color:var(--danger-text);background:var(--danger-bg);}
      .ds-jump{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;background:var(--bg-card);}
      .ds-jump button{min-height:44px;display:flex;align-items:center;gap:8px;padding:0 12px;border:0;border-bottom:1px solid var(--border);background:none;color:var(--ink);font-size:var(--text-xs);font-weight:700;text-align:left;cursor:pointer;transition:background .15s;}
      .ds-jump button:last-child{border-bottom:0;}
      .ds-jump button:hover{background:var(--teal-50);}
      .ds-jump button span{flex:1;}
      .ds-jump button em{font-style:normal;font-weight:600;color:var(--text-muted);}
      .ds-act--primary{background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}

      .ai-pulse{
        position:absolute;inset:0;pointer-events:none;z-index:var(--cx-z-stage);border-radius:var(--r-lg);
        background:color-mix(in srgb,var(--teal) 8%,transparent);border:2px solid color-mix(in srgb,var(--teal) 40%,transparent);
        animation:aiPulse .6s ease-in-out 2;
      }


      .ds-assets{display:flex;flex-direction:column;flex:1;min-height:0;}
      .ds-assets-body{flex:1;min-height:0;overflow-y:auto;padding:16px 16px 20px;}
      .ds-stack{display:flex;flex-direction:column;gap:16px;}
      .ds-h3{font-size:var(--text-2xs);font-weight:800;color:var(--text-muted);margin-bottom:8px;}
      .ds-note{font-size:var(--text-2xs);line-height:1.45;color:var(--text-muted);margin-top:8px;}
      .ds-seg{display:flex;gap:2px;margin:12px 16px 0;padding:4px;border-radius:var(--r-md);background:var(--bg-surface);border:1px solid var(--border);}
      .ds-seg--sm{margin:0;}
      .ds-seg button{
        flex:1;min-height:32px;display:flex;align-items:center;justify-content:center;gap:4px;padding:0 8px;
        border:0;border-radius:12px;background:transparent;color:var(--text-muted);
        font-size:var(--text-xs);font-weight:700;cursor:pointer;transition:background .15s,color .15s;
      }
      .ds-seg button:hover{color:var(--ink);}
      .ds-seg button[aria-selected="true"],.ds-seg button[aria-checked="true"]{background:var(--bg-card);color:var(--teal-dark);box-shadow:var(--shadow-xs);}
      .ds-chips{display:flex;flex-wrap:wrap;gap:8px;}
      .ds-chip{
        min-height:44px;padding:0 16px;border:1px solid var(--border);border-radius:14px;background:var(--bg-card);
        color:var(--text-muted);font-size:var(--text-xs);font-weight:600;cursor:pointer;transition:all .15s;
      }
      .ds-chip:hover{border-color:var(--teal);color:var(--ink);}
      .ds-chip:is([aria-pressed="true"],[aria-checked="true"]){background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}
      .ds-chip:disabled{opacity:.4;cursor:not-allowed;}
      .ds-chip:disabled:hover{border-color:var(--border);color:var(--text-muted);}
      .ds-drop{
        display:flex;flex-direction:column;align-items:center;gap:8px;padding:24px 16px;text-align:center;
        border:2px dashed color-mix(in srgb,var(--teal) 45%,transparent);border-radius:var(--r-lg);
        background:var(--bg-surface);color:var(--text-muted);cursor:pointer;transition:all .15s;
      }
      .ds-drop strong{font-size:var(--text-xs);color:var(--ink);}
      .ds-drop span{font-size:var(--text-2xs);}
      .ds-drop:hover:not(:disabled),.ds-drop[data-drag]{border-color:var(--teal);background:var(--teal-50);}
      .ds-drop:disabled{opacity:.6;cursor:not-allowed;border-color:var(--border-strong);}
      .ds-status{padding:12px;border-radius:var(--r-md);border:1px solid var(--border);background:var(--bg-card);display:flex;flex-direction:column;gap:8px;}
      .ds-status[data-phase="done"]{border-color:color-mix(in srgb,var(--teal) 55%,transparent);background:var(--teal-50);}
      /* Error card keeps its light danger fill in the dark chrome, so its text takes the danger ink, not the chrome's light ink */
      .ds-status[data-phase="error"]{border-color:var(--danger-text);background:var(--danger-bg);color:var(--danger-text);}
      .ds-status[data-phase="error"] :is(.ds-note,.ds-link){color:inherit;}
      .ds-status-row{display:flex;align-items:center;gap:8px;font-size:var(--text-xs);color:var(--ink);}
      .ds-status[data-phase="error"] .ds-status-row{color:var(--danger-text);}
      .ds-status .ds-note{margin-top:0;}
      .ds-status-actions{display:flex;flex-wrap:wrap;gap:8px;}
      .ds-status-actions .ds-btn{min-height:44px;}
      /* Upload review: before/after, the remove-background switch and "Use as" */
      .ds-ba{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-ba figure{margin:0;display:flex;flex-direction:column;gap:4px;}
      .ds-ba figcaption{font-size:13px;font-weight:700;color:var(--cx-ink-2);text-align:center;}
      .ds-switch{min-height:44px;display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--cx-ink);cursor:pointer;}
      .ds-switch input,.ds-useas input{width:18px;height:18px;accent-color:var(--cx-thread);flex-shrink:0;}
      .ds-useas{border:0;padding:0;margin:0;display:flex;flex-direction:column;gap:2px;}
      .ds-useas legend{margin-bottom:4px;font-size:13px;font-weight:800;color:var(--cx-ink);}
      .ds-useas label{min-height:44px;display:flex;align-items:center;gap:8px;padding:4px 8px;border-radius:var(--cx-r-md);cursor:pointer;}
      .ds-useas label:has(input:checked){background:var(--cx-thread-tint);}
      .ds-useas b{display:block;font-size:13px;color:var(--cx-ink);}
      .ds-useas small{display:block;font-size:13px;color:var(--cx-ink-2);}
      .ds-spin{width:14px;height:14px;border:2px solid color-mix(in srgb,var(--teal) 30%,transparent);border-top-color:var(--teal);border-radius:50%;animation:dspin .7s linear infinite;}
      .ds-bar-track{height:6px;border-radius:14px;background:var(--border);overflow:hidden;}
      .ds-bar-track span{display:block;height:100%;background:var(--teal);transition:width .2s;}
      .ds-btn{
        min-height:32px;padding:0 12px;display:inline-flex;align-items:center;gap:4px;border:1px solid var(--border-strong);
        border-radius:12px;background:var(--bg-card);color:var(--ink);font-size:var(--text-xs);font-weight:700;cursor:pointer;
      }
      .ds .ds-btn:not(.ds-btn--primary){border-color:#7686A6;}
      .ds .ds-btn:not(.ds-btn--primary):hover{border-color:var(--teal);}
      .ds-btn--primary{background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}
      .ds-link{align-self:flex-start;border:0;background:none;padding:0;color:var(--text-muted);font-size:var(--text-2xs);text-decoration:underline;cursor:pointer;}
      .ds-checker{
        display:flex;align-items:center;justify-content:center;height:96px;border-radius:12px;
        background:repeating-conic-gradient(#e2e8f0 0% 25%,#fff 0% 50%) 0 0/14px 14px;border:1px solid var(--border);
      }
      .ds-checker img{max-width:88%;max-height:88%;object-fit:contain;}
      /* Attached reference: thumbnail beside its name, so a PDF and a photo read the same way */
      .ds-ref-file{display:grid;grid-template-columns:72px minmax(0,1fr);align-items:center;gap:12px;}
      .ds-ref-file .ds-checker{height:72px;color:var(--teal-dark);}
      .ds-ref-file p{margin:0;display:flex;flex-direction:column;gap:2px;min-width:0;}
      .ds-ref-file strong{font-size:var(--text-xs);color:var(--ink);overflow-wrap:anywhere;}
      .ds-ref-file span{font-size:var(--text-2xs);color:var(--text-muted);}
      .ds-card{
        display:flex;align-items:flex-start;gap:12px;padding:16px;text-align:left;border:1px solid var(--border);
        border-radius:var(--r-md);background:var(--bg-card);color:var(--teal-dark);cursor:pointer;transition:all .15s;
      }
      .ds-card:hover{border-color:var(--teal);background:var(--teal-50);}
      .ds-card strong{display:block;font-size:var(--text-xs);color:var(--ink);}
      .ds-card small{display:block;margin-top:4px;font-size:var(--text-2xs);color:var(--text-muted);line-height:1.4;}
      .ds-shape-btn{
        display:flex;flex-direction:column;align-items:center;gap:8px;padding:12px 4px;border:1px solid var(--border);
        border-radius:var(--r-md);background:var(--bg-card);cursor:pointer;transition:all .15s;
      }
      .ds-shape-btn span{font-size:var(--text-2xs);font-weight:600;color:var(--text-muted);}
      .ds-shape-btn:hover{border-color:var(--teal);background:var(--teal-50);}


      /* ── Garment picker (TypePanel) ── */
      .ds-tp{flex:1;min-height:0;overflow-y:auto;padding:16px 16px 20px;display:flex;flex-direction:column;gap:8px;}
      .ds-tp{min-width:0;}
      .ds-tp>*{flex-shrink:0;min-width:0;max-width:100%;}
      .ds-tp-catbar{display:flex;flex-wrap:wrap;gap:8px;}
      .ds-tp-catchip{flex:0 0 auto;}
      .ds-tp-catchip{
        min-height:36px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 8px;
        border:1px solid var(--border);border-radius:14px;background:var(--bg-card);color:var(--text-muted);
        font-size:var(--text-xs);font-weight:700;white-space:nowrap;cursor:pointer;
        transition:background .15s,border-color .15s,color .15s,transform .15s;
      }
      .ds-tp-catchip:hover{border-color:var(--teal);color:var(--ink);}
      .ds-tp-catchip:active{}
      .ds-tp-catchip[aria-selected="true"]{background:var(--teal);border-color:var(--teal);color:var(--text-on-accent);}
      .ds-tp-row{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;}
      .ds-tp-row-actions{display:flex;align-items:center;gap:4px;}
      .ds-tp-mini{width:26px;height:26px;display:flex;align-items:center;justify-content:center;border:0;border-radius:12px;background:var(--bg-surface);color:var(--text-muted);cursor:pointer;transition:background .15s;}
      .ds-tp-mini:hover{background:var(--teal-50);color:var(--teal-dark);}
      .ds-tp-clear{display:flex;align-items:center;gap:4px;padding:4px 8px;border:0;background:none;color:var(--text-muted);font-size:var(--text-2xs);font-weight:700;cursor:pointer;border-radius:12px;}
      .ds-tp-clear:hover{color:var(--danger-text);background:var(--danger-bg);}
      .ds-tp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;}
      .ds-tp-card{
        position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;padding:8px 4px 8px;min-height:112px;animation-delay:calc(var(--i,0) * 24ms);
        border:1px solid var(--border);border-radius:var(--r-lg);background:var(--bg-card);cursor:pointer;
        transition:transform .15s,border-color .15s,box-shadow .15s,background .15s;
      }
      .ds-tp-card:hover{border-color:var(--teal);box-shadow:var(--cx-elev-2);}
      .ds-tp-card:active{box-shadow:none;}
      .ds-tp-card[aria-pressed="true"]{border-color:var(--teal);background:var(--teal-50);box-shadow:0 0 0 2px var(--teal),var(--shadow-sm);}
      .ds-tp-thumb{flex:1;display:flex;align-items:center;justify-content:center;width:100%;border-radius:var(--r-md);background:var(--bg-surface);padding:8px 0;}
      .ds-tp-card[aria-pressed="true"] .ds-tp-thumb{background:var(--bg-card);}
      .ds-tp-photo{display:block;height:128px;width:auto;max-width:100%;object-fit:contain;}
      @media (max-width:1023px){.ds-tp-photo{height:104px;}}
      .ds-tp-name{font-size:var(--text-xs);font-weight:700;color:var(--ink);text-align:center;line-height:1.2;}
      .ds-chip-note{font-size:13px;font-weight:800;color:var(--cx-ink-2);}
      .ds-tp-chip{white-space:nowrap;font-size:13px;font-weight:800;letter-spacing:.02em;padding:2px 8px;border-radius:14px;background:var(--bg-surface);color:var(--text-muted);}
      .ds-tp-chip[data-tone="ok"]{background:#f0fdfa;color:#0f766e;}
      .ds-tp-chip[data-tone="warn"]{background:#fffbeb;color:#b45309;}
      .ds-tp-check{position:absolute;top:7px;right:7px;width:20px;height:20px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:var(--teal);box-shadow:var(--shadow-xs);}

      .ds-tp-swatches{display:grid;grid-template-columns:repeat(6,1fr);gap:8px;justify-items:center;}
      .ds-acc{display:flex;flex-direction:column;border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden;background:var(--bg-card);}
      .ds-acc-item+.ds-acc-item{border-top:1px solid var(--border);}
      .ds-acc-head{width:100%;min-height:46px;display:flex;align-items:center;gap:8px;padding:0 16px;border:0;background:none;cursor:pointer;
        font-size:var(--text-sm);font-weight:700;color:var(--ink);text-align:left;transition:background .15s;}
      .ds-acc-head:hover{background:var(--bg-surface);}
      .ds-acc-head span:nth-child(2){flex:1;}
      .ds-acc-head svg:last-child{color:var(--text-subtle);transition:transform .18s;}
      .ds-acc-head[aria-expanded="true"] svg:last-child{transform:rotate(90deg);}
      .ds-acc-body{overflow:hidden;}
      .ds-acc-body .ds-tp-swatches{padding:4px 16px 16px;}
      @media (prefers-reduced-motion:reduce){.ds-acc-head svg:last-child{transition:none;}}
      .ds-tp-sw{width:32px;height:32px;border-radius:50%;border:1px solid var(--border-strong);cursor:pointer;transition:transform .15s,box-shadow .15s;}
      .ds-tp-sw:hover{}
      .ds-tp-sw[aria-pressed="true"]{box-shadow:0 0 0 2px var(--bg-card),0 0 0 4px var(--teal);}
      @media (pointer:coarse){.ds-tp-sw{width:40px;height:40px;}.ds-tp-swatches{grid-template-columns:repeat(5,1fr);}.ds-tp-catchip{min-height:44px;}}
      @media (prefers-reduced-motion:reduce){.ds-tp-sw{transition:none;}}

      @media (prefers-reduced-motion:reduce){.ds-tp-card,.ds-tp-catchip{transition:none;animation:none;}.ds-tp-card:hover{transform:none;}}


      /* ── Wireframe polish pass ── */
      /* Rail: sliding active pill (framer layoutId) replaces the per-button background swap */
      /* Guides: one button in the top lane; its popover holds every guide toggle */
      .ds-guides{position:relative;}
      .ds-guides-btn,.ds-tools-btn{min-height:44px;display:inline-flex;align-items:center;gap:8px;padding:0 12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);
        background:var(--cx-card);color:var(--cx-ink);font:700 13px var(--cx-sans);cursor:pointer;box-shadow:var(--cx-elev-0);}
      .ds-tools-btn{padding:0 8px;}
      .ds-guides-btn[aria-expanded=true],.ds-tools-btn[aria-pressed=true]{border-color:var(--cx-thread);color:var(--cx-thread-ink);background:var(--cx-thread-tint);}
      .ds-tools{display:inline-flex;align-items:center;gap:2px;padding:2px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);box-shadow:var(--cx-elev-0);}
      .ds-tools .ds-tools-btn{min-width:44px;justify-content:center;border-color:transparent;box-shadow:none;}
      .ds-tools .ds-tools-btn:hover:not(:disabled){background:var(--cx-hover);}
      .ds-tools .ds-tools-btn:disabled{opacity:.45;cursor:default;}
      .ds-tools-ink{position:relative;width:44px;height:44px;margin-left:4px;border-radius:50%;cursor:pointer;}
      .ds-tools-ink input{width:100%;height:100%;padding:0;border:2px solid var(--cx-card);border-radius:50%;box-shadow:0 0 0 1px var(--cx-line-strong);cursor:pointer;background:none;}
      .ds-tools-ink input::-webkit-color-swatch-wrapper{padding:0;}
      .ds-tools-ink input::-webkit-color-swatch{border:0;border-radius:50%;}
      .ds-tools-ink input::-moz-color-swatch{border:0;border-radius:50%;}
      .ds-tools-size{display:flex;gap:2px;margin-left:4px;padding-left:4px;border-left:1px solid var(--cx-line);}
      .ds-tools-size button{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:transparent;cursor:pointer;}
      .ds-tools-size button[aria-checked=true]{background:var(--cx-thread-tint);}
      .ds-tools-size i{display:block;border-radius:50%;background:var(--cx-ink);}
      .ds-tools-ink:has(:focus-visible){outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      /* Desktop: the tool rail docks as a Photoshop-style column in its own stage gutter, so the top lane stays one row and the fit area never runs under it */
      @media (min-width:1024px){
        .ds-cv:has(.ds-lane-top>.ds-tools){padding-left:60px;}
        .ds-lane-top>.ds-tools{position:absolute;left:-52px;top:8px;flex-direction:column;gap:2px;max-height:calc(100dvh - 148px);overflow-y:auto;scrollbar-width:none;
          box-shadow:0 1px 2px rgb(15 23 42 / .08),0 8px 24px -12px rgb(15 23 42 / .28);}
        .ds-lane-top>.ds-tools::-webkit-scrollbar{display:none;}
        .ds-lane-top>.ds-tools .ds-tools-btn:is([data-tool=sample],[data-tool=brush],[data-tool=text]){margin-top:5px;position:relative;}
        .ds-lane-top>.ds-tools .ds-tools-btn:is([data-tool=sample],[data-tool=brush],[data-tool=text])::before{content:"";position:absolute;top:-4px;left:10px;right:10px;border-top:1px solid var(--cx-line);}
        .ds-lane-top>.ds-tools .ds-tools-ink{margin:6px 0 2px;flex:none;}
        .ds-lane-top>.ds-tools .ds-tools-size{flex-direction:column;margin:4px 0 0;padding:4px 0 0;border-left:0;border-top:1px solid var(--cx-line);}
      }
      @media (max-width:767px){.ds-tools-btn:is([data-tool=hand],[data-tool=brush],[data-tool=eraser],[data-tool=text],[data-tool=shape],[data-tool=rect],[data-tool=ellipse]){display:none;}}
      .ds-guides-n{min-width:18px;height:18px;display:grid;place-items:center;padding:0 4px;border-radius:var(--cx-r-md);background:var(--cx-thread);color:var(--cx-on-thread);font-size:13px;}
      .ds-guides-pop{z-index:var(--cx-z-popover);width:min(300px,calc(100vw - 24px));padding:8px;display:flex;flex-direction:column;gap:2px;overflow-y:auto;overscroll-behavior:contain;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-lg);background:var(--cx-card);box-shadow:var(--cx-elev-2);text-align:left;}
      /* Up to 1023px the guides panel is a modal dialog above everything (sheet, rulers), with a backdrop and a close button */
      .ds-guides-modal{position:fixed;inset:0;z-index:var(--cx-z-modal);display:flex;align-items:flex-end;justify-content:center;padding:12px 12px max(12px,env(safe-area-inset-bottom));}
      .ds-guides-scrim{position:absolute;inset:0;background:var(--cx-scrim);}
      .ds-guides-pop[data-modal]{position:relative;width:min(420px,100%);max-height:calc(100dvh - 24px);padding:4px 8px 8px;}
      .ds-guides-head{display:flex;align-items:center;justify-content:space-between;padding:4px 2px 4px 8px;}
      .ds-guides-head h2{font-size:15px;font-weight:800;color:var(--cx-ink);}
      .ds-guides-close{width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:transparent;color:var(--cx-ink-2);cursor:pointer;}
      .ds-guides-row{display:flex;align-items:center;gap:8px;border-radius:var(--cx-r-md);}
      .ds-guides-row:hover{background:var(--cx-hover);}
      .ds-guides-row label{flex:1;min-height:44px;display:flex;align-items:center;gap:8px;padding:8px 8px;cursor:pointer;}
      .ds-guides-row input{width:18px;height:18px;flex-shrink:0;accent-color:var(--cx-thread);}
      .ds-guides-row b{display:block;font-size:13px;color:var(--cx-ink);}
      .ds-guides-row small{display:block;font-size:13px;line-height:1.35;color:var(--cx-ink-2);}
      .ds-guides-row select{min-height:36px;margin-right:8px;padding:0 8px;border:1px solid var(--cx-line-strong);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink);font:600 13px var(--cx-sans);}
      .ds-guides-row select:disabled{opacity:.5;}
      /* View toggles (Grid, Rulers, Snap, Guides): 44px aria-pressed buttons, icon-only in the lane, labelled 2 x 2 in the View panel */
      .ds-vt{display:inline-flex;gap:2px;padding:2px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);box-shadow:var(--cx-elev-0);}
      .ds-vt-btn{min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 10px;border:1px solid transparent;border-radius:var(--cx-r-md);
        background:transparent;color:var(--cx-ink-2);font:700 13px var(--cx-sans);cursor:pointer;transition:background .15s,color .15s,border-color .15s;}
      .ds-vt-btn:hover{background:var(--cx-hover);color:var(--cx-ink);}
      .ds-vt-btn[aria-pressed=true]{border-color:var(--cx-thread);color:var(--cx-thread-ink);background:var(--cx-thread-tint);}
      .ds-vt[data-labelled]{display:grid;grid-template-columns:1fr 1fr;padding:4px 0 6px;border:0;box-shadow:none;background:none;gap:6px;}
      .ds-vt[data-labelled] .ds-vt-btn{justify-content:flex-start;padding:0 12px;border-color:var(--cx-line);background:var(--cx-card);color:var(--cx-ink);}
      .ds-vt[data-labelled] .ds-vt-btn[aria-pressed=true]{border-color:var(--cx-thread);color:var(--cx-thread-ink);background:var(--cx-thread-tint);}
      .ds-guides-units,.ds-units-note{font-size:13px;line-height:1.45;color:var(--cx-ink-2);}
      .ds-guides-units{margin:4px 8px;}
      .ds-units-note{max-width:min(100%,560px);margin:0;text-align:center;color:var(--cx-stage-ink-2);}
      @media (prefers-reduced-motion:reduce){.ds-vt-btn{transition:none;}}
      /* Nudge pad: live x, y in template units and four 44px step buttons in the inspector */
      .ds-nudge{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;}
      .ds-nudge-xy{display:flex;flex-direction:column;gap:2px;font-size:var(--text-2xs);font-weight:700;color:var(--text-muted);}
      .ds-nudge-xy output{font-size:var(--text-sm);color:var(--ink);font-variant-numeric:tabular-nums;}
      .ds-nudge-pad{display:grid;grid-template-columns:repeat(3,44px);grid-template-rows:repeat(2,44px);gap:4px;}
      .ds-nudge-pad .ds-act{width:44px;min-height:44px;padding:0;justify-content:center;}
      .ds-nudge-pad [data-dir=up]{grid-column:2;grid-row:1;}
      .ds-nudge-pad [data-dir=left]{grid-column:1;grid-row:2;}
      .ds-nudge-pad [data-dir=down]{grid-column:2;grid-row:2;}
      .ds-nudge-pad [data-dir=right]{grid-column:3;grid-row:2;}
      .ds-pane[data-garment]{touch-action:none;} /* pinch zoom and drags belong to the Studio, not the page */
      /* Rulers: template units only (labels 0-100), horizontal labels at 11px, ink on card (>= 4.5:1) on light and dark stages */
      .ds-cv[data-rulers] .ds-pane{top:20px;left:34px;}
      .ds-ruler,.ds-ruler-corner{position:absolute;z-index:3;background:var(--cx-paper-2);}
      .ds-ruler-corner{padding:0;border:0;cursor:help;font-family:inherit;}
      .ds-ruler-corner::before{content:'';position:absolute;inset:-12px -5px -12px -5px;}
      .ds-ruler-corner:focus-visible{outline:3px solid #028090;outline-offset:-3px;}
      .ds-ruler-x{cursor:row-resize;touch-action:none;}
      .ds-ruler-y{cursor:col-resize;touch-action:none;}
      .ds-ruler{overflow:hidden;}
      .ds-ruler-x{left:34px;top:0;box-shadow:inset 0 -1px 0 var(--cx-line-strong);}
      .ds-ruler-y{left:0;top:20px;box-shadow:inset -1px 0 0 var(--cx-line-strong);}
      .ds-ruler-corner{left:0;top:0;width:34px;height:20px;display:grid;place-items:center;font-size:13px;font-weight:700;color:var(--cx-ink-2);box-shadow:inset -1px -1px 0 var(--cx-line-strong);}
      .ds-ruler-art{fill:var(--cx-card);}
      .ds-ruler-sel{fill:#C4313B;opacity:.18;pointer-events:none;}
      .ds-tip{position:fixed;z-index:var(--z-tooltip,500);max-width:240px;padding:6px 10px;border-radius:8px;background:#1B2A4A;color:#F4F5F2;font:600 12px/1.4 var(--cx-sans);pointer-events:none;box-shadow:var(--cx-elev-1);transform:translate(-50%,0);}
      .ds-tip[data-side=right]{transform:translate(0,-50%);}
      @media(prefers-reduced-motion:no-preference){.ds-tip{animation:ds-tip-in 120ms ease-out both;}}
      @keyframes ds-tip-in{from{opacity:0}}
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
      .ds-rguide span{position:absolute;top:24px;left:8px;padding:1px 8px;border-radius:var(--cx-r-md);background:var(--cx-thread-ink);color:var(--cx-on-thread);font-size:13px;font-weight:700;white-space:nowrap;opacity:0;}
      .ds-rguide[data-axis=h] span{top:8px;left:38px;}
      .ds-rguide:hover span,.ds-rguide:focus-visible span,.ds-rguide[data-live] span{opacity:1;}
      .ds-rguide:focus-visible::before{box-shadow:0 0 0 2px var(--cx-thread-ring);}
      .ds-pane[data-pan]{cursor:grab;touch-action:none;}
      .ds-pan-layer{position:absolute;inset:0;z-index:1;cursor:grab;touch-action:none;}
      .ds-pan-layer:active,.ds-pane[data-pan]:active{cursor:grabbing;}
      .ds-stage-btn{position:relative;z-index:2;width:40px;height:40px;display:grid;place-items:center;border-radius:var(--r-md);
        border:1px solid var(--border);background:var(--bg-card);color:var(--ink);cursor:pointer;box-shadow:var(--shadow-xs);transition:transform .15s,background .15s;}
      .ds-stage-btn:active{}
      /* Contact shadow under the garment */
      .ds-stage-floor{position:absolute;left:8%;right:8%;bottom:-3%;height:7%;border-radius:50%;pointer-events:none;
        background:radial-gradient(ellipse at center,rgb(var(--cx-shade) / .34),transparent 70%);filter:blur(6px);}
      .ds-cv[data-stage=dark] .ds-stage-floor{background:radial-gradient(ellipse at center,rgb(0 0 0 / .55),transparent 70%);}
      /* Quiet status badge (Sketch / Derived / Photo): plain text in a soft pill, never truncated */
      .ds-ctx-chip{display:inline-flex;align-items:center;gap:8px;flex:none;min-height:28px;padding:0 8px;border-radius:14px;background:var(--cx-paper-2);
        color:var(--cx-ink-2);font-size:13px;font-weight:700;white-space:nowrap;}
      .ds-ctx-chip strong{font-weight:800;color:var(--cx-ink);}
      /* Summary: stat chips + icon jump rows with an active state */
      .ds-stats{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-stats li{display:flex;flex-direction:column;gap:2px;padding:8px 12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-card);}
      .ds-stats b{font-size:18px;font-weight:800;color:var(--ink);line-height:1;}
      .ds-stats span{font-size:var(--text-2xs);color:var(--text-muted);font-weight:600;}
      .ds-jump button svg:first-child{color:var(--text-subtle);flex-shrink:0;}
      .ds-jump button[data-active="true"]{background:var(--teal-50);box-shadow:inset 3px 0 0 var(--teal);}
      .ds-jump button[data-active="true"] svg:first-child{color:var(--teal-dark);}
      .ds-zone-now{display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);font-size:var(--text-xs);color:var(--text-muted);}
      .ds-zone-now b{color:var(--ink);}
      .ds-zone-now code{margin-left:auto;font-size:var(--text-2xs);color:var(--text-muted);}
      .ds-zone-dot{width:18px;height:18px;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(15,23,42,.18);flex-shrink:0;transition:background .2s;}
      /* Centred with margins, not translateX: framer-motion owns transform for the enter animation and would drop the centring. */
      .ds-toast{position:absolute;z-index:var(--cx-z-popover);left:0;right:0;margin-inline:auto;width:max-content;max-width:calc(100% - 24px);bottom:84px;display:flex;align-items:center;gap:8px;
        padding:8px 16px;border-radius:var(--cx-r-md);background:var(--cx-ink);color:var(--cx-paper);font-size:var(--text-xs);font-weight:700;box-shadow:var(--cx-elev-2);}
      .ds-toast svg{flex:none;color:var(--teal-2);}
      /* Inspector body takes its content height; Layers + History fill the rest above the sticky dock (no dead space) */
      .ds-panel-scroll{flex:1;min-height:0;display:flex;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;}
      .ds-panel-scroll>.ds-panel-body{flex:0 0 auto;overflow:visible;}
      /* Inside the panel's one scroller, inner panels never become scroll boxes of their own: an inner box that grows to its content
         but keeps overflow:auto + overscroll-behavior:contain swallowed the wheel, so the inspector's lower controls (flip, order,
         duplicate, delete) could not be scrolled to. */
      .ds-panel-scroll .ds-sum,.ds-panel-scroll .ds-ins{overflow:visible;overscroll-behavior:auto;min-height:auto;}
      .ds-panel-scroll .ds-lay{flex:0 0 auto;overflow:visible;}
      .ds-swatch-chips{list-style:none;display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px;}

      /* Phone and tablet parts (ToolDrawer, PiecesRail, CanvasViewport): off on desktop, where the sheet's parts are plain panel rows */
      .ds-bnav,.ds-sheet-bar,.ds-phone-only{display:none;}
      .ds-sheet{display:contents;}
      /* More (phones and tablets): Details, Ask AI, View, Save a copy */
      .ds-more{list-style:none;margin:0;padding:8px 12px 16px;display:flex;flex-direction:column;gap:6px;}
      .ds-more button{width:100%;min-height:52px;display:grid;grid-template-columns:20px minmax(0,1fr);column-gap:12px;align-items:center;padding:8px 12px;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);color:var(--cx-ink);font:600 15px/1.25 var(--cx-sans);text-align:left;cursor:pointer;}
      .ds-more button:hover:not(:disabled){border-color:var(--cx-line-strong);background:var(--cx-hover);}
      .ds-more button:disabled{color:var(--cx-ink-3);cursor:not-allowed;}
      .ds-more small{grid-column:2;font:500 13px/1.35 var(--cx-sans);color:var(--cx-ink-2);}

      /* Phones and tablets: one fixed column. Piece tabs (a set only), the stage, a sheet with three heights (peek, half, full),
         then the five-item bottom nav. */
      @media (max-width:1023px){
        .ds{--ds-pad-b:0px;--ds-nav-h:65px;}
        .ds-bar{padding:0 8px;gap:4px;}
        .ds-bar-back span,.ds-bar-text span,.ds-bar-sp{display:none;}
        .ds-bar-title{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}
        .ds-bar-back{border-color:transparent;}
        .ds-bar-btn{min-width:44px;height:44px;padding:0;}
        .ds-bar-name{flex:1;width:auto;min-width:0;padding:0 8px;}
        .ds-bar-view button{min-width:44px;height:44px;}
        .ds-bar-primary{padding:0 12px;}
        .ds-body{flex-direction:column;overflow:hidden;}
        .ds-cv{flex:1 1 auto;min-height:0;}
        .ds-panel{width:auto;flex:none;display:flex;flex-direction:column;overflow:visible;border-left:0;box-shadow:none;background:transparent;}
        .ds-tabs{display:none;}
        .ds-sheet{display:flex;flex-direction:column;min-height:0;background:var(--cx-card);border-top:1px solid var(--cx-line);
          border-radius:16px 16px 0 0;box-shadow:0 -4px 16px rgb(15 23 42 / .06);}
        /* Peek shows the bar only; the stage refits (ResizeObserver) whenever the sheet changes height */
        .ds-sheet[data-snap=peek]>:not(.ds-sheet-bar){display:none;}
        .ds-sheet[data-snap=half]{height:45dvh;}
        .ds-sheet[data-snap=full]{height:min(85dvh,calc(100dvh - 56px - var(--ds-nav-h) - 64px));}
        .ds-sheet-bar{position:relative;display:flex;flex:none;align-items:center;gap:8px;min-height:52px;padding:6px 4px 2px 16px;touch-action:none;cursor:grab;}
        .ds-sheet-grip{position:absolute;top:6px;left:50%;width:36px;height:4px;margin-left:-18px;border-radius:2px;background:var(--cx-line-strong);}
        .ds-sheet-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:700 15px/1.2 var(--cx-sans);color:var(--cx-ink);}
        .ds-sheet-status{flex:none;padding:0 8px;border:1px solid var(--cx-line);border-radius:10px;font:700 13px/20px var(--cx-sans);color:var(--text-subtle);}
        .ds-sheet-status[data-tone=ok]{color:var(--cx-thread-ink);}
        .ds-sheet-status[data-tone=err]{color:var(--danger-text);}
        .ds-sheet-toggle{flex:none;width:44px;height:44px;display:grid;place-items:center;border:0;border-radius:var(--cx-r-md);background:none;color:var(--cx-ink-2);cursor:pointer;}
        .ds-sheet-toggle:hover{background:var(--cx-hover);}
        .ds-sheet-toggle:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
        .ds-sheet-head{display:none;}
        .ds-sheet-title p{display:none;}
        .ds-panel-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;}
        .ds-phone-only{display:block;}
        .ds-bnav{display:grid;flex:none;grid-template-columns:repeat(5,minmax(0,1fr));gap:2px;padding:4px 4px max(4px,env(safe-area-inset-bottom));
          background:var(--cx-card);border-top:1px solid var(--cx-line);}
        .ds-bnav button{min-width:0;min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 2px;
          border:1px solid transparent;border-radius:var(--cx-r-md);background:none;font:600 13px/1.15 var(--cx-sans);color:var(--cx-ink-2);text-align:center;cursor:pointer;}
        .ds-bnav button[aria-current]{background:var(--cx-thread-tint);border-color:var(--cx-thread);color:var(--cx-thread-ink);}
        .ds-assets-body{padding:12px 16px 16px;}
        /* The toast sits just above the bottom nav */
        .ds-toast{bottom:calc(var(--ds-nav-h) + 8px);}
        /* Piece tabs above the stage, for a set only; the piece actions live in the Garment sheet, and "Apply to" is desktop only */
        .ds-rail{display:none;}
        .ds-rail[data-set]{display:flex;align-items:center;gap:8px;padding:4px 8px;background:var(--cx-card);border-bottom:1px solid var(--cx-line);}
        .ds-rail-h{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}
        .ds-rail-list{flex:1;flex-direction:row;gap:4px;}
        .ds-rail-list li{flex:1;min-width:0;}
        .ds-rail-card{min-height:48px;padding:2px 8px;gap:8px;}
        .ds-rail-thumb{width:32px;height:40px;}
        .ds-rail-thumb>*{max-width:32px;max-height:40px;}
        .ds-rail-txt small{font-size:13px;}
        .ds-rail-txt strong{font-size:13px;}
        .ds-rail :is(.ds-rail-acts,.ds-rail-note,.ds-dock,.ds-keys,.ds-help,.ds-nav-slot){display:none;}
        /* One piece: its card plus the add action, so a matching piece is one tap away */
        .ds-rail[data-strip]{display:flex;align-items:center;gap:8px;padding:4px 8px;background:var(--cx-card);border-bottom:1px solid var(--cx-line);}
        .ds-rail[data-strip]>.ds-rail-card{flex:1;min-width:0;}
        .ds-rail[data-strip] .ds-rail-acts:not([data-sheet]){display:flex;flex:none;}
        .ds-rail[data-strip] .ds-piece-add[data-card]{width:auto;min-height:48px;gap:8px;padding:0 12px 0 6px;}
        .ds-rail[data-strip] .ds-piece-add-plus{width:32px;height:32px;border-radius:8px;font-size:18px;}
        .ds-rail[data-strip] .ds-piece-add-x{display:none;}
        .ds-body:has(.ds-rail[data-strip]) .ds-rail-acts[data-sheet] .ds-piece-add{display:none;}
        .ds-rail-acts[data-sheet]{display:flex;flex-direction:column;align-items:stretch;gap:8px;padding:12px 16px 0;}
        .ds-rail-acts[data-sheet] .ds-btn{width:100%;}
        .ds-lane{padding:8px 8px 0;}
        /* The top lane is one row (pan, notes); View lives under More, so its lane button is hidden here */
        .ds-lane-top>:is(.ds-guides,.ds-vt){display:none;}
        .ds-lane-top:not([data-notes]){flex-wrap:nowrap;justify-content:flex-start;overflow-x:auto;scrollbar-width:none;}
        .ds-lane-top>*{flex-shrink:0;}
        .ds-lane-top:not([data-notes])::-webkit-scrollbar{display:none;}
        .ds-lane-top:not([data-notes])>:first-child{margin-left:auto;}
        .ds-lane-top:not([data-notes])>:last-child{margin-right:auto;}
        .ds-guides-btn{padding:0 8px;}
        .ds-lane-bottom{padding:0 8px 8px;}
        .ds-wide-only{display:none;}
        /* First run: no garment yet, so no tabs or panel; the picker gets the full height */
        .ds[data-first] .ds-panel{display:none;}
        .ds[data-first] .ds-cv{flex:1;height:auto;}
        .ds-pick[data-inline]{padding:4px 12px 0;}
        .ds-pick-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
        .ds-modal{top:60px;max-height:calc(100dvh - 72px);}
        .ds-ftb{padding:4px;}
        .ds-ftb-kind{display:none;}
        .ds-draft{padding-left:12px;font-size:13px;flex-wrap:wrap;}
        .ds-draft p{flex:1 1 calc(100% - 32px);}
        /* Expanded stage: the canvas takes the whole column */
        .ds[data-expanded] :is(.ds-panel,.ds-rail){display:none;}
        .ds[data-expanded] .ds-cv{flex:1;height:auto;}
      }
      /* Phones: the save state is its dot (the words stay for screen readers); the zoom hint row gives its height to the garment */
      .ds-stage-badge{display:none;}
      @media (max-width:599px){
        .ds-bar-save{padding:0 4px;border:0;background:none;}
        .ds-bar-save-txt{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
        .ds-lane-bottom .ds-stage-hint{display:none;}
        /* The garment gets the height: one-row top bar (3D status moves to the stage corner), tighter lanes, a shorter sheet */
        .ds-bar .ds-view-chip{display:none;}
        .ds-lane-top{padding:4px 8px 0;}
        .ds-lane-bottom{padding:0 8px 4px;gap:2px;}
        .ds-ctrlbar{padding:2px;}
        .ds-ctrlbar .ds-ctrl{min-height:44px;padding:2px;}
        .ds-units-note{font-size:13px;line-height:1.3;}
        .ds-rail[data-set]{padding:2px 8px;}
        .ds-rail-card{min-height:44px;}
        /* One piece: no strip (Add a matching piece is in the ⋯ menu and the Garment sheet); a set: compact piece chips */
        .ds-rail[data-strip]{display:none;}
        .ds-body:has(.ds-rail[data-strip]) .ds-rail-acts[data-sheet] .ds-piece-add{display:flex;}
        .ds-rail[data-set] .ds-rail-thumb{display:none;}
        /* Zoom: three round buttons in the stage's bottom-right corner; Back view and Full screen are in the ⋯ menu */
        .ds-lane-bottom{position:relative;}
        .ds-lane-bottom .ds-ctrlbar{position:absolute;right:8px;bottom:calc(100% + 8px);width:auto;gap:8px;padding:0;border:0;background:none;box-shadow:none;}
        .ds-lane-bottom .ds-ctrlbar .ds-ctrl{flex:none;width:44px;height:44px;padding:0;border:1px solid var(--cx-line);border-radius:50%;background:var(--cx-card);box-shadow:var(--cx-elev-1);}
        .ds-lane-bottom .ds-ctrlbar .ds-ctrl[aria-pressed=true]{background:var(--cx-thread-tint);border-color:var(--cx-thread);}
        .ds-lane-bottom .ds-ctrl>span{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
        .ds-lane-bottom .ds-ctrl:is([data-act=back],[data-act=full]:not([aria-pressed=true])){display:none;}
        /* Full sheet: the stage is covered, so its corner controls step aside */
        .ds-body:has(.ds-sheet[data-snap=full]) :is(.ds-lane-bottom .ds-ctrlbar,.ds-stage-badge){display:none;}
        /* The save state is in the sheet bar, so the one-line summary goes */
        .ds-sheet .ds-spec{display:none;}
        .ds-bar{padding-left:max(8px,env(safe-area-inset-left));padding-right:max(8px,env(safe-area-inset-right));}
        .ds-bnav{padding-left:max(4px,env(safe-area-inset-left));padding-right:max(4px,env(safe-area-inset-right));}
      }
      @media (prefers-reduced-motion:reduce){
        .ds-panel{transition:none!important;}
        .ai-pulse{animation:none;}
      }
      @media (pointer:coarse){
        .ds-touch,.ds-ftb button,.ds-bar-btn,.ds-bar-view button,.ds-stage-btn,.ds-guides-btn,.ds-tools-btn{min-width:44px;min-height:44px;}
        .ds input[type="range"]{min-height:44px;}
      }

      .ds-tp-current{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid var(--teal);border-radius:var(--r-md);background:var(--teal-50);}
      .ds-tp-thumb--sm{flex:none;width:52px;height:52px;padding:0;background:var(--bg-card);}
      .ds-tp-current-txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px;}
      .ds-tp-current-txt strong{font-size:var(--text-sm);font-weight:800;color:var(--ink);}
      .ds-tp-current-txt span{font-size:var(--text-2xs);color:var(--text-muted);}
      .ds-tp-prev{display:flex;flex-direction:column;gap:8px;padding:4px 16px 16px;}
      .ds-seg button:disabled{opacity:.4;cursor:not-allowed;}
      .ds-acc-item[data-open="true"] > .ds-acc-head{background:var(--teal-50);color:var(--teal-dark);box-shadow:inset 3px 0 0 var(--teal);}

      .ds-lay{display:flex;flex-direction:column;gap:8px;padding:12px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;}
      .ds-lay-count{font-size:var(--text-2xs);font-weight:800;color:var(--text-muted);}
      .ds-lay-list{list-style:none;display:flex;flex-direction:column;gap:4px;margin:0;padding:0;}
      .ds-lay-row{border:1px solid var(--border);border-radius:var(--r-md);background:var(--bg-surface);transition:background .15s,border-color .15s;}
      .ds-lay-row[data-sel]{border-color:var(--teal);background:var(--teal-50);}
      .ds-lay-row[data-over]{outline:2px solid var(--teal);}
      .ds-lay-row[data-hidden] .ds-lay-pick{opacity:.45;}
      .ds-lay-main{display:flex;align-items:center;gap:2px;padding:2px 4px 2px 2px;}
      .ds-lay-grip{width:28px;height:44px;flex:none;display:flex;align-items:center;justify-content:center;color:var(--text-subtle);cursor:grab;touch-action:none;}
      .ds-lay-pick{flex:1;min-width:0;min-height:44px;display:flex;align-items:center;gap:8px;padding:0 8px;border:0;background:none;cursor:pointer;text-align:left;color:var(--ink);}
      .ds-lay-type{width:26px;height:26px;flex:none;display:flex;align-items:center;justify-content:center;border-radius:12px;background:var(--bg-card);color:var(--text-muted);}
      .ds-lay-name{flex:1;min-width:0;display:flex;flex-direction:column;font-size:var(--text-xs);font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
      .ds-lay-name em{font-style:normal;font-size:13px;font-weight:600;color:var(--text-subtle);}
      .ds-lay-edit{flex:1;min-width:0;height:32px;padding:0 8px;border:1px solid var(--teal);border-radius:12px;font-size:var(--text-xs);}
      .ds-lay-btn{width:44px;height:44px;flex:none;display:inline-flex;align-items:center;justify-content:center;border:0;border-radius:12px;background:none;color:var(--text-muted);cursor:pointer;}
      .ds-lay-btn:hover:not(:disabled){background:var(--bg-card);color:var(--ink);}
      .ds-lay-btn[aria-pressed="true"]{color:var(--teal-dark);background:var(--teal-50);}
      .ds-lay-btn:disabled{opacity:.35;cursor:not-allowed;}
      .ds-lay-del:hover:not(:disabled){color:#dc2626;}
      .ds-lay-detail{display:flex;flex-direction:column;gap:8px;padding:4px 8px 8px;border-top:1px solid var(--border);}
      .ds-lay-op{display:flex;flex-direction:column;gap:4px;font-size:var(--text-2xs);font-weight:700;color:var(--text-muted);}
      .ds-lay-op input,.ds-ins-range input{width:100%;min-height:44px;accent-color:var(--teal);}
      .ds-lay-tools{display:flex;gap:2px;justify-content:flex-end;}
      .ds-lay-base{display:flex;align-items:center;gap:8px;padding:8px;border:1px dashed var(--border-strong);border-radius:var(--r-md);color:var(--text-muted);}

      .ds-ins{display:flex;flex-direction:column;gap:12px;padding:12px 16px;flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;}
      .ds-ins-head{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .ds-ins-sec{display:flex;flex-direction:column;gap:8px;}
      .ds-ins-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-ins-field{display:flex;flex-direction:column;gap:4px;font-size:var(--text-2xs);font-weight:700;color:var(--text-muted);}
      .ds-ins-field input,.ds-ins-field select{width:100%;min-height:36px;padding:0 8px;border:1px solid var(--border-strong);border-radius:12px;background:var(--bg-card);color:var(--ink);font-size:var(--text-sm);}
      .ds-ins-field input[type="color"]{padding:2px;min-height:38px;cursor:pointer;}
      .ds-ins-field input:disabled,.ds-ins-field select:disabled{opacity:.5;}
      .ds-ins-range{display:flex;flex-direction:column;gap:4px;font-size:var(--text-2xs);font-weight:700;color:var(--text-muted);}
      .ds-ins-note{font-size:var(--text-2xs);color:var(--text-subtle);text-align:center;line-height:1.5;margin:0;}
      .ds-act--danger{color:#dc2626;border-color:rgba(220,38,38,.3);}
      .ds-ins-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
      .ds-ins-align{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;}
      .ds-ins-align .ds-act{min-height:36px;padding:0 8px;font-size:13px;justify-content:center;}
      .ds-ins-actions .ds-act{min-height:44px;}

      .ds-act--icon{width:44px;padding:0;}
      .ds-act--primary{background:var(--cx-thread);border-color:var(--cx-thread);color:var(--cx-on-thread);}
      .ds-spin--on-thread{border-color:rgb(255 255 255 / .4);border-top-color:var(--cx-on-thread);}
      @media (pointer:coarse){.ds-lay-btn{width:44px;height:44px;}.ds-lay-pick{min-height:44px;}.ds-ins-field input,.ds-ins-field select{min-height:44px;}.ds-ins .ds-seg button,.ds-ins-align .ds-act{min-height:44px;}.ds-ins-range input{min-height:44px;}}

      /* Stage piece selector: Top / Bottom / Set as one segmented control once a set exists (PieceSelector.jsx) */
      .ds-piece-add{min-height:44px;padding:0 8px;border:0;background:none;font:600 13px var(--cx-sans);color:var(--cx-thread-ink);text-decoration:underline;text-underline-offset:3px;cursor:pointer;white-space:nowrap;}
      .ds-piece-add:hover{text-decoration-thickness:2px;}
      /* "Add a matching ..." as a quiet card: dashed, muted, the same size as a piece card */
      .ds-piece-add[data-card]{width:100%;min-height:56px;display:flex;align-items:center;gap:12px;padding:8px;border:1px dashed var(--cx-line-strong);border-radius:var(--cx-r-md);
        color:var(--cx-ink-2);text-decoration:none;text-align:left;white-space:normal;}
      .ds-piece-add[data-card]:hover{border-color:var(--cx-thread);color:var(--cx-thread-ink);background:var(--cx-hover);}
      .ds-piece-add[data-card]:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-piece-add-plus{flex:none;width:40px;height:40px;display:grid;place-items:center;border-radius:12px;background:var(--cx-paper);font:400 22px/1 var(--cx-sans);}
      .ds-rail-acts:has(.ds-piece-add[data-card]){align-items:stretch;}
      /* 2D | 3D with the 3D-status chip under it (TopBar.jsx ViewToggle); the bar grows only while the chip shows */
      .ds-view{display:flex;flex-direction:column;align-items:center;gap:2px;flex-shrink:0;}
      .ds-view .ds-bar-view{padding:2px;}
      .ds-bar-view button{position:relative;}
      .ds-bar-view button+button::before{content:'';position:absolute;left:-2px;top:12px;bottom:12px;width:1px;background:var(--cx-line-strong);}
      .ds-view-chip{padding:0 8px;border-radius:8px;background:var(--warning-bg,#fff4d6);color:var(--warning-text,#7a4b00);font:700 13px/16px var(--cx-sans);white-space:nowrap;}
      .ds-view-chip.is-off{background:var(--bg-surface);color:var(--text-muted);}
      .ds-bar .ds-view-chip{padding:0;background:none;color:#C9A27A;}
      .ds-bar .ds-view-chip.is-off{background:none;color:var(--cx-ink-2);}
      .ds-bar .ds-view{flex-direction:row;align-items:center;gap:8px;}
      /* View menu sections (GuidesMenu.jsx) */
      .ds-guides-sec{margin:4px 8px 0;font:700 13px/1.4 var(--cx-sans);color:var(--cx-ink-2);}
      .ds-guides-base{margin:6px 8px 4px;padding-top:8px;border-top:1px solid var(--cx-line);font-size:13px;line-height:1.45;color:var(--cx-ink-2);}
      .ds-guides-base b{color:var(--cx-ink);}
      /* Spec summary at the foot of the desktop inspector (ToolDrawer.jsx) */
      /* Phones and tablets: the spec summary is one line above the bottom nav (garment, zone colour dots, item count) */
      .ds-spec{flex:none;display:flex;align-items:center;gap:8px;padding:6px 16px;border-top:1px solid var(--cx-line);background:var(--cx-paper);}
      .ds-spec dl{flex:1;margin:0;display:flex;align-items:center;gap:12px;min-width:0;font-size:13px;line-height:20px;white-space:nowrap;}
      .ds-spec dl>div{display:flex;align-items:center;min-width:0;}
      .ds-spec dl>div:first-child{flex:1;overflow:hidden;}
      .ds-spec dl>div:first-child dd{overflow:hidden;text-overflow:ellipsis;}
      .ds-spec dt{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}
      .ds-spec dd{margin:0;color:var(--cx-ink);}
      .ds-spec-sw{display:flex;gap:4px;}
      .ds-spec-sw span{display:inline-flex;font-size:0;}
      .ds-spec-save{display:none;flex:none;margin-left:auto;padding:0 8px;border:1px solid var(--cx-line);border-radius:10px;background:var(--cx-card);font-size:13px;line-height:20px;font-weight:700;color:var(--text-subtle);}
      .ds-spec-save[data-tone=ok]{color:var(--cx-thread-ink);}
      .ds-spec-save[data-tone=err]{color:var(--danger-text);}
      @media (max-width:599px){.ds-spec-save{display:inline-flex;}}
      .ds-spec-sw i{width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 1px rgb(15 23 42 / .2);}
      @media (min-width:1024px){
        .ds-spec{display:block;flex:none;padding:12px 16px;border-top:1px solid var(--cx-line);background:var(--cx-paper);}
        .ds-spec dl{margin:0;display:flex;flex-direction:column;align-items:stretch;gap:6px;white-space:normal;}
        .ds-spec dl>div:first-child{overflow:visible;}
        .ds-spec dt{position:static;width:auto;height:auto;overflow:visible;clip:auto;}
        .ds-spec-sw span{font-size:inherit;}
        .ds-spec dl>div{display:grid;grid-template-columns:64px minmax(0,1fr);gap:8px;align-items:baseline;font-size:13px;line-height:1.4;}
        .ds-spec dt{font-weight:600;color:var(--cx-ink-2);}
        .ds-spec dd{margin:0;color:var(--cx-ink);min-width:0;overflow-wrap:anywhere;}
        .ds-spec-sw{display:flex;flex-wrap:wrap;gap:4px 10px;}
        .ds-spec-sw span{display:inline-flex;align-items:center;gap:4px;}
        .ds-spec-sw i{width:12px;height:12px;border-radius:50%;box-shadow:inset 0 0 0 1px rgb(15 23 42 / .2);}
      }
      .ds-cv[data-first]{--ds-mat-line:transparent;}

      /* Plain colour swatches in the Studio (the kit's woven hatch hid the true colour) */
      .ds .cx-swatch-dot{background:var(--sw);}

      /* Desktop right panel: one row of six labelled tabs, icon above text (ToolDrawer.jsx); phones use the bottom nav */
      @media (min-width:1024px){
        .ds-tabs{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2px;padding:8px 6px;border-bottom:1px solid var(--cx-line);}
        .ds-tabs button{min-width:0;min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:4px 2px;border:1px solid transparent;white-space:nowrap;
          border-radius:var(--cx-r-md);background:none;font:600 13px/1.15 var(--cx-sans);color:var(--cx-ink-2);cursor:pointer;
          transition:background .15s,color .15s,border-color .15s;}
        .ds-tabs button:hover{background:var(--cx-hover);color:var(--cx-ink);}
        .ds-tabs button[aria-current]{background:none;border-color:transparent;border-bottom:3px solid var(--cx-thread);color:var(--cx-ink);font-weight:700;}
        .ds-tabs button:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      }
      .ds-subtabs{margin:12px 12px 0;}
      .ds-subtabs button{flex:1;}
      .ds-fontgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:276px;overflow-y:auto;padding:2px;flex-shrink:0;}
      .ds-fonttile{position:relative;height:60px;min-height:60px;padding:6px 8px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface);color:var(--ink);
        display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:pointer;overflow:hidden;}
      .ds-fonttile b{max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:15px;line-height:1.2;}
      .ds-fonttile small{font-size:12px;line-height:1;font-weight:600;color:var(--text-muted);}
      .ds-fonttile:hover{border-color:var(--teal-dark);}
      .ds-fonttile[aria-checked="true"]{border:2px solid var(--teal-dark);background:var(--bg-card);}
      .ds-fonttile[aria-checked="true"]::after{content:"✓";position:absolute;top:3px;right:6px;font:700 12px/1 system-ui;color:var(--teal-dark);}
      .ds-fonttile:focus-visible,.ds-sw:focus-visible{outline:2px solid var(--teal-dark);outline-offset:2px;}
      .ds-swgrid{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;}
      .ds-sw{position:relative;min-height:44px;border-radius:8px;border:1px solid rgba(15,23,42,.25);cursor:pointer;}
      .ds-sw[aria-checked="true"]{outline:3px solid var(--ink);outline-offset:2px;}
      .ds-sw[aria-checked="true"]::after{content:"✓";position:absolute;inset:0;display:grid;place-items:center;font:700 16px/1 system-ui;color:#fff;mix-blend-mode:difference;}
      .ds-subtabs[data-n] button{flex-direction:column;gap:2px;min-height:52px;padding:6px 2px;font-size:12px;min-width:0;}
      .ds-subtabs button:focus-visible{outline:2px solid var(--teal-dark);outline-offset:2px;}
      @media (prefers-reduced-motion:reduce){.ds-tabs button{transition:none;}}

      /* Details: pockets, buttons, closures (DetailsPanel.jsx) */
      .ds-det{display:flex;flex-direction:column;gap:8px;padding:8px 12px 16px;}
      .ds-det-note{margin:0;padding:8px 8px;border-radius:var(--cx-r-md);background:var(--cx-paper-2);font-size:13px;line-height:1.45;color:var(--cx-ink-2);}
      .ds-det-add{display:flex;flex-direction:column;gap:8px;}
      .ds-det-chart{display:flex;flex-direction:column;gap:8px;margin-top:12px;border:1px solid var(--cx-line);border-radius:var(--cx-r-md,12px);}
      .ds-det-chart .size-chart{border:0;border-top:1px solid var(--cx-line);border-radius:0;}
      .ds-det-pockets{display:grid;grid-template-columns:repeat(auto-fill,minmax(88px,1fr));gap:8px;}
      .ds-det-pocket{flex-direction:column;gap:4px;min-height:58px;justify-content:center;color:var(--cx-thread-ink);}
      .ds-det-pocket span{color:var(--cx-ink);font-size:13px;}
      .ds-det-list{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px;}
      .ds-det-row{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:48px;padding:0 4px 0 12px;
        border:1px solid var(--cx-line);border-radius:var(--cx-r-md);background:var(--cx-card);}
      .ds-det-row[data-focus]{border-color:var(--cx-thread);}
      .ds-det-row--col{flex-direction:column;align-items:stretch;padding:0;}
      .ds-det-head{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:48px;padding:0 12px;border:0;background:none;font:inherit;color:var(--cx-ink);cursor:pointer;text-align:left;}
      .ds-det-name{display:flex;align-items:center;gap:8px;font:700 13px var(--cx-sans);color:var(--cx-ink);}
      .ds-det-name .ds-link{align-self:center;}
      .ds-det-val{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--cx-ink-2);}
      .ds-det-body{padding:8px 12px 12px;border-top:1px solid var(--cx-line);}
      button.ds-switch{flex:none;width:56px;height:44px;display:flex;align-items:center;justify-content:center;border:0;background:none;cursor:pointer;}
      button.ds-switch span{position:relative;width:40px;height:24px;border-radius:14px;background:var(--cx-line-strong);transition:background var(--cx-dur-2) var(--cx-ease);}
      button.ds-switch span::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;box-shadow:var(--shadow-xs);transition:transform var(--cx-dur-2) var(--cx-ease);}
      .ds-switch[aria-checked=true] span{background:var(--cx-thread);}
      .ds-switch[aria-checked=true] span::after{transform:translateX(16px);}
      @media (prefers-reduced-motion:reduce){button.ds-switch span,button.ds-switch span::after{transition:none;}}

      /* Picker header: tabs + Upload on one row; after scrolling it collapses to that row alone, opaque, over the grid */
      .ds-pick[data-inline],.ds-modal{overflow-anchor:none;}
      .ds-pick-row{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:8px;margin-top:4px;}
      .ds-pick-row .ds-pick-tabs{margin-top:0;}
      .ds-tab-short{display:none;}
      .ds-pick-upbtn{display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid var(--cx-thread);border-radius:var(--cx-r-md);
        background:var(--cx-card);color:var(--cx-thread-ink);font:700 13px var(--cx-sans);cursor:pointer;white-space:nowrap;}
      .ds-pick-upbtn[data-over]{border-style:solid;box-shadow:0 0 0 3px var(--cx-thread-ring);}
      .ds-pick-upbtn:focus-within{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-pick[data-compact] .ds-pick-head{padding:8px 0;box-shadow:0 1px 0 var(--cx-line),0 8px 16px -12px rgb(0 0 0 / .3);}
      .ds-pick[data-compact] .ds-pick-head::before{content:"";position:absolute;left:0;right:0;bottom:100%;height:48px;background:inherit;}
      .ds-pick[data-compact] .ds-pick-head>:is(p,.ds-pick-legend){display:none;}
      /* Phones: the header is one compact bar from the start, so the grid shows without scrolling past a banner. */
      @media (max-width:767px){.ds-pick-head>:is(p,.ds-pick-legend){display:none;}.ds-pick-head{gap:6px;padding:6px 0;}.ds-pick-head h2{font-size:20px;}}
      .ds-cap3d{white-space:nowrap;}
      @media (max-width:767px){.ds-pick .ds-chips{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;justify-content:flex-start;padding-bottom:2px;}.ds-pick .ds-chips::-webkit-scrollbar{display:none;}.ds-pick .ds-chips>*{flex:none;}}
      .ds-pick[data-compact] .ds-pick-titlebar{position:absolute;top:8px;right:0;width:auto;display:block;}
      .ds-pick[data-compact] .ds-pick-titlebar h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;}
      .ds-pick[data-compact][data-inline] .ds-pick-titlebar{display:none;}
      .ds-pick[data-compact] .ds-pick-row{margin-top:0;flex-wrap:nowrap;}
      .ds-modal .ds-pick[data-compact] .ds-pick-row{padding-right:48px;}
      /* Picker fits its box: no centred child may overflow (it would clip on the left), rows wrap */
      :where(.ds-pick)>*{max-width:min(100%,1040px);min-width:0;}
      .ds-pick>:is(.ds-chips,.ds-pick-facets,.ds-pick-subh){width:100%;}
      .ds-pick-row{max-width:100%;}
      .ds-pick-tabs{max-width:100%;}
      .ds-pick-tabs button{flex:1 1 auto;min-width:0;}
      .ds-pick-frow{min-width:0;}
      .ds-pick-frow .ds-chip,.ds-pick .ds-chips .ds-chip{max-width:100%;white-space:normal;line-height:1.25;}
      .ds-pick-sec{grid-template-columns:minmax(0,1fr);}
      .ds-pick-pair .ds-pick-grid{grid-template-columns:repeat(auto-fill,minmax(min(132px,100%),1fr));}
      .ds-pick-card strong{overflow-wrap:anywhere;}
      @media (max-width:479px){
        .ds-pick .ds-tab-long{display:none;}
        .ds-pick .ds-tab-short{display:inline;}
        .ds-pick .ds-pick-tabs button{padding:0 16px;}
      }
      @media (max-width:599px){
        .ds-pick[data-compact] .ds-tab-long{display:none;}
        .ds-pick[data-compact] .ds-tab-short{display:inline;}
        .ds-pick[data-compact] .ds-pick-tabs button{padding:0 16px;}
      }
      .ds input[type=range]{min-width:44px;}
      ::-webkit-scrollbar{width:8px;height:8px;}
      ::-webkit-scrollbar-thumb{background:#7686A6;border-radius:4px;}

      /* First-run picker: a navy header holds the three ways to start, the garments sit on chalk and use the stage's width. */
      .ds-cv[data-first]{--ds-mat:#F4F5F2;--ds-mat-lit:#F4F5F2;}
      .ds-pick[data-inline]{--ds-pick-pad:clamp(16px,4vw,48px);padding:0 var(--ds-pick-pad);}
      .ds-pick[data-inline]>:is(.ds-pick-tools,.ds-pick-grid,.ds-pick-foot,.ds-pick-past){max-width:1240px;}
      .ds-pick[data-inline] .ds-pick-grid{grid-template-columns:repeat(auto-fill,minmax(168px,1fr));}
      .ds-pick[data-inline] .ds-pick-head{max-width:none;width:calc(100% + 2 * var(--ds-pick-pad));margin:0 calc(-1 * var(--ds-pick-pad));
        padding:20px calc(var(--ds-pick-pad) + max(0px,(100% - 1240px) / 2)) 16px;align-items:flex-start;gap:8px;text-align:left;background:#1B2A4A;border-bottom:1px dashed rgb(201 162 122 / .55);}
      .ds-pick[data-inline][data-compact] .ds-pick-head{padding-block:8px;}
      .ds-pick[data-inline] .ds-pick-titlebar{display:block;}
      .ds-pick[data-inline] .ds-pick-filters:not([open]){align-self:flex-start;}
      .ds-pick[data-inline] .ds-pick-row{width:100%;justify-content:space-between;}
      .ds-pick[data-inline] .ds-pick-legend{justify-content:flex-start;max-width:none;}
      .ds-pick[data-inline] .ds-pick-tabs button[aria-checked=true]{background:#F4F5F2;color:#1B2A4A;}
      .ds-pick[data-inline] .ds-pick-upbtn:hover{background:var(--cx-hover);}
      .ds-pick-past button{min-height:44px;}
      .ds-pick[data-inline] .ds-pick-head .ds-note:not(.ds-status *){color:#D8DCE4;}
      .ds-pick[data-inline] .ds-pick-head .ds-pick-frow{padding:4px 0;}
      .ds-pick[data-inline] .ds-pick-head .ds-pick-frow>span{flex:0 0 auto;color:#D8DCE4;}
      .ds-pick[data-inline]>:is(.ds-chips,.ds-pick-facets,.ds-pick-subh,.ds-pick-viewsw){max-width:1240px;}
      .ds-pick[data-inline]>:is(.ds-chips,.ds-pick-facets) .ds-chips,.ds-pick[data-inline]>.ds-chips{justify-content:flex-start;}
      .ds-pick[data-inline]>.ds-pick-viewsw{align-self:center;width:100%;justify-content:flex-start;margin:0 0 4px;padding:0;border:0;background:none;}
      .ds-pick[data-inline]>.ds-pick-viewsw button{flex:0 0 auto;padding:0 16px;}
      .ds-pick[data-inline]>.ds-pick-viewsw button[aria-checked=true]{background:#1B2A4A;color:#F4F5F2;}
      @media (max-width:479px){
        .ds-pick[data-inline] .ds-pick-row>*{flex:1 1 100%;justify-content:center;}
      }
      @media (max-width:1023px){
        .ds-bar-title,.ds-bar-back span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}
        .ds-bar-back{border-color:transparent;}
        .ds-bar-name{flex:1 1 0;width:auto;min-width:0;}
      }
      /* Phones and tablets: the name gives way so Review is never clipped; save status stays in the panel summary. */
      @media (max-width:1023px){
        .ds-bar .ds-bar-save{display:none;}
        .ds-bar .ds-view-chip{display:none;}
        .ds-stage-badge{display:inline-flex;align-items:center;gap:6px;position:absolute;bottom:8px;left:8px;z-index:3;padding:2px 8px;border-radius:8px;pointer-events:none;
          background:var(--warning-bg,#fff4d6);color:var(--warning-text,#7a4b00);font:700 13px/18px var(--cx-sans);white-space:nowrap;}
        .ds-stage-badge[data-cap=none]{background:var(--bg-surface);color:var(--text-muted);}
        .ds-cv[data-rulers] .ds-stage-badge{left:42px;}
      }
      @media (min-width:768px) and (max-width:1023px){.ds-bar-name{min-width:120px;}}
      @media (min-width:1024px) and (max-width:1279px){
        .ds-bar-title,.ds-bar-back span{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;}
        .ds-bar-name{flex:1 1 0;width:auto;min-width:120px;}
      }
      @media (max-width:767px){
        .ds-bar-primary{padding:0 12px;}
        .ds-bar-primary svg{display:none;}
      }
      /* Small phones and short screens: pinned picker bars would cover the garment, so they scroll with it. */
      @media (max-height:640px),(max-width:359px){
        .ds-pick[data-inline] :is(.ds-pick-head,.ds-pick-foot){position:static;}
      }
      /* 200% zoom and landscape phones: the page scrolls and the stage keeps a usable size instead of collapsing. */
      @media (max-height:559px){
        .ds{overflow-y:auto;}
        .ds-bar,.ds-body{flex:none;}
        .ds-body{height:max(560px,calc(100dvh - 56px));}
        .ds[data-first] .ds-body{height:calc(100dvh - 56px);}
      }
      @media (max-height:559px) and (max-width:1023px){
        .ds-body{height:auto;overflow:visible;}
        .ds-cv{flex:none;height:max(420px,calc(100dvh - 56px));}
        .ds[data-first] .ds-cv{flex:1 1 auto;height:auto;}
        .ds-sheet{max-height:none;}
        .ds-panel-scroll{overflow:visible;}
        .ds-bnav{position:sticky;bottom:0;z-index:var(--cx-z-bar);}
      }
      .ds-keys-pref{min-height:44px;display:grid;grid-template-columns:auto 1fr;align-items:center;gap:8px;margin-top:8px;font-size:13px;line-height:1.4;cursor:pointer;}
      .ds-keys-pref input{width:18px;height:18px;accent-color:#046A78;}
      .ds-keys-pref small{display:block;color:var(--cx-ink-2);font-size:13px;}
    
      /* 44px touch targets for every Studio control (VFRB rule). Decorative icons, badges and rulers are left as they are. */
      .ds :is(.ds-ftb button,.ds-stage-btn,.ds-ctrl,.ds-pick-tabs button,.ds-byo-check,.ds-zone,.ds-tp-change .ds-btn,
        .ds-link-danger,.ds-seg button,.ds-btn,.ds-tp-catchip,.ds-guides-btn,.ds-tools-btn,.ds-guides-row select,.ds-lay-pick,.ds-lay-edit,
        .ds-ins-field input,.ds-ins-field select,.ds-ins-align .ds-act,.ds-piece-add,.ds-tabs button,.ds-tp-clear,.ds-link,.ds-chip){min-height:44px;}
      .ds :is(.ds-ftb button,.ds-stage-btn,.ds-ctrl){min-width:44px;}
      .ds :is(.ds-ftb button,.ds-stage-btn){width:44px;height:44px;}
      .ds .ds-tp-mini{width:44px;height:44px;}
      .ds .ds-tp-sw{width:44px;height:44px;}

      /* Desktop studio: a 76px rail (pieces, one tool column, help), a floating Navigator, Layers only in the right panel */
      .ds-tabcount{display:inline-grid;place-items:center;min-width:18px;height:18px;margin-left:4px;padding:0 5px;border-radius:9px;background:var(--cx-thread);color:#fff;font:700 11px/1 var(--cx-sans);}
      .ds-help-btn{width:44px;height:44px;border:1px solid var(--cx-line-strong);border-radius:50%;background:var(--cx-card);color:var(--cx-ink);font:700 18px var(--cx-sans);cursor:pointer;}
      .ds-help-btn:hover{background:var(--cx-hover);}
      .ds-help-btn:focus-visible,.ds-help-menu button:focus-visible{outline:2px solid var(--cx-thread-ink);outline-offset:2px;}
      .ds-help{position:relative;}
      .ds-help-menu{position:absolute;left:calc(100% + 8px);bottom:0;z-index:30;min-width:200px;margin:0;padding:6px;list-style:none;border:1px solid var(--cx-line-strong);border-radius:12px;background:var(--cx-card);box-shadow:0 12px 32px -12px rgb(15 23 42 / .35);}
      .ds-help-menu button{width:100%;min-height:44px;padding:0 12px;border:0;border-radius:8px;background:transparent;color:var(--cx-ink);font:600 14px var(--cx-sans);text-align:left;cursor:pointer;}
      .ds-help-menu button:hover{background:var(--cx-hover);}
      .ds-tool-slot:empty{display:none;}
      @media (min-width:1024px){
        .ds-rail{width:76px;gap:10px;padding:12px 6px;align-items:center;}
        .ds-rail-h,.ds-rail-txt strong{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}
        .ds-rail-list{width:100%;}
        .ds-rail-card{flex-direction:column;justify-content:center;gap:3px;min-height:0;padding:6px 2px;text-align:center;}
        .ds-rail-thumb{width:48px;height:56px;}
        .ds-rail-txt small{font-size:12px;font-weight:700;color:var(--cx-ink);}
        .ds-rail-acts .ds-btn:not(.ds-piece-add),.ds-rail-acts .ds-switch,.ds-rail-note{display:none;}
        .ds-rail .ds-piece-add{width:44px;min-height:44px;padding:0;justify-content:center;}
        .ds-rail .ds-piece-add>span:not(.ds-piece-add-plus){position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);}
        .ds-rail-acts{align-items:center;}
        .ds-tool-slot{width:100%;display:flex;justify-content:center;padding-top:10px;border-top:1px solid var(--cx-line);}
        .ds-tool-slot .ds-tools{flex-direction:column;position:static;max-height:none;box-shadow:none;border:0;padding:0;background:transparent;}
        .ds-tool-slot .ds-tools-ink{margin:6px 0 0;}
        .ds-tool-slot .ds-tools-size{flex-direction:column;margin:4px 0 0;padding:4px 0 0;border-left:0;border-top:1px solid var(--cx-line);}
        .ds-help{margin-top:auto;}
        .ds-phone-only{display:block;}
        .ds-nav-slot{position:absolute;left:88px;bottom:96px;z-index:6;width:152px;padding:8px;border:1px solid var(--cx-line);border-radius:14px;background:var(--cx-card);box-shadow:0 8px 24px -12px rgb(15 23 42 / .35);}
        .ds-nav-slot .ds-navi{padding-top:0;border-top:0;}
      }
`}</style>
  );
}
