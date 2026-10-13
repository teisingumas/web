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

## Turinio valdymas (CMS)

Klientas tekstus, nuotraukas, tvarkaraštį, naujienas ir SEO keičia adresu **`/adminas`** (prisijungimas per Clerk),
valdymas yra **`/apzvalga`**. Turinys saugomas Hostinger MySQL duomenų bazėje, pakeitimai matomi iš karto.
Paleidimo vadovas žingsnis po žingsnio ir naudojimo instrukcija: **[docs/CMS.md](docs/CMS.md)**.

## Struktūra

- `src/App.tsx` — puslapio rėmas (nav, footer) ir pagrindinio puslapio skiltys
- `src/content/` — turinio schema (`schema.json`), pradinis turinys (`defaults.ts`) ir tipai
- `src/News.tsx`, `src/PostPage.tsx`, `src/NotFound.tsx` — naujienų sąrašas (`/naujienos`), naujiena (`/<adresas>`), 404
- `src/admin/` — turinio valdymas (įkeliamas tik `/adminas` ir `/apzvalga`)
- `server/` — PHP: `index.php` (SEO žymės ir turinys kiekvienam puslapiui), `api/` (JSON API), `lib/`; build metu nukopijuojama į `dist/`
- `src/index.css` — šriftai (Barlow Condensed, Outfit), spalvų kintamieji, Tailwind
- `src/main.tsx` — React įėjimo taškas
- `index.html` — HTML apvalkalas (`lang="lt"`); `index.php` jį papildo puslapio title ir meta žymėmis

## Skirtumai nuo Figma eksporto

- Desktop vaizdas identiškas Figma (patikrinta pikselių palyginimu 1920 px pločiu).
- Pataisytos Figma kodo mobilios versijos klaidos (tik `max-width` media queries, desktop nepaliestas):
  meniu nuorodos nepasislėpdavo, statistika, kainos, tvarkaraštis ir footer išlįsdavo už ekrano krašto.
- Pašalinti Figma Make specifiniai Vite pluginai ir `.figma/make/site.json` priklausomybė.

Pradinės stilių ir hero nuotraukos yra `public/img/`; trenerių pradinės nuotraukos kraunamos iš Unsplash CDN.
Kliento įkeltos nuotraukos saugomos serveryje (`megusta-data/media`) ir rodomos adresu `/media/…`.

## Išdėstymo redaktorius

Pridėkite `#redaguoti` prie adreso (pvz. `http://localhost:5173/#redaguoti`) arba build'inkite su
`VITE_EDITOR=1`. Pažymėtus elementus galima tempti pele, tuščią hero vietą tempiant juda nuotrauka.
Panelėje matomos reikšmės, kurias galima nukopijuoti ir perkelti į kodą. Redaktorius pažymi tik
elementus su `data-edit` atributu; paprastiems lankytojams jis nerodomas.

## Talpinimas (Hostinger) ir automatinis atnaujinimas

- Kiekvienas `push` į pagrindinę šaką paleidžia GitHub Actions procesą
  `.github/workflows/deploy-hostinger.yml`: jis surenka svetainę (`npm run build`) ir paruoštus
  failus (`dist/`, kartu su `.htaccess`) įdeda į šaką **`hostinger`**.
- Hostinger (hPanel → Advanced → Git) iš šakos `hostinger` diegia failus į
  `domains/testas.vedejasedvardas.lt/public_html`. Auto Deployment webhook'as GitHub'e
  (Settings → Webhooks) praneša Hostinger'iui apie kiekvieną naują versiją.
- Puslapiai turi tikrus adresus (`/tvarkarastis`, `/registracija`, `/naujienos`, `/<naujiena>`); `.htaccess` visus kitus
  adresus nukreipia į `index.php`, todėl svetainė turi būti domeno šaknyje.
- Slapti nustatymai (`megusta-config.php`) ir nuotraukos (`megusta-data/`) yra aplanke virš `public_html`, todėl
  naujos versijos jų neperrašo. Žr. [docs/CMS.md](docs/CMS.md).
