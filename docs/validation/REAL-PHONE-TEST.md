# Real-phone test script: touch and PWA branches

Branch under test: `feat/mobile-polish` (`dc80530`). It already contains `feat/studio-touch` (`3edc294`), so one build covers both.
Not merged into `main` (`596344d`, tag `defense-2026-11f`) until this script passes on one Android phone and one iPhone.
Demo stack only: backend `php -S 127.0.0.1:8000` on vfrb_demo, demo customer account (Ana Villanueva, demo password from the DemoDataSeeder notes). Never point the phone at live.

Mark each step **Pass**, **Fail** (write what happened) or **N/A**. Note phone model, OS and browser version at the top of your results.

## 0. Setup (about 15 minutes)

**Build the branch**
```
git switch feat/mobile-polish
npm run build
VITE_PROXY_TARGET=http://127.0.0.1:8000 npx vite preview --host --port 5180 --strictPort   # Git Bash
# stop any Vite dev server on :5180 first
```
Dev mode (`npm run dev`) is fine for gesture sections 1-3, but the installed-app section 4 needs this production build: the PWA is switched off in dev.

**Android (Chrome)**: USB port forwarding, so the phone opens `http://localhost:5180` (a secure context: service worker and install prompt work).
1. Phone: Developer options on, USB debugging on, plug into the laptop.
2. Laptop Chrome: `chrome://inspect/#devices` > Port forwarding > `5180` -> `localhost:5180`, tick Enable.
3. Phone Chrome: open `http://localhost:5180`, sign in as the demo customer.

**iPhone (Safari)**: same Wi-Fi, open `http://<laptop-LAN-IP>:5180` (from `ipconfig`). Plain HTTP on a LAN address has no service worker, so in section 4 only the Add to Home Screen icon and status bar steps apply; mark the rest N/A. Allow the port in Windows Firewall if the page does not load.

**After testing (both phones and the laptop)**: the preview build registers a service worker on `localhost:5180` that would shadow `npm run dev` later. In laptop Chrome devtools > Application: Unregister the worker and Clear storage for `localhost:5180`. On the phone, remove the installed app.

## 1. Design Studio touch (Studio, any garment, add one text element)
| # | Step | Expected | A | i |
|---|---|---|---|---|
| 1.1 | Select the text, put two fingers on it, spread and twist | Text grows and turns around its centre; the stage does not zoom | | |
| 1.2 | Lift fingers, tap Undo once | Text goes back to its size and angle before the pinch (one undo step) | | |
| 1.3 | Two fingers on the empty stage, spread | Stage zooms; text unchanged | | |
| 1.4 | Two-finger quick tap on the stage | "Undone" shows; last change undone | | |
| 1.5 | Long-press the text (hold still ~0.5 s) | Menu: Duplicate, Bring to front, Send to back, Delete; no phone menu, no text selection, no grey flash | | |
| 1.6 | Long-press, but slide the finger before 0.5 s | No menu; the text moves | | |
| 1.7 | Menu > Duplicate; then long-press > Delete | A copy appears; then it is removed | | |
| 1.8 | Open the menu with a short stage (panel at peek height) | Menu fits between the tool row and the panel (2x2 grid if short) | | |
| 1.9 | Snap on: drag the text towards the centre line | Android: one short buzz as it locks on. iPhone: no buzz (expected) | | n/a |
| 1.10 | Choose Pen at 390-ish width | Stroke sizes wrap to a second row, all reachable | | |
| 1.11 | Lock the text in the panel, long-press it | Menu shows "Locked" note; actions disabled | | |
| 1.12 | Rotate phone to landscape and back | Studio relayouts; design unchanged | | |

## 2. Customer pages: pull to refresh
| # | Step | Expected | A | i |
|---|---|---|---|---|
| 2.1 | Dashboard at the very top: pull down and release past the dial turning teal | Dial winds, fills teal, spins, then data reloads; Android buzzes once at the teal point | | |
| 2.2 | Pull a little and release before teal | Nothing reloads; dial springs away | | |
| 2.3 | Scroll down, then drag down | Normal scrolling; no dial | | |
| 2.4 | Orders and My Designs: repeat 2.1 | Same behaviour | | |
| 2.5 | Android Chrome tab (not installed): pull at the top | Only our dial appears, never Chrome's own refresh circle as well | | n/a |
| 2.6 | Swipe sideways on the Orders filter chips | Chips scroll sideways; no dial | | |
| 2.7 | Messages, Settings, Order wizard: pull at the top | No dial (not enabled there) | | |

## 3. Customer pages: sheets and taps
| # | Step | Expected | A | i |
|---|---|---|---|---|
| 3.1 | Bottom nav > More; drag the handle down a little, let go | Sheet follows the finger, springs back | | |
| 3.2 | Flick the handle down | Sheet closes (Android buzz) | | |
| 3.3 | Tap Settings in the sheet | Navigates (a tap is not mistaken for a drag) | | |
| 3.4 | Bell > swipe the panel header up | Panel closes | | |
| 3.5 | Bell > scroll the notification list | List scrolls; panel stays open | | |
| 3.6 | Tap any button or card | Slight press-shrink, no grey tap flash | | |
| 3.7 | Phone setting "Reduce motion" on, repeat 2.1 and 3.1 | Works with no spin or spring animation; no buzz | | |

## 4. Installed app (production preview build)
| # | Step | Expected | A | i |
|---|---|---|---|---|
| 4.1 | Dashboard in the browser | Card "Add VFRB to your home screen" (iPhone: Share instructions) | | |
| 4.2 | Android: tap "Add to home screen" and accept | App installs; card disappears and stays gone after reload | | n/a |
| 4.3 | iPhone: Share > Add to Home Screen | Icon is the VFRB seal, name "VFRB" | n/a | |
| 4.4 | Open the installed app | Navy launch screen with the seal, then the app; no browser address bar | | |
| 4.5 | Look at the phone status bar inside the portal | Matches the white header; clock and battery readable (iPhone too) | | |
| 4.6 | Long-press the home-screen icon (Android) | Shortcuts: Design Studio, My Orders, Messages; each opens the right page | | n/a |
| 4.7 | Rotate the installed app | Rotates (no longer locked to portrait) | | |
| 4.8 | Airplane mode on, inside the app | Navy strip "You're offline…" under the header; pages already opened still show | | n/a |
| 4.9 | Airplane mode off | Strip disappears | | n/a |
| 4.10 | "Not now" on the card (fresh install of the browser profile) | Card hidden for 30 days | | |

## 5. Regression spot checks (both phones)
| # | Step | Expected | A | i |
|---|---|---|---|---|
| 5.1 | Studio: save a design, open it from My Designs | Design restores exactly | | |
| 5.2 | Review & order > wizard > Submit (then cancel the order as demo-manager) | Order placed; Order Detail shows the design | | |
| 5.3 | Sign-in page: tap a field | 2px teal focus ring | | |
| 5.4 | Any page | No sideways scrolling | | |

## Pass rule and next steps
- **Merge `feat/studio-touch` first** when sections 1 and 5 pass on both phones (haptic rows: Android only).
- **Then `feat/mobile-polish`** when sections 2-4 pass. Any Fail in 2.5 (double refresh), 3.3 (taps eaten) or 4.5 (unreadable status bar) blocks the merge.
- Record results, phone models and the build commit in HANDOFF; then follow the normal release order (ff-merge, push, Vercel Ready, live check, tag).
