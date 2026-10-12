import type React from 'react'

// D.U.K. content for the "Informacija" tab, transcribed from the studio's current site.
// Links point to pages that exist here; "kalendoriuje" stays plain until a calendar page exists.

const ADMIN_EMAIL = 'admin@megusta.lt'

function L({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} className="faq-link">{children}</a>
}

const B = ({ children }: { children: React.ReactNode }) => <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{children}</strong>

const Admin = () => <L href={`mailto:${ADMIN_EMAIL}`}>{ADMIN_EMAIL}</L>

const JOIN = (
  <p>
    Studijoje šokėjai laukiami viso sezono metu. Visų pirma, reikia užpildyti <L href="#registracija">registracijos formą</L>.
    Artimiausiu metu jums atsiųsime elektroninį laišką arba SMS žinutę su pakvietimu į pirmąją jūsų pasirinkto šokio stiliaus pamoką.
  </p>
)

const NVS = <p>Me Gusta šokių studijoje <B>netaikomas</B> NVŠ mokinio krepšelis!</p>

export type FaqGroup = { title: string; items: { q: string; a: React.ReactNode }[] }

export const FAQ: FaqGroup[] = [
  {
    title: 'Naujiems nariams',
    items: [
      { q: 'Noriu pradėti šokti Me Gustoje. Nuo ko pradėti? Ar galiu prisijungti dabar?', a: JOIN },
      { q: 'Kodėl reikalinga registracija?', a: <p>Registracija reikalinga, kad galėtume Jus informuoti apie pirmąją šokių pamoką bei sudaryti grupes.</p> },
      { q: 'Ar reikia registruotis pirmai šokių pamokai?', a: <p>Taip, reikia. Po registracijos su jumis susisieksime.</p> },
      { q: 'Ar Me Gustoje pritaikomas NVŠ krepšelis (15 eur)?', a: NVS },
      {
        q: 'Nuo kelių metų galima pradėti šokti? Kokio amžiaus grupės yra Me Gustoje?',
        a: (
          <p>
            Kaune priimame šokėjus nuo 4 metų. Studijoje turime šias amžiaus grupes: Vaikučiai 4–7 m., Vaikai 8–11 m.,
            Paaugliai 12–15 m., Jaunimas nuo 16 m., Suaugę 19–99 m. (vyriausias studijos šokėjas jau viršijo 60 m.)
          </p>
        ),
      },
      {
        q: 'Kokį stilių man pasirinkti, kuris man tinkamiausias?',
        a: (
          <p>
            Studijoje mokome: Streetdance (Gatvės šokiai): Hip-Hop, House, Locking, Popping, Breakdance (Breikas), Pop Dance, Lady Class.{' '}
            <L href="#stiliai">Kaip pasirinkti šokio stilių?</L>
          </p>
        ),
      },
      {
        q: 'Ar studija dirba per moksleivių atostogas? Ar dirba vasarą?',
        a: (
          <>
            <p>Studija dirba visus metus, tiek vasarą, tiek per moksleivių atostogas, tačiau per moksleivių atostogas treniruotės vyksta ne visoms komandoms.</p>
            <p>Nedarbo, šventines dienas galite rasti <B>kalendoriuje</B>.</p>
          </>
        ),
      },
    ],
  },
  {
    title: 'Šokių pamokos',
    items: [
      {
        q: 'Kokią aprangą dėvėti šokių pamokų metu?',
        a: (
          <>
            <p>
              Treniruotės metu reikia dėvėti švarią sportinę avalynę, kurią reikės persiauti atėjus į studiją, bei sportinę aprangą,
              su kuria Jums būtų patogu judėti: sportinis treningas, tamprės, džemperis, marškinėliai.
            </p>
            <p>Nepamirškite vandens!</p>
          </>
        ),
      },
      {
        q: 'Kiek laiko užtrunka šokių pamoka?',
        a: (
          <>
            <p>Šokių pamokos trunka po 60 min.</p>
            <p>Vaikams iki 7 m. pamokos trukmė gali būti mažesnė.</p>
          </>
        ),
      },
      {
        q: 'Ar galiu lankyti du šokių stilius?',
        a: (
          <p>
            Taip! Me Gustoje galite lankyti net kelis stilius. Šokant kelis stilius reikalingas papildomas PRO nario abonementas.{' '}
            <L href="#registracija-kainos">Kainos</L>
          </p>
        ),
      },
      {
        q: 'Kas bus mano treneris/ė?',
        a: (
          <p>
            Savo būsimą trenerį galite pamatyti ant tvarkaraščio laiko lentelės, kuri skirta jūsų šokio grupei.{' '}
            <L href="#tvarkarastis">Tvarkaraštis</L>. Taip pat, apie trenerius galite sužinoti puslapyje <L href="#treneriai">mokytojai</L>.
          </p>
        ),
      },
    ],
  },
  {
    title: 'Narystė ir apmokėjimas',
    items: [
      { q: 'Kaip pradėti Me Gusta narystę?', a: JOIN },
      {
        q: 'Kaip nutraukti Me Gusta narystę?',
        a: (
          <p>
            Norint nutraukti narystę reikia apie tai <B>pranešti administracijai el. paštu</B> <Admin />, atiduoti savo nario kortelę
            studijos administratorei bei pranešti asmeniškai savo šokių mokytojui.
          </p>
        ),
      },
      { q: 'Ar Me Gustoje pritaikomas NVŠ krepšelis (15 eur)?', a: NVS },
      { q: 'Kiek kainuoja šokti Me Gustoje?', a: <p>Šokių pamokų <L href="#registracija-kainos">kainos</L>.</p> },
      { q: 'Kokia apmokėjimo tvarka Me Gustoje už šokių pamokas?', a: <p>Už šokių pamokas yra mokama už einamąjį mėnesį. Nario mokestis mokamas mėnesio pradžioje.</p> },
      { q: 'Ką daryti, jei susirgau?', a: <p>Apie ligą <B>privaloma informuoti administratorę el. paštu</B> <Admin /> iš karto, kai tik liga pasireiškia.</p> },
      { q: 'Ką daryti, jei išvykstu atostogų?', a: <p>Ketinant praleisti daugiau nei savaitę atostogaujant, reikia <B>pranešti apie išvykimą studijos administratorei</B> el. paštu <Admin />.</p> },
    ],
  },
  {
    title: 'Varžybos ir konkursinės šokėjų komandos',
    items: [
      {
        q: 'Ar Me Gustoje vykdomos šokėjų atrankos?',
        a: (
          <>
            <p>Studijoje atrankų nevykdome ir labai laukiame visų šokėjų savo aikštelėje!</p>
            <p>Dėl patekimo į konkursines komandas šokėjų peržiūros vyksta visų treniruočių metu, o ne per tam tikrą pasirodymą.</p>
          </>
        ),
      },
      {
        q: 'Ar dalyvaujate konkursuose, pasirodymuose?',
        a: <p>Me Gustos šokėjai dalyvauja įvairiuose pasirodymuose, konkursuose, čempionatuose Lietuvoje ir už jos ribų. Pažengę šokėjai šokių varžybose dalyvauja dažniau.</p>,
      },
    ],
  },
  {
    title: 'Kita',
    items: [
      {
        q: 'Kaip rasti Me Gustą socialiniuose tinkluose?',
        a: (
          <p>
            Me Gusta šokių studijos paskyras galite rasti <B>YouTube</B>, <B>Facebook</B>, <B>Instagram</B> ir <B>TikTok</B> socialinių tinklų platformose. Sekite mus!
          </p>
        ),
      },
    ],
  },
]
