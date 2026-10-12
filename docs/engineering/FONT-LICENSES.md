# Studio font licences

The Design Studio's text fonts are self-hosted in `public/fonts/` (latin subset, woff2). They are listed in
`src/pages/client/design-studio/studioFonts.js` (`WEB_FONTS`) and load only when used: never precached by the service worker,
cached on first use (`vite.config.js`, `vfrb-fonts`).

Every font is licensed under the **SIL Open Font License 1.1** (OFL-1.1): free to use, embed and redistribute, including
commercially, provided the font files are not sold on their own and the licence travels with them. The full licence text for
each family is in `public/fonts/licenses/<file>.txt`, copied from the package.

Source: Fontsource packages `@fontsource/<file>@5.3.0` (npm licence field `OFL-1.1`), files `<file>-latin-<weight>-normal.woff2`,
downloaded 2026-10-13 and renamed `<file>-<weight>.woff2`. No npm dependency was added.

| Font | Style | Weights | File stem | Copyright |
|---|---|---|---|---|
| Inter | Sans | 400, 700, 900 | `inter` | Copyright 2016 The Inter Project Authors (https://github.com/rsms/inter) |
| Montserrat | Sans | 400, 700, 800 | `montserrat` | Copyright 2011 The Montserrat Project Authors (https://github.com/JulietaUla/Montserrat) |
| Oswald | Condensed | 400, 700 | `oswald` | Copyright 2016 The Oswald Project Authors (https://github.com/googlefonts/OswaldFont) |
| Bebas Neue | Display | 400 | `bebas-neue` | Copyright 2019 The Bebas Neue Project Authors (https://github.com/dharmatype/Bebas-Neue) |
| Anton | Display | 400 | `anton` | Copyright 2020 The Anton Project Authors (https://github.com/googlefonts/AntonFont.git) |
| Graduate | Varsity | 400 | `graduate` | Copyright (c) 2012, Eduardo Tunni (http://www.tipo.net.ar edu@tipo.net.ar), with Reserved Font Name "Graduate" |
| Playfair Display | Serif | 400, 700 | `playfair-display` | Copyright 2017 The Playfair Display Project Authors (https://github.com/clauseggers/Playfair-Display), with Reserved Font Name "Playfair Display". |
| Lora | Serif | 400, 700 | `lora` | Copyright 2011 The Lora Project Authors (https://github.com/cyrealtype/Lora-Cyrillic), with Reserved Font Name "Lora". |
| Pacifico | Script | 400 | `pacifico` | Copyright 2018 The Pacifico Project Authors (https://github.com/googlefonts/Pacifico) |
| Dancing Script | Script | 400, 700 | `dancing-script` | Copyright 2016 The Dancing Script Project Authors (https://github.com/googlefonts/DancingScript), with Reserved Font Name 'Dancing Script'. |
| Great Vibes | Script | 400 | `great-vibes` | Copyright 2010 The Great Vibes Pro Project Authors (https://github.com/googlefonts/great-vibes) |
| JetBrains Mono | Mono | 400, 700 | `jetbrains-mono` | Copyright 2020 The JetBrains Mono Project Authors (https://github.com/JetBrains/JetBrainsMono) |

Adding a font: OFL (or another licence that allows embedding and redistribution) only. Put its files in `public/fonts/`, its
licence in `public/fonts/licenses/`, add it to `WEB_FONTS` and to this table. `node tools/logic-checks.mjs` fails if a
`WEB_FONTS` entry has no licence file, no row here, or a missing weight file.

Older designs saved with the previous system-font stacks (`LEGACY_FONTS` in `dsShared.js`) keep their saved `fontFamily`
unchanged and still render; those fonts are the viewer's own and are not distributed by VFRB.
