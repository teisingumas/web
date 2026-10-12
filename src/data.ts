// Studio content shared by the home page and the registration page.
import styleGatves from './assets/styles/gatves.webp'
import stylePop from './assets/styles/pop.webp'
import styleLady from './assets/styles/lady.webp'
import styleBreikas from './assets/styles/breikas.webp'

export const DANCE_STYLES = [
  {
    id: 'gatves',
    name: 'Gatvės šokiai',
    tagline: 'Born in the streets, perfected on stage',
    description:
      'Autentiški gatvės šokiai — nuo popping ir locking iki krump ir freestyle. Ugdome individualų stilių ir išraišką kiekviename judėjime. Treniruotės vyksta dinamiškoje aplinkoje, kurioje kiekvienas randa savo balsą.',
    image: styleGatves,
    color: '#FFB3C6',
    levels: ['4–6 m.', '7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
  {
    id: 'pop',
    name: 'Pop Dance',
    tagline: 'Energy meets precision',
    description:
      'Komerciniai ir sceniniai šokiai — ryškūs, dinamiški, su chartiška energija. Tobulai tinka scenai, muzikos vaizdo klipams ir konkursams. Šie šokiai jungia stilių ir techniką į vieną sprogstantį mišinį.',
    image: stylePop,
    color: '#FFB3C6',
    levels: ['7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
  {
    id: 'lady',
    name: 'Lady Class',
    tagline: 'Power. Grace. Confidence.',
    description:
      'Moteriška plastika, heels šokiai ir sexy style. Atskleidžiame vidinę stiprybę ir išreiškiame ją per judėjimą. Lady Class — tai ne tik šokiai, tai savęs atradimas ir pasitikėjimo savimi ugdymas.',
    image: styleLady,
    color: '#FFB3C6',
    levels: ['12–15 m.', 'Nuo 16 m.', '4–99 m.'],
  },
  {
    id: 'breikas',
    name: 'Breikas',
    tagline: 'Defy gravity. Define limits.',
    description:
      'Breakdance — nuo toprocko ir footwork iki freezes ir power moves. Kietumas, disciplina ir neįtikėtinas kūno valdymas. Mūsų treneriai — tarptautiniai čempionai, pasiruošę perduoti visas paslaptis.',
    image: styleBreikas,
    color: '#FFB3C6',
    levels: ['7–11 m.', '12–15 m.', 'Nuo 16 m.'],
  },
]

// Weekly timetable: Mon & Wed share one programme, Tue & Thu the other.
export const SCHEDULE_DAYS = [
  {
    day: 'Pirmad.',
    full: 'Pirmadienis',
    classes: [
      { time: '17:00', duration: '60 min', style: 'Breikas', age: 'Nuo 7 m.', color: '#FFB3C6' },
      { time: '17:00', duration: '60 min', style: 'Gatvės šokiai', age: '12–15 m.', color: '#FFB3C6' },
      { time: '17:30', duration: '60 min', style: 'Gatvės šokiai', age: '4–5 m.', color: '#FFB3C6' },
      { time: '18:00', duration: '60 min', style: 'Gatvės šokiai', age: '8–11 m.', color: '#FFB3C6' },
      { time: '18:00', duration: '60 min', style: 'Pop Dance', age: '8–11 m.', color: '#FFB3C6' },
      { time: '18:30', duration: '60 min', style: 'Gatvės šokiai', age: '6–7 m.', color: '#FFB3C6' },
    ],
  },
  {
    day: 'Antrad.',
    full: 'Antradienis',
    classes: [
      { time: '17:00', duration: '60 min', style: 'Pop Dance', age: '12–15 m.', color: '#FFB3C6' },
      { time: '19:00', duration: '60 min', style: 'Lady Class', age: 'Nuo 16 m.', color: '#FFB3C6' },
      { time: '19:00', duration: '60 min', style: 'Gatvės šokiai', age: 'Nuo 18 m.', color: '#FFB3C6' },
    ],
  },
  {
    day: 'Trečiad.',
    full: 'Trečiadienis',
    classes: [
      { time: '17:00', duration: '60 min', style: 'Breikas', age: 'Nuo 7 m.', color: '#FFB3C6' },
      { time: '17:00', duration: '60 min', style: 'Gatvės šokiai', age: '12–15 m.', color: '#FFB3C6' },
      { time: '17:30', duration: '60 min', style: 'Gatvės šokiai', age: '4–5 m.', color: '#FFB3C6' },
      { time: '18:00', duration: '60 min', style: 'Gatvės šokiai', age: '8–11 m.', color: '#FFB3C6' },
      { time: '18:00', duration: '60 min', style: 'Pop Dance', age: '8–11 m.', color: '#FFB3C6' },
      { time: '18:30', duration: '60 min', style: 'Gatvės šokiai', age: '6–7 m.', color: '#FFB3C6' },
    ],
  },
  {
    day: 'Ketvirt.',
    full: 'Ketvirtadienis',
    classes: [
      { time: '17:00', duration: '60 min', style: 'Pop Dance', age: '12–15 m.', color: '#FFB3C6' },
      { time: '19:00', duration: '60 min', style: 'Lady Class', age: 'Nuo 16 m.', color: '#FFB3C6' },
      { time: '19:00', duration: '60 min', style: 'Gatvės šokiai', age: 'Nuo 18 m.', color: '#FFB3C6' },
    ],
  },
]

export const PLANS = [
  {
    name: 'Standart',
    price: '55',
    desc: '1 šokių stilius',
    features: ['1 šokių stilius', '8 šokių pamokos per mėnesį', 'Studijos renginiai', 'Konkursai, čempionatai', 'Galimybė papildomai treniruotis'],
    highlight: false,
    cta: 'Rinktis Standart',
  },
  {
    name: 'Intensive',
    price: '70',
    desc: '2 šokių stiliai',
    features: ['2 šokių stiliai', '16 šokių pamokų per mėnesį', 'Studijos renginiai', 'Konkursai, čempionatai', 'Galimybė papildomai treniruotis'],
    highlight: true,
    cta: 'Rinktis Intensive',
  },
]

export const CONTACT = {
  email: 'labas@megusta.lt',
  phone: '+370 606 44888',
  phoneHref: 'tel:+37060644888',
}

