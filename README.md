# MoveStudio — Hip Hop šokių studija

Svetainė atkurta 1:1 iš Figma Make eksporto („Hip Hop Dance Studio Website“).

Stack: React 19 + Vite 8 + Tailwind CSS v4 + TypeScript.

## Paleidimas

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # produkcinis build į dist/
npm run preview    # peržiūrėti dist/ (http://localhost:4173)
npm run typecheck  # TypeScript patikra
```

Jei svetainė talpinama ne domeno šaknyje (pvz. GitHub Pages `/web/`), build'inkite su
`BASE_PATH=/web/ npm run build`.

## Struktūra

- `src/App.tsx` — visas puslapis (nav, hero, statistika, stiliai, tvarkaraštis, kainos, treneriai, CTA, footer) ir jo duomenys
- `src/index.css` — šriftai (Barlow Condensed, Outfit), spalvų kintamieji, Tailwind
- `src/main.tsx` — React įėjimo taškas
- `index.html` — HTML apvalkalas (`lang="lt"`, title, meta)

## Skirtumai nuo Figma eksporto

- Desktop vaizdas identiškas Figma (patikrinta pikselių palyginimu 1920 px pločiu).
- Pataisytos Figma kodo mobilios versijos klaidos (tik `max-width` media queries, desktop nepaliestas):
  meniu nuorodos nepasislėpdavo, statistika, kainos, tvarkaraštis ir footer išlįsdavo už ekrano krašto.
- Pašalinti Figma Make specifiniai Vite pluginai ir `.figma/make/site.json` priklausomybė.

Nuotraukos kraunamos iš Unsplash CDN (kaip ir Figma originale).
