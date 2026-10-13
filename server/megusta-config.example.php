<?php
// Me Gusta turinio valdymo nustatymai.
//
// 1. Nukopijuokite šį failą į aplanką VIENU LYGIU AUKŠČIAU nei public_html, pvz.
//    domains/testas.vedejasedvardas.lt/megusta-config.php   (ne į public_html!)
// 2. Įrašykite savo reikšmes vietoje pavyzdinių.
// Šis failas nėra git'e ir niekada nepateks į viešą svetainę.

return [
    // hPanel → Duomenų bazės → MySQL duomenų bazės. Pavadinimai turi priešdėlį, pvz. u123456789_megusta.
    'db' => [
        'host' => 'localhost',
        'name' => 'u123456789_megusta',
        'user' => 'u123456789_megusta',
        'pass' => 'ČIA_DUOMENŲ_BAZĖS_SLAPTAŽODIS',
    ],

    // Clerk → Configure → API keys → Publishable key (prasideda pk_test_ arba pk_live_).
    'clerk_publishable_key' => 'pk_test_ČIA_JŪSŲ_RAKTAS',

    // Kliento Clerk vartotojo ID (Clerk → Users → spauskite vartotoją → User ID, prasideda user_).
    // Jei dar nežinote: prisijunkite /adminas ir puslapis parodys jūsų ID.
    'admin_user_ids' => [
        'user_ČIA_KLIENTO_ID',
    ],

    // Nebūtina: svetainės adresas be „/“ gale. Jei nenurodyta, imamas iš užklausos.
    // 'site_url' => 'https://testas.vedejasedvardas.lt',
];
