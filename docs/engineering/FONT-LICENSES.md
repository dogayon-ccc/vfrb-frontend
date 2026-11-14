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
| Poppins | Sans | 400, 700 | `poppins` | Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-ThinItalic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-ExtraLight.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-ExtraLightItalic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-Light.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-LightItalic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-Regular.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-Italic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-Medium.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-MediumItalic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-SemiBold.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-SemiBoldItalic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-Bold.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-BoldItalic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-ExtraBold.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-ExtraBoldItalic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-Black.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) Poppins-BlackItalic.ttf: Copyright 2020 The Poppins Project Authors (https://github.com/itfoundry/Poppins) |
| Nunito | Sans | 400, 700 | `nunito` | Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito) Nunito-Italic[wght].ttf: Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito) |
| Barlow Condensed | Condensed | 400, 700 | `barlow-condensed` | Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-ThinItalic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-ExtraLight.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-ExtraLightItalic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-Light.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-LightItalic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-Regular.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-Italic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-Medium.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-MediumItalic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-SemiBold.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-SemiBoldItalic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-Bold.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-BoldItalic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-ExtraBold.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-ExtraBoldItalic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-Black.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) BarlowCondensed-BlackItalic.ttf: Copyright 2017 The Barlow Project Authors (https://github.com/jpt/barlow) |
| Teko | Condensed | 400, 700 | `teko` | Copyright 2023 The Teko Project Authors (https://www.github.com/googlefonts/teko) |
| Archivo Black | Display | 400 | `archivo-black` | Copyright 2017 The Archivo Black Project Authors (https://github.com/Omnibus-Type/ArchivoBlack) |
| Bungee | Display | 400 | `bungee` | Copyright 2023 The Bungee Project Authors (https://github.com/djrrb/Bungee) |
| Righteous | Display | 400 | `righteous` | Copyright (c) 2011 by Brian J. Bonislawsky DBA Astigmatic (AOETI) (astigma@astigmatic.com), with Reserved Font Name "Righteous" |
| Bangers | Display | 400 | `bangers` | Copyright 2010 The Bangers Project Authors (https://github.com/googlefonts/bangers) |
| Abril Fatface | Display | 400 | `abril-fatface` | Copyright (c) 2011, Copyright (c) 2011, TypeTogether (www.type-together.com info@type-together.com), with Reserved Font Names "Abril" and "Abril Fatface" |
| Alfa Slab One | Slab | 400 | `alfa-slab-one` | Copyright 2016 The Alfa Slab One Project Authors (http://www.jmsole.cl | info@jmsole.cl), with Reserved Font Name "Alfa Slab". |
| Cinzel | Serif | 400, 700 | `cinzel` | Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel) |
| Caveat | Script | 400, 700 | `caveat` | Copyright 2014 The Caveat Project Authors (https://github.com/googlefonts/caveat) |

Adding a font: OFL (or another licence that allows embedding and redistribution) only. Put its files in `public/fonts/`, its
licence in `public/fonts/licenses/`, add it to `WEB_FONTS` and to this table. `node tools/logic-checks.mjs` fails if a
`WEB_FONTS` entry has no licence file, no row here, or a missing weight file.

Older designs saved with the previous system-font stacks (`LEGACY_FONTS` in `dsShared.js`) keep their saved `fontFamily`
unchanged and still render; those fonts are the viewer's own and are not distributed by VFRB.
