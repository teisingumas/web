import type { ContentMap } from './types'

// The site's starting content. The database only stores sections the client has saved;
// every other section shows these values. Images live in public/img (stable addresses,
// so a saved section can keep pointing at them).

const unsplash = (id: string) => `https://images.unsplash.com/${id}?w=400&h=520&fit=crop&auto=format`

export const DEFAULTS: ContentMap = {
  'global.contacts': {
    email: 'labas@megusta.lt',
    phone: '+370 606 44888',
    address: 'Savanorių pr. 271, Kaunas',
  },
  'global.socials': { facebook: '', instagram: '', tiktok: '', youtube: '' },
  'global.footer': {
    text: 'Profesionali hip hop šokių studija Kaune. 20 metų patirtis, 650+ laimėjimų, 4 šokių stiliai.',
    tagline: 'Designed with passion for movement.',
  },
  'global.seo': { siteName: 'Me Gusta', ogImage: { src: '/img/og-default.jpg', alt: 'Me Gusta šokių studija Kaune' } },

  'home.hero': {
    kicker: 'Kaune nuo 2006',
    line1: 'TAVO',
    line2: 'JUDESIO',
    line3: 'NAMAI',
    text: 'Profesionali hip hop šokių studija Kaune. Čia gatvių ritmai virsta scenos menu — nuo pirmų žingsnių iki čempionų podiumo.',
    primaryCta: 'Pasirink stilių →',
    secondaryCta: 'Tvarkaraštis',
    // x / y: the framing set with the layout editor (#redaguoti)
    image: { src: '/img/hero.webp', alt: '', x: 57.8, y: 35.9 },
    imageLight: { src: '/img/hero-light.webp', alt: '' },
  },
  'home.stats': {
    items: [
      { num: '4', label: 'Šokių stiliai' },
      { num: '5', label: 'Šokių mokytojai' },
      { num: '20', label: 'Metų patirties' },
      { num: '650+', label: 'Laimėjimų' },
    ],
  },
  'home.styles': {
    kicker: 'Ko mokome',
    title1: 'Pasirink savo',
    title2: 'stilių',
    button: 'Plačiau →',
    items: [
      {
        name: 'Gatvės šokiai',
        tagline: 'Born in the streets, perfected on stage',
        description: 'Autentiški gatvės šokiai — nuo popping ir locking iki krump ir freestyle. Ugdome individualų stilių ir išraišką kiekviename judėjime. Treniruotės vyksta dinamiškoje aplinkoje, kurioje kiekvienas randa savo balsą.',
        image: { src: '/img/styles/gatves.webp', alt: 'Gatvės šokiai Me Gusta studijoje' },
        levels: ['4–6 m.', '7–11 m.', '12–15 m.', 'Nuo 16 m.'],
      },
      {
        name: 'Pop Dance',
        tagline: 'Energy meets precision',
        description: 'Komerciniai ir sceniniai šokiai — ryškūs, dinamiški, su chartiška energija. Tobulai tinka scenai, muzikos vaizdo klipams ir konkursams. Šie šokiai jungia stilių ir techniką į vieną sprogstantį mišinį.',
        image: { src: '/img/styles/pop.webp', alt: 'Pop Dance šokėjai' },
        levels: ['7–11 m.', '12–15 m.', 'Nuo 16 m.'],
      },
      {
        name: 'Lady Class',
        tagline: 'Power. Grace. Confidence.',
        description: 'Moteriška plastika, heels šokiai ir sexy style. Atskleidžiame vidinę stiprybę ir išreiškiame ją per judėjimą. Lady Class — tai ne tik šokiai, tai savęs atradimas ir pasitikėjimo savimi ugdymas.',
        image: { src: '/img/styles/lady.webp', alt: 'Lady Class šokėja' },
        levels: ['12–15 m.', 'Nuo 16 m.', '4–99 m.'],
      },
      {
        name: 'Breikas',
        tagline: 'Defy gravity. Define limits.',
        description: 'Breakdance — nuo toprocko ir footwork iki freezes ir power moves. Kietumas, disciplina ir neįtikėtinas kūno valdymas. Mūsų treneriai — tarptautiniai čempionai, pasiruošę perduoti visas paslaptis.',
        image: { src: '/img/styles/breikas.webp', alt: 'Breiko šokėjas' },
        levels: ['7–11 m.', '12–15 m.', 'Nuo 16 m.'],
      },
    ],
  },
  'home.schedule': {
    kicker: 'Kada šokam',
    title: 'Tvarkaraštis',
    note: '<p>* Treniruotės vyksta Me Gusta salėje, Savanorių pr. 271, Kaunas. Pilną tvarkaraštį galite rasti paspaudę <a href="/tvarkarastis">Tvarkaraštis</a>.</p>',
    // Mon & Wed share one programme, Tue & Thu the other.
    days: [
      { day: 'Pirmadienis', classes: [] },
      { day: 'Antradienis', classes: [] },
      { day: 'Trečiadienis', classes: [] },
      { day: 'Ketvirtadienis', classes: [] },
    ],
  },
  pricing: {
    kicker: 'Prisijunk prie mūsų',
    title: 'Kainos',
    badge: 'Populiariausias',
    note: 'Pirmoji treniruotė nemokama.',
    plans: [
      {
        name: 'Standart', desc: '1 šokių stilius', price: '55', period: '/mėn',
        features: ['1 šokių stilius', '8 šokių pamokos per mėnesį', 'Studijos renginiai', 'Konkursai, čempionatai', 'Galimybė papildomai treniruotis'],
        highlight: false, cta: 'Rinktis Standart →',
      },
      {
        name: 'Intensive', desc: '2 šokių stiliai', price: '70', period: '/mėn',
        features: ['2 šokių stiliai', '16 šokių pamokų per mėnesį', 'Studijos renginiai', 'Konkursai, čempionatai', 'Galimybė papildomai treniruotis'],
        highlight: true, cta: 'Rinktis Intensive →',
      },
    ],
  },
  'home.trainers': {
    kicker: 'Komanda',
    title: 'Mūsų treneriai',
    items: [
      {
        name: 'Tomas Kazlauskas', specialty: 'Gatvės šokiai', experience: '12 m. patirtis', color: '#FFB3C6',
        bio: 'Lietuvos freestyle čempionas. Šokęs su žymiausiais Europos artistais ir vedęs masterclass 12 šalių.',
        image: { src: unsplash('photo-1605450984717-5b2386930f7c'), alt: 'Treneris Tomas Kazlauskas' },
      },
      {
        name: 'Eglė Mockutė', specialty: 'Lady Class', experience: '8 m. patirtis', color: '#FF5C8A',
        bio: 'Heels ir women\'s style specialistė. Choreografė, dirbusi su Lietuvos muzikos žvaigždėmis ir TV projektais.',
        image: { src: unsplash('photo-1586211070543-61ae1ad4a665'), alt: 'Trenerė Eglė Mockutė' },
      },
      {
        name: 'Mantas Rimkus', specialty: 'Breikas', experience: '15 m. patirtis', color: '#00CFFF',
        bio: 'Battle King Vilnius nugalėtojas. Atstovauja Lietuvai tarptautiniuose breakdance čempionatuose Europoje ir JAV.',
        image: { src: unsplash('photo-1504293476958-6d6d0257d014'), alt: 'Treneris Mantas Rimkus' },
      },
      {
        name: 'Karolis Adomaitis', specialty: 'Pop Dance', experience: '10 m. patirtis', color: '#FF3DFF',
        bio: 'Buvęs profesionalus šokėjas iš televizijos. Specializuojasi sceninėje choreografijoje ir konkursų ruošime.',
        image: { src: unsplash('photo-1769535348343-d01ebd9ed8e4'), alt: 'Treneris Karolis Adomaitis' },
      },
    ],
  },
  'home.cta': {
    kicker: 'Pirmoji treniruotė nemokama',
    line1: 'Pradėk šokti',
    line2: 'šiandien',
    button: 'Registruotis dabar →',
  },

  timetable: {
    kicker: 'Kada šokam',
    title: 'Tvarkaraštis',
    validFrom: '2026.09.02',
    season: 'Me Gusta 2026/2027 sezonas',
    note: '* Treniruotės vyksta Me Gusta salėje, Savanorių pr. 271, Kaunas.',
    emptyText: 'Šios salės tvarkaraštis netrukus bus paskelbtas.',
    halls: [],
  },

  registration: {
    kicker: 'Pradėk šokti šiandien',
    intro: '<p>Užpildykite formą, o mes el. paštu atsiųsime visą informaciją apie pirmąją, <strong>nemokamą</strong> šokių pamoką.</p>',
    infoIntro: 'Dažniausiai užduodami klausimai. Neradote atsakymo?',
    styleOptions: [
      'Gatvės šokiai (nuo 4m. iki neribojamo amžiaus)',
      'Pop Dance (nuo 8m. iki 15m.)',
      'Lady Class (nuo 16m.)',
      'Breakdance (nuo 7m.)',
    ],
    // Row-major, so the two columns read like the studio's paper form.
    sourceOptions: ['Iš pažįstamų', 'Renginyje', 'Google', 'Facebook', 'Instagram', 'Tik Tok', 'Kitur'],
    formNote: 'Užsiregistravus, artimiausiu metu el. paštu išsiųsime Jums visą reikalingą informaciją apie pirmąją šokių pamoką.',
    consent: 'Sutinku, kad mano pateikti duomenys būtų naudojami registracijai tvarkyti ir susisiekti dėl treniruočių.',
    freeNote: 'Pirmoji treniruotė nemokama',
    steps: [
      'Užpildote registracijos formą.',
      'El. paštu atsiunčiame visą informaciją apie pirmąją pamoką.',
      'Atvykstate į pirmąją treniruotę, ji nemokama.',
    ],
    hours: [
      { days: 'I–IV', hours: '16:00–20:30' },
      { days: 'V', hours: '16:00–19:00' },
    ],
  },
  'registration.faq': { groups: [] },

  news: {
    kicker: 'Studijos gyvenimas',
    title: 'Naujienos',
    intro: 'Renginiai, konkursai, pasirodymai ir viskas, kas vyksta Me Gustoje.',
    emptyText: 'Naujienų dar nėra. Užsukite netrukus!',
  },

  calendar: {
    kicker: 'Renginiai',
    title: 'Renginių kalendorius',
    intro: 'Studijos renginiai, varžybos ir kiti svarbūs įvykiai — viskas vienoje vietoje. Sekite, kas vyksta, ir neužmirškite užsiregistruoti.',
    emptyUpcoming: 'Artėjančių renginių kol kas nėra. Užsukite netrukus!',
    emptyPast: 'Praėjusių renginių dar nėra.',
  },
}

// --- Timetables -------------------------------------------------------------------------

type Class = ContentMap['home.schedule']['days'][number]['classes'][number]
const MON_WED: Class[] = [
  { time: '17:00', duration: '60 min', style: 'Breikas', age: 'Nuo 7 m.' },
  { time: '17:00', duration: '60 min', style: 'Gatvės šokiai', age: '12–15 m.' },
  { time: '17:30', duration: '60 min', style: 'Gatvės šokiai', age: '4–5 m.' },
  { time: '18:00', duration: '60 min', style: 'Gatvės šokiai', age: '8–11 m.' },
  { time: '18:00', duration: '60 min', style: 'Pop Dance', age: '8–11 m.' },
  { time: '18:30', duration: '60 min', style: 'Gatvės šokiai', age: '6–7 m.' },
]
const TUE_THU: Class[] = [
  { time: '17:00', duration: '60 min', style: 'Pop Dance', age: '12–15 m.' },
  { time: '19:00', duration: '60 min', style: 'Lady Class', age: 'Nuo 16 m.' },
  { time: '19:00', duration: '60 min', style: 'Gatvės šokiai', age: 'Nuo 18 m.' },
]
DEFAULTS['home.schedule'].days = DEFAULTS['home.schedule'].days.map((d, i) => ({ ...d, classes: (i % 2 ? TUE_THU : MON_WED).map(c => ({ ...c })) }))

type Slot = ContentMap['timetable']['halls'][number]['days'][number]['slots'][number]
const addHour = (time: string) => `${String(Number(time.slice(0, 2)) + 1).padStart(2, '0')}${time.slice(2)}`
const free = (start: string, end: string): Slot => ({ status: 'Laisvas laikas', start, end, group: 'Reikalinga rezervacija', trainer: '' })
const slot = (status: Slot['status'], start: string, end: string, group: string, trainer: string): Slot => ({ status, start, end, group, trainer })

DEFAULTS.timetable.halls = [
  {
    // Groups open for sign-up: the home page programme (all 60 min classes).
    label: 'Renkamos grupės',
    days: DEFAULTS['home.schedule'].days.map(d => ({
      day: d.day,
      slots: d.classes.map(c => slot('Renkama grupė', c.time, addHour(c.time), `${c.style} ${c.age}`, '')),
    })),
  },
  {
    label: 'Didžioji salė',
    days: [
      {
        day: 'Pirmadienis',
        slots: [
          free('16:00', '17:00'),
          slot('Renkama grupė', '17:00', '18:00', 'Gatvės šokiai 12–15 m.', 'Rytis Survila'),
          slot('Renkama grupė', '18:00', '19:00', 'Pop Dance 8–11 m.', 'Aušrė Savonytė'),
          slot('Uždara grupė', '19:00', '20:00', 'Pop Stars', 'Aušrė Savonytė'),
        ],
      },
      {
        day: 'Antradienis',
        slots: [
          slot('Uždara grupė', '17:00', '18:00', 'Me Gusta Juniors Team', 'Rytis Survila'),
          slot('Uždara grupė', '18:00', '19:00', 'Me Gusta Children', 'Rytis Survila'),
          slot('Renkama grupė', '19:00', '20:00', 'Lady Class nuo 16 m.', 'Aušrė Savonytė'),
          slot('Uždara grupė', '20:00', '21:00', 'Gatvės šokiai nuo 19 m.', 'Greta Pukenytė'),
        ],
      },
      {
        day: 'Trečiadienis',
        slots: [
          free('16:00', '17:00'),
          slot('Renkama grupė', '17:00', '18:00', 'Gatvės šokiai 12–15 m.', 'Rytis Survila'),
          slot('Renkama grupė', '18:00', '19:00', 'Pop Dance 8–11 m.', 'Aušrė Savonytė'),
          slot('Uždara grupė', '19:00', '20:00', 'Pop Stars', 'Aušrė Savonytė'),
        ],
      },
      {
        day: 'Ketvirtadienis',
        slots: [
          slot('Uždara grupė', '17:00', '18:00', 'Me Gusta Juniors Team', 'Rytis Survila'),
          slot('Uždara grupė', '18:00', '19:00', 'Children 2', 'Rytis Survila'),
          slot('Renkama grupė', '19:00', '20:00', 'Lady Class nuo 16 m.', 'Aušrė Savonytė'),
          slot('Uždara grupė', '20:00', '21:00', 'Gatvės šokiai nuo 19 m.', 'Greta Pukenytė'),
        ],
      },
      {
        day: 'Penktadienis',
        slots: [
          slot('Uždara grupė', '17:00', '18:00', 'Me Gusta Juniors Team', 'Rytis Survila'),
          slot('Uždara grupė', '18:00', '19:00', 'Me Gusta Children', 'Rytis Survila'),
        ],
      },
    ],
  },
  { label: 'LOFT salė', days: [] },
  { label: 'Mažoji salė', days: [] },
]

// --- D.U.K. -------------------------------------------------------------------------------
// Transcribed from the studio's current site. "#kainos" links open the Kainos tab.

const ADMIN = '<a href="mailto:admin@megusta.lt">admin@megusta.lt</a>'
const JOIN = '<p>Studijoje šokėjai laukiami viso sezono metu. Visų pirma, reikia užpildyti <a href="/registracija">registracijos formą</a>. Artimiausiu metu jums atsiųsime elektroninį laišką arba SMS žinutę su pakvietimu į pirmąją jūsų pasirinkto šokio stiliaus pamoką.</p>'
const NVS = '<p>Me Gusta šokių studijoje <strong>netaikomas</strong> NVŠ mokinio krepšelis!</p>'

DEFAULTS['registration.faq'].groups = [
  {
    title: 'Naujiems nariams',
    items: [
      { q: 'Noriu pradėti šokti Me Gustoje. Nuo ko pradėti? Ar galiu prisijungti dabar?', a: JOIN },
      { q: 'Kodėl reikalinga registracija?', a: '<p>Registracija reikalinga, kad galėtume Jus informuoti apie pirmąją šokių pamoką bei sudaryti grupes.</p>' },
      { q: 'Ar reikia registruotis pirmai šokių pamokai?', a: '<p>Taip, reikia. Po registracijos su jumis susisieksime.</p>' },
      { q: 'Ar Me Gustoje pritaikomas NVŠ krepšelis (15 eur)?', a: NVS },
      {
        q: 'Nuo kelių metų galima pradėti šokti? Kokio amžiaus grupės yra Me Gustoje?',
        a: '<p>Kaune priimame šokėjus nuo 4 metų. Studijoje turime šias amžiaus grupes: Vaikučiai 4–7 m., Vaikai 8–11 m., Paaugliai 12–15 m., Jaunimas nuo 16 m., Suaugę 19–99 m. (vyriausias studijos šokėjas jau viršijo 60 m.)</p>',
      },
      {
        q: 'Kokį stilių man pasirinkti, kuris man tinkamiausias?',
        a: '<p>Studijoje mokome: Streetdance (Gatvės šokiai): Hip-Hop, House, Locking, Popping, Breakdance (Breikas), Pop Dance, Lady Class. <a href="/#stiliai">Kaip pasirinkti šokio stilių?</a></p>',
      },
      {
        q: 'Ar studija dirba per moksleivių atostogas? Ar dirba vasarą?',
        a: '<p>Studija dirba visus metus, tiek vasarą, tiek per moksleivių atostogas, tačiau per moksleivių atostogas treniruotės vyksta ne visoms komandoms.</p><p>Nedarbo, šventines dienas galite rasti <strong>kalendoriuje</strong>.</p>',
      },
    ],
  },
  {
    title: 'Šokių pamokos',
    items: [
      {
        q: 'Kokią aprangą dėvėti šokių pamokų metu?',
        a: '<p>Treniruotės metu reikia dėvėti švarią sportinę avalynę, kurią reikės persiauti atėjus į studiją, bei sportinę aprangą, su kuria Jums būtų patogu judėti: sportinis treningas, tamprės, džemperis, marškinėliai.</p><p>Nepamirškite vandens!</p>',
      },
      { q: 'Kiek laiko užtrunka šokių pamoka?', a: '<p>Šokių pamokos trunka po 60 min.</p><p>Vaikams iki 7 m. pamokos trukmė gali būti mažesnė.</p>' },
      {
        q: 'Ar galiu lankyti du šokių stilius?',
        a: '<p>Taip! Me Gustoje galite lankyti net kelis stilius. Šokant kelis stilius reikalingas papildomas PRO nario abonementas. <a href="#kainos">Kainos</a></p>',
      },
      {
        q: 'Kas bus mano treneris/ė?',
        a: '<p>Savo būsimą trenerį galite pamatyti ant tvarkaraščio laiko lentelės, kuri skirta jūsų šokio grupei. <a href="/tvarkarastis">Tvarkaraštis</a>. Taip pat, apie trenerius galite sužinoti puslapyje <a href="/#treneriai">mokytojai</a>.</p>',
      },
    ],
  },
  {
    title: 'Narystė ir apmokėjimas',
    items: [
      { q: 'Kaip pradėti Me Gusta narystę?', a: JOIN },
      {
        q: 'Kaip nutraukti Me Gusta narystę?',
        a: `<p>Norint nutraukti narystę reikia apie tai <strong>pranešti administracijai el. paštu</strong> ${ADMIN}, atiduoti savo nario kortelę studijos administratorei bei pranešti asmeniškai savo šokių mokytojui.</p>`,
      },
      { q: 'Ar Me Gustoje pritaikomas NVŠ krepšelis (15 eur)?', a: NVS },
      { q: 'Kiek kainuoja šokti Me Gustoje?', a: '<p>Šokių pamokų <a href="#kainos">kainos</a>.</p>' },
      { q: 'Kokia apmokėjimo tvarka Me Gustoje už šokių pamokas?', a: '<p>Už šokių pamokas yra mokama už einamąjį mėnesį. Nario mokestis mokamas mėnesio pradžioje.</p>' },
      { q: 'Ką daryti, jei susirgau?', a: `<p>Apie ligą <strong>privaloma informuoti administratorę el. paštu</strong> ${ADMIN} iš karto, kai tik liga pasireiškia.</p>` },
      { q: 'Ką daryti, jei išvykstu atostogų?', a: `<p>Ketinant praleisti daugiau nei savaitę atostogaujant, reikia <strong>pranešti apie išvykimą studijos administratorei</strong> el. paštu ${ADMIN}.</p>` },
    ],
  },
  {
    title: 'Varžybos ir konkursinės šokėjų komandos',
    items: [
      {
        q: 'Ar Me Gustoje vykdomos šokėjų atrankos?',
        a: '<p>Studijoje atrankų nevykdome ir labai laukiame visų šokėjų savo aikštelėje!</p><p>Dėl patekimo į konkursines komandas šokėjų peržiūros vyksta visų treniruočių metu, o ne per tam tikrą pasirodymą.</p>',
      },
      {
        q: 'Ar dalyvaujate konkursuose, pasirodymuose?',
        a: '<p>Me Gustos šokėjai dalyvauja įvairiuose pasirodymuose, konkursuose, čempionatuose Lietuvoje ir už jos ribų. Pažengę šokėjai šokių varžybose dalyvauja dažniau.</p>',
      },
    ],
  },
  {
    title: 'Kita',
    items: [
      {
        q: 'Kaip rasti Me Gustą socialiniuose tinkluose?',
        a: '<p>Me Gusta šokių studijos paskyras galite rasti <strong>YouTube</strong>, <strong>Facebook</strong>, <strong>Instagram</strong> ir <strong>TikTok</strong> socialinių tinklų platformose. Sekite mus!</p>',
      },
    ],
  },
]
