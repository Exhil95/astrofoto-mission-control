# User Guide

## Ekran Startowy

Pierwszy ekran jest bramka operatora. Pozwala:

- wejsc do aplikacji w trybie demo bez konfiguracji konta,
- zalogowac sie przez backendowa sesje bearer,
- zalozyc podstawowe konto operatora,
- szybko zobaczyc, ze aplikacja obejmuje Tonight Board, FOV Console, Capture Runbook, Multi-session Planner i FITS Review.

Sesja startowa jest zapisywana w `localStorage` pod kluczem `astrofoto-auth-session`. Login i rejestracja uzywaja backendu, a tryb demo zostaje lokalnym fallbackiem, gdy API jest offline.

Ten dokument opisuje aplikację z perspektywy osoby planującej i prowadzącej sesję astrofoto.

## Główna Nawigacja

Aplikacja ma pięć trybów pracy:

- Planner: wybór obiektu, sprzętu, pogody i pola widzenia.
- Sesja: timeline nocy oraz aktualne warunki.
- Obróbka: plan kalibracji i stackowania dla wybranego targetu.
- Klatki: skan FITS i import zarejestrowanej sesji.
- Multi: plan wielu nocy i eksport kalendarza.

Przełącznik języka w prawym górnym rogu obsługuje EN, PL, DE, IT i ES. Wybór języka jest zapisywany w `localStorage`.

## Planner

Planner jest głównym ekranem decyzyjnym.

### Katalog Targetów

Lewy panel pozwala filtrować obiekty po:

- nazwie, katalogu, konstelacji i typie,
- typie obiektu,
- sezonie,
- dopasowaniu do FOV.

Każdy wiersz pokazuje miniaturę, jasność i etykietę FOV:

- Mały: obiekt zajmuje niewielką część kadru.
- Mieści się: obiekt dobrze mieści się w polu widzenia.
- Ciasno: trzeba sprawdzić rotację i margines.
- Mozaika: obiekt jest większy niż pojedynczy kadr.

### Profile Sprzętu

Profil sprzętu obejmuje miejscówkę, Bortle, teleskop, reduktor, kamerę, sensor, filtry, guiding, focuser i montaż.

Typowy workflow:

1. Wybierz profil z listy.
2. Dostosuj FOV w panelu Optyka, jeśli trzeba.
3. Zapisz obecny zestaw jako profil.
4. Edytuj albo duplikuj profil przy kolejnych setupach.

### Mapa Nieba

Centralna scena pokazuje:

- wybrany obiekt w realistycznej skali,
- ramkę FOV dla aktualnego setupu,
- karuzelę innych obiektów wokół FOV,
- informację o marginesie, rotacji lub mozaice.

Tryby sceny:

- Fokus: tylko aktualny obiekt.
- Dziś: aktualny obiekt plus obiekty z Tonight Board.
- Show: rotująca karuzela filtrowanych targetów.
- Filtr: większy widok katalogu po filtrach.

Autoobrót można włączyć lub wyłączyć przyciskiem `Auto`.

### Optyka

Panel Optyka liczy:

- efektywną ogniskową,
- FOV poziome i pionowe,
- skalę obrazu w arcsec/px,
- diagonalne pole widzenia.

Można wybrać popularny sensor albo wpisać własny rozmiar matrycy i piksel.

## Sesja

Tryb Sesja pokazuje plan nocy dla wybranego targetu:

- start i koniec okna,
- rodzaj nocy, w tym białe noce,
- minutę zmierzchu cywilnego, nautycznego i astronomicznego,
- Księżyc,
- pogodę,
- rekomendowany tryb fotografowania,
- krzywą wysokości targetu.

Pogoda jest cacheowana. Można ustawić odświeżanie co 15, 30 albo 60 minut i wymusić ręczne odświeżenie.

## Capture Plan

Capture Plan generuje runbook sesji:

- tryb obrazowania,
- filtry,
- czasy ekspozycji,
- liczba klatek,
- integracja,
- dithering,
- autofocus,
- meridian flip,
- kalibracja,
- checklistę.

Plan można skopiować albo pobrać jako Markdown. Eksport używa aktualnego języka aplikacji.

## Processing Planner

Processing Planner podpowiada:

- strategię stackowania,
- dopasowanie klatek kalibracyjnych,
- drizzle/binning,
- normalizację,
- ryzyko gradientu,
- noise reduction,
- color strategy,
- rejection.

To jest plan startowy. Decyzje końcowe nadal należy potwierdzić w PixInsight, Siril albo innym narzędziu.

## FITS Ingest

Tryb Klatki skanuje folder FITS zamontowany w homelabie.

Obsługiwane rozszerzenia:

- `.fit`
- `.fits`
- `.fts`

Skan zwraca:

- frame type,
- filtr,
- ekspozycję,
- gain i offset,
- temperaturę sensora,
- object name,
- DATE-OBS,
- kamerę,
- rozmiar klatki,
- FWHM,
- eccentricity,
- star count,
- quality score,
- ostrzeżenia.

Klatki z niskim score albo flagami jakości trafiają do review.

### Import Do Archiwum

Po skanie można utworzyć wpis archiwum jako zarejestrowaną sesję. Aplikacja próbuje dopasować target po `OBJECT` z FITS albo po nazwie folderu.

### Processing Handoff

Eksport handoff generuje Markdown dla obróbki:

- accepted light manifest,
- review light manifest,
- grupy po filtrze i ekspozycji,
- checklistę PixInsight WBPP,
- outline dla Siril,
- klatki kalibracyjne z bieżącego skanu,
- dopasowania z biblioteki kalibracji.

## Calibration Library

Biblioteka kalibracji skanuje darki, flaty, biasy i dark flaty, a potem ocenia dopasowanie do aktualnego planu.

Kryteria dopasowania:

- frame type,
- filtr,
- ekspozycja,
- temperatura,
- binning,
- kamera,
- liczba klatek.

Statusy:

- match: bardzo dobre dopasowanie,
- usable: używalne,
- review: wymaga ręcznego sprawdzenia.

## Multi-session Planner

Multi planuje kilka nocy do przodu. Bierze pod uwagę:

- prognozę,
- Księżyc,
- białe noce,
- wysokość targetu,
- FOV,
- wybrane targety.

Można zapisać wybraną noc do Session Archive albo pobrać `.ics` z najlepszymi oknami.

## Session Archive

Archiwum przechowuje:

- target,
- datę,
- status,
- profil sprzętu,
- miejscówkę,
- FOV,
- tryb obrazowania,
- filtry,
- integrację,
- pogodę,
- Księżyc,
- notatki,
- Markdown capture planu.

Statusy wpisów:

- planned,
- captured,
- processed,
- skipped.

## Dane I Prywatność

Domyślnie aplikacja działa lokalnie. FITS library jest montowana read-only, więc aplikacja nie modyfikuje surowych klatek. Profile i archiwum są zapisywane w SQLite w wolumenie `astrofoto-data`.
