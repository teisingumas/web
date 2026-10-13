import type { ComponentProps } from 'react'
import type { ClerkProvider } from '@clerk/react'

// Clerk's sign-in box in the site's colours, with Lithuanian texts (Clerk ships no Lithuanian).

type ProviderProps = ComponentProps<typeof ClerkProvider>

export const clerkAppearance: ProviderProps['appearance'] = {
  variables: {
    colorPrimary: '#FFB3C6',
    colorPrimaryForeground: '#080808',
    colorBackground: '#111111',
    colorForeground: '#f0f0f0',
    colorMutedForeground: '#a8a8a8',
    colorNeutral: '#f0f0f0',
    colorInput: '#0d0d0d',
    colorInputForeground: '#f0f0f0',
    colorBorder: '#2a2a2a',
    colorDanger: '#ff8a8a',
    colorRing: '#FFB3C6',
    borderRadius: '0px',
    fontFamily: "'Outfit', sans-serif",
  },
  elements: {
    // sign-ups are closed: hide "Neturite paskyros?"
    footerAction: { display: 'none' },
    card: { boxShadow: 'none', border: '1px solid #222222' },
    cardBox: { boxShadow: 'none', width: '100%' },
    rootBox: { width: '100%' },
    headerTitle: { fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 900, textTransform: 'uppercase', fontSize: '28px', letterSpacing: '0.5px' },
    formButtonPrimary: { textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 800, fontSize: '13px', padding: '12px' },
  },
}

export const clerkLocalization: ProviderProps['localization'] = {
  locale: 'lt-LT',
  backButton: 'Atgal',
  dividerText: 'arba',
  formButtonPrimary: 'Tęsti',
  formButtonPrimary__verify: 'Patvirtinti',
  formFieldLabel__emailAddress: 'El. paštas',
  formFieldLabel__emailAddress_username: 'El. paštas',
  formFieldLabel__password: 'Slaptažodis',
  formFieldLabel__newPassword: 'Naujas slaptažodis',
  formFieldLabel__confirmPassword: 'Pakartokite slaptažodį',
  formFieldLabel__signOutOfOtherSessions: 'Atsijungti visuose kituose įrenginiuose',
  formFieldInputPlaceholder__emailAddress: 'Įrašykite el. paštą',
  formFieldInputPlaceholder__emailAddress_username: 'Įrašykite el. paštą',
  formFieldInputPlaceholder__password: 'Įrašykite slaptažodį',
  formFieldAction__forgotPassword: 'Pamiršote slaptažodį?',
  formFieldAction__showPassword: 'Rodyti slaptažodį',
  formFieldAction__hidePassword: 'Slėpti slaptažodį',
  formFieldError__notMatchingPasswords: 'Slaptažodžiai nesutampa.',
  formFieldError__matchingPasswords: 'Slaptažodžiai sutampa.',
  formFieldHintText__optional: 'Nebūtina',
  footerActionLink__useAnotherMethod: 'Naudoti kitą būdą',
  footerPageLink__help: 'Pagalba',
  footerPageLink__privacy: 'Privatumas',
  footerPageLink__terms: 'Sąlygos',
  signIn: {
    start: {
      title: 'Turinio valdymas',
      titleCombined: 'Turinio valdymas',
      subtitle: 'Prisijunkite, kad galėtumėte keisti svetainės turinį',
      subtitleCombined: 'Prisijunkite, kad galėtumėte keisti svetainės turinį',
      actionText: '',
      actionLink: '',
    },
    password: {
      title: 'Įrašykite slaptažodį',
      subtitle: 'Slaptažodis, susietas su jūsų paskyra',
      actionLink: 'Naudoti kitą būdą',
    },
    emailCode: {
      title: 'Patikrinkite el. paštą',
      subtitle: 'Įrašykite kodą, kurį atsiuntėme',
      formTitle: 'Patvirtinimo kodas',
      resendButton: 'Negavote kodo? Siųsti dar kartą',
    },
    emailCodeMfa: {
      title: 'Patikrinkite el. paštą',
      subtitle: 'Įrašykite kodą, kurį atsiuntėme',
      formTitle: 'Patvirtinimo kodas',
      resendButton: 'Negavote kodo? Siųsti dar kartą',
    },
    newDeviceVerificationNotice: 'Jungiatės iš naujo įrenginio, todėl el. paštu atsiuntėme patvirtinimo kodą.',
    forgotPassword: {
      title: 'Slaptažodžio keitimas',
      subtitle: 'kad pakeistumėte slaptažodį',
      subtitle_email: 'Įrašykite kodą, kurį atsiuntėme el. paštu',
      formTitle: 'Slaptažodžio keitimo kodas',
      resendButton: 'Negavote kodo? Siųsti dar kartą',
    },
    forgotPasswordAlternativeMethods: {
      title: 'Pamiršote slaptažodį?',
      label__alternativeMethods: 'Arba prisijunkite kitu būdu',
      blockButton__resetPassword: 'Pakeisti slaptažodį',
    },
    resetPassword: {
      title: 'Naujas slaptažodis',
      formButtonPrimary: 'Pakeisti slaptažodį',
      successMessage: 'Slaptažodis pakeistas. Jungiamasi…',
      requiredMessage: 'Saugumo sumetimais reikia pakeisti slaptažodį.',
    },
    alternativeMethods: {
      title: 'Kitas būdas',
      subtitle: 'Kyla sunkumų? Prisijunkite vienu iš šių būdų.',
      actionLink: 'Pagalba',
      actionText: 'Nė vienas netinka?',
      blockButton__emailCode: 'Atsiųsti kodą į {{identifier}}',
      blockButton__password: 'Prisijungti su slaptažodžiu',
      getHelp: {
        title: 'Pagalba',
        content: 'Jei nepavyksta prisijungti, parašykite svetainės kūrėjui.',
        blockButton__emailSupport: 'Rašyti el. paštu',
      },
    },
    noAvailableMethods: {
      title: 'Nepavyko prisijungti',
      subtitle: 'Įvyko klaida',
      message: 'Šiai paskyrai nėra galimo prisijungimo būdo.',
    },
  },
  unstable__errors: {
    form_password_incorrect: 'Neteisingas slaptažodis. Bandykite dar kartą.',
    form_identifier_not_found: 'Paskyra su šiuo el. paštu nerasta.',
    form_param_format_invalid__email_address: 'Įrašykite teisingą el. pašto adresą.',
    form_code_incorrect: 'Neteisingas kodas.',
    not_allowed_access: 'Šiam el. paštui prisijungti neleidžiama.',
    too_many_requests: 'Per daug bandymų. Palaukite kelias minutes.',
    form_password_pwned: 'Šis slaptažodis rastas nutekėjusių slaptažodžių sąrašuose. Pasirinkite kitą.',
    form_password_length_too_short: 'Slaptažodis per trumpas (bent 8 ženklai).',
  },
} as ProviderProps['localization']
