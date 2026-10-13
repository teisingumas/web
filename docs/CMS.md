# Turinio valdymas (CMS): paleidimas žingsnis po žingsnio

Šis vadovas skirtas pirmam kartui. Kiekvienas žingsnis užtrunka 5–10 minučių.
Meniu pavadinimai Hostinger ir Clerk sistemose kartais šiek tiek pasikeičia: jei mygtukas vadinasi kitaip, ieškokite panašaus.

## Kaip tai veikia

- **`/adminas`**: prisijungimas (Clerk). **`/apzvalga`**: turinio valdymas (tik prisijungus).
- Tekstai, SEO ir naujienos saugomi **MySQL duomenų bazėje** Hostinger'yje.
  Nuotraukos saugomos aplanke **`megusta-data`** šalia `public_html` (ne jo viduje, todėl naujos svetainės versijos jų neištrina).
- Išsaugoti pakeitimai svetainėje matomi **iš karto**, kai atnaujinamas puslapis. Svetainės perrinkti nereikia.
- Kodas į Hostinger keliauja kaip ir anksčiau: `main` šaka → GitHub Actions → šaka `hostinger` → Hostinger.
- Kol nustatymai nebaigti, svetainė veikia kaip anksčiau, su tekstais iš kodo.

## Ką reikės padaryti

| # | Kur | Ką gausite |
|---|-----|------------|
| 1 | Hostinger hPanel | Duomenų bazę: pavadinimą, vartotoją, slaptažodį |
| 2 | Hostinger hPanel | PHP 8.2 ar naujesnę |
| 3 | clerk.com | **Publishable key** (`pk_…`) ir kliento **User ID** (`user_…`) |
| 4 | Hostinger File Manager | Failą `megusta-config.php` su aukščiau gautomis reikšmėmis |
| 5 | GitHub | Naujos versijos paleidimą (merge į `main`) |
| 6 | Naršyklė | Pirmą prisijungimą ir patikrą |

> **Slaptažodžių niekam nesiųskite** (ir į pokalbį su AI ar kūrėju). Jie įrašomi tik į failą serveryje.
> Clerk **Secret key** šiai sistemai nereikalingas: jo niekur nekopijuokite.

---

## 1 žingsnis. Duomenų bazė (Hostinger)

1. Prisijunkite prie [hpanel.hostinger.com](https://hpanel.hostinger.com).
2. **Websites** → prie `testas.vedejasedvardas.lt` spauskite **Dashboard / Manage**.
3. Kairiajame meniu: **Databases → Management**.
4. Skiltyje „Create a New MySQL Database and Database User“:
   - **MySQL database name**: `megusta` (Hostinger pats pridės priešdėlį, pvz. `u123456789_megusta`);
   - **MySQL username**: `megusta` (taps pvz. `u123456789_megusta`);
   - **Password**: spauskite slaptažodžio generavimą arba sugalvokite ilgą (bent 16 ženklų);
   - **Create**.
5. Lentelėje žemiau matysite **pilnus** pavadinimus su priešdėliu. Užsirašykite saugiai:
   - duomenų bazės pavadinimą (`u123456789_megusta`);
   - vartotojo vardą (`u123456789_megusta`);
   - slaptažodį.

Lentelių kurti nereikia: sistema jas sukurs pati, kai pirmą kartą prisijungsite.

## 2 žingsnis. PHP versija (Hostinger)

1. Tame pačiame hPanel: **Advanced → PHP Configuration**.
2. **PHP version**: pasirinkite **8.3** arba **8.2** → **Update / Save**.
3. Skirtukas **PHP extensions**: turi būti pažymėta `gd`, `fileinfo`, `pdo_mysql`, `curl`, `openssl` (dažniausiai jau įjungta).

## 3 žingsnis. Prisijungimo sistema (Clerk)

1. Eikite į [clerk.com](https://clerk.com) → **Sign up** (galite prisijungti su Google). Nemokamo plano pakanka.
2. **Create application**:
   - **Application name**: `Me Gusta`;
   - prisijungimo būdai: palikite **tik Email** (išjunkite Google, Apple ir kt.);
   - **Create application**.
3. Įsitikinkite, kad galima jungtis el. paštu ir slaptažodžiu:
   **Configure → User & authentication** → **Email** įjungtas, **Password** įjungtas.
4. **Uždarykite registraciją**, kad niekas kitas nesusikurtų paskyros:
   **Configure → Restrictions → Sign-up mode → Restricted** → Save.
5. Sukurkite kliento paskyrą: viršuje **Users → Create user** → kliento el. paštas ir slaptažodis → **Create**.
   Slaptažodį klientui perduokite saugiai (pvz. telefonu). Klientas vėliau gali jį pasikeisti per „Pamiršote slaptažodį?“.
6. Spauskite ant ką tik sukurto vartotojo → nukopijuokite **User ID** (prasideda `user_`).
7. **Configure → API keys** → nukopijuokite **Publishable key** (prasideda `pk_test_`).

> Dabar Clerk veikia **Development** režimu: viskas veikia, tik prisijungimo lange matysite užrašą „Development mode“.
> Kai svetainė persikels į tikrą domeną, atlikite [8 žingsnį](#8-žingsnis-vėliau-tikras-domenas).

## 4 žingsnis. Nustatymų failas (Hostinger File Manager)

Failo `megusta-config.php` niekur atsisiųsti nereikia: jo dar **nėra**, jį sukuriate patys kaip naują tuščią failą
ir įklijuojate žemiau esantį tekstą. Jame laikomi slaptažodžiai, todėl jo nėra GitHub'e ir jis nepatenka į viešą svetainę.

**Kur jis turi būti** (šalia `public_html`, ne jo viduje):

```
domains/
└── testas.vedejasedvardas.lt/
    ├── public_html/            ← svetainės failai (čia NEKURTI)
    └── megusta-config.php      ← ČIA
```

1. hPanel → **Websites** → prie `testas.vedejasedvardas.lt` spauskite **Manage** → kairėje **Files → File Manager**.
2. File Manager dažniausiai atsidaro aplanke `public_html`. Pakilkite vienu lygiu aukščiau:
   kelio juostoje viršuje spauskite **`testas.vedejasedvardas.lt`** (arba rodyklę „aukštyn“).
   Turite matyti aplanką `public_html` kaip vieną iš sąrašo elementų.
3. Viršutinėje juostoje spauskite **New File** (lapo su „+“ ikona), įrašykite pavadinimą **`megusta-config.php`** → **Create**.
4. Du kartus spustelėkite naują failą: atsidarys tuščias redaktorius. Įklijuokite visą tekstą žemiau.
5. Pakeiskite **5 reikšmes** tarp kabučių (pačias kabutes `'…'` palikite):

```php
<?php
return [
    'db' => [
        'host' => 'localhost',
        'name' => 'u123456789_megusta',
        'user' => 'u123456789_megusta',
        'pass' => 'ČIA_SLAPTAŽODIS',
    ],
    'clerk_publishable_key' => 'pk_test_ČIA_RAKTAS',
    'admin_user_ids' => [
        'user_ČIA_ID',
    ],
];
```

| Ką keisti | Iš kur paimti |
|-----------|---------------|
| `'name' => '…'` | 1 žingsnis: hPanel → Databases → Management, stulpelis **MySQL database** (pvz. `u123456789_megusta`) |
| `'user' => '…'` | Ten pat, stulpelis **MySQL user** |
| `'pass' => '…'` | Slaptažodis, kurį įrašėte kurdami duomenų bazę |
| `'clerk_publishable_key' => '…'` | 3 žingsnis: Clerk → **API keys** → **Publishable key** (prasideda `pk_test_`) |
| `'user_…'` | 3 žingsnis: Clerk → **Users** → spauskite vartotoją → **User ID** (prasideda `user_`) |

6. Išsaugokite (diskelio ikona viršuje arba **Ctrl+S**) ir uždarykite redaktorių.

Jei kliento User ID dar nežinote, palikite `'user_ČIA_ID'`: 6 žingsnyje prisijungus puslapis parodys tikrąjį ID ir jį įrašysite vėliau.
Aplankas `megusta-data` (nuotraukoms) susikurs pats šalia šio failo.

## 5 žingsnis. Paleiskite naują versiją (GitHub)

1. GitHub saugykloje `teisingumas/web` atidarykite Pull Request iš šakos `claude/confident-euler-y1qemg` į `main` ir spauskite **Merge**.
2. **Actions** skiltyje per ~1 minutę užsibaigs „Build for Hostinger“ (žalia varnelė). Hostinger per minutę ar dvi įdiegs naują versiją.
3. Atidarykite `https://testas.vedejasedvardas.lt/`. Svetainė turi atrodyti kaip anksčiau, o meniu atsiras **Naujienos**.

## 6 žingsnis. Pirmas prisijungimas

1. Atidarykite `https://testas.vedejasedvardas.lt/adminas`.
2. Jei kažkas dar nesutvarkyta, puslapyje matysite patikros sąrašą su ✓ ir ✗ bei ką daryti prie kiekvieno ✗.
3. Prisijunkite kliento el. paštu ir slaptažodžiu. Pirmą kartą iš naujo įrenginio Clerk gali atsiųsti kodą el. paštu.
4. Pateksite į **Apžvalgą** (`/apzvalga`).
   Jei vietoje to matote „Ši paskyra neturi prieigos“, nukopijuokite rodomą ID į `admin_user_ids` faile `megusta-config.php` ir atnaujinkite puslapį.

## 7 žingsnis. Patikra (5 min.)

- **Bendri nustatymai → Socialiniai tinklai**: įrašykite Facebook / Instagram nuorodas → **Išsaugoti** → atnaujinkite svetainę: ikonos atsiras viršuje ir apačioje.
  (Kol nuorodos tuščios, ikonos nerodomos, kad neliktų neveikiančių nuorodų.)
- **Naujienos → + Nauja naujiena**: pavadinimas, santrauka, tekstas, viršelio nuotrauka su alt tekstu → **Publikuoti**.
  Naujiena atsiras puslapyje `/naujienos` ir savo adresu, pvz. `/rudens-vakarelis`.
- **Nuotraukos**: įtempkite kelias nuotraukas.
- `https://testas.vedejasedvardas.lt/sitemap.xml` rodo visus puslapius ir naujienas.
  Šį adresą verta pateikti [Google Search Console](https://search.google.com/search-console).

## 8 žingsnis (vėliau). Tikras domenas

Kai svetainė persikels iš `testas.vedejasedvardas.lt` į tikrą domeną (pvz. `megusta.lt`):

1. **Clerk**: viršuje perjunkite **Development → Production** (Create production instance) → įrašykite domeną.
   Clerk parodys kelis **DNS įrašus (CNAME)**: hPanel → **Domains → DNS / Nameservers** pridėkite juos tokius, kokie parodyti, ir Clerk'e spauskite **Verify**.
   Production turi **atskirus vartotojus**: kliento paskyrą sukurkite iš naujo ir paimkite naujus `pk_live_…` bei `user_…`.
2. **Hostinger**: naujam domenui sukonfigūruokite Git diegimą taip pat kaip dabar (šaka `hostinger`).
   Į `domains/megusta.lt/` perkelkite failą `megusta-config.php` **ir aplanką `megusta-data`** (jame nuotraukos), įrašykite naujus Clerk raktus.
   Duomenų bazė lieka ta pati.
3. Seni WordPress naujienų adresai (`megusta.lt/naujienos-pavadinimas/`) veiks, jei naujienai nurodysite tą patį adresą (žr. žemiau).

---

## Kasdienis darbas (klientui)

- **Puslapiai**: kiekviena skiltis (Hero, Treneriai, Kainos…) turi savo mygtuką **Išsaugoti**. Neišsaugotos skiltys pažymėtos **„Neišsaugota“**.
  Bandant išeiti su neišsaugotais pakeitimais, sistema įspės.
- **Sąrašai** (treneriai, stiliai, D.U.K., tvarkaraščio laikai): **+ Pridėti**, **↑ ↓** perkelti, **×** ištrinti. Viskas įsigalioja paspaudus „Išsaugoti“.
- **Nuotraukos**: įtempkite failą ant nuotraukos lauko arba spauskite „Iš bibliotekos“. JPG, PNG ar WebP **iki 2 MB**
  (didesnę sumažinkite, pvz. nemokamai [squoosh.app](https://squoosh.app)). Sistema pati sumažina iki 2400 px ir paverčia WebP.
- **Alt tekstas**: trumpai aprašykite, kas nuotraukoje („Vaikai šoka gatvės šokius Me Gusta salėje“). Tai padeda Google ir neregiams.
- **Hero nuotrauka**: paspauskite ant nuotraukos ten, kur svarbiausia vieta. Ji liks matoma ir telefonuose.
- **Naujienos**: galite išsaugoti **juodraštį** (svetainėje nesimato) ir publikuoti vėliau. Peržiūra rodo, kaip naujiena atrodys.
  **Adresą** sistema sukuria iš pavadinimo; jį galite pakeisti, pvz. kad sutaptų su sena WordPress nuoroda.
- **SEO**: kiekvieno puslapio skirtuke **SEO** ir prie kiekvienos naujienos: pavadinimas, aprašymas, raktažodžiai, nuotrauka dalinantis.
  Peržiūra rodo, kaip puslapis atrodys Google paieškoje.
- Nuotraukos, kuri kur nors naudojama, ištrinti negalima: sistema parodys, kur ji naudojama.

---

## Techninė dalis (kūrėjui)

| Kas | Kur |
|-----|-----|
| Turinio schema (laukai, privalomumas, ilgiai, SEO numatytieji) | `src/content/schema.json` |
| Pradinis turinys (kol skiltis neišsaugota DB) | `src/content/defaults.ts` |
| Tipai | `src/content/types.ts` |
| Admin | `src/admin/` (įkeliamas tik `/adminas` ir `/apzvalga`) |
| Viešos naujienos | `src/News.tsx`, `src/PostPage.tsx`, `src/NotFound.tsx` |
| PHP: puslapio SEO ir turinio įterpimas | `server/index.php` |
| PHP: API | `server/api/index.php`, logika `server/lib/` |
| Apache taisyklės | `public/.htaccess` |

- **Naujas laukas**: pridėkite jį į `schema.json` (admin forma ir serverio validacija atsiras automatiškai), `types.ts`, `defaults.ts` ir panaudokite komponente.
- **Saugumas**: kiekvienas `/api/admin/*` tikrina Clerk JWT (RS256 parašas, galiojimas, `iss`, `azp`) ir ar `sub` yra `admin_user_ids`.
  HTML iš redaktorių serveryje perrašomas pagal leidžiamų žymų sąrašą. Įkeltos nuotraukos patikrinamos, perkoduojamos (EXIF pašalinamas) ir pervadinamos.
  Įrašymo užklausos siunčiamos kaip `POST` + `X-HTTP-Method-Override` (kai kurie hostingai blokuoja PUT/DELETE).
- **Lokalus paleidimas su PHP**:
  1. MySQL/MariaDB duomenų bazė ir konfigūracijos failas kaip 4 žingsnyje (galima `'clerk_jwt_key' => '<PEM>'` vietoje tinklo, `'extra_origins' => ['http://127.0.0.1:5173']`).
  2. `npm run build`, tada `MEGUSTA_CONFIG=/kelias/config.php npm run dev:php` (http://127.0.0.1:8080, kaip Hostinger).
  3. Admin kūrimui: `CMS_API=http://127.0.0.1:8080 npm run dev`.
     Be Clerk galima su `VITE_DEV_ADMIN_TOKEN=<JWT, pasirašytas jūsų bandomuoju raktu>`. Tai veikia tik `npm run dev`; serveris tokeną vis tiek tikrina.
