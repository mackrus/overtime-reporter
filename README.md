# Övertid (Overtime Tracker)

Ett professionellt verktyg för att beräkna och rapportera övertid enligt SKR:s regler. Systemet är byggt som en modern webbapplikation som körs helt lokalt i din webbläsare med hjälp av Rust (WebAssembly) och Typst.

## Funktioner
- **Smart läge**: Ange start- och sluttid, appen delar automatiskt upp skiftet i Normal, Kväll och Natt samt detekterar helger och röda dagar.
- **Manuellt läge**: Full kontroll för att lägga till poster manuellt vid behov.
- **Automatisk detektering av helgdagar**: Innehåller svenska helgdagar 2026–2040.
- **Ekonomisk kalkyl**: Beräknar uppskattad ersättning baserat på din periodersättning (Vardagsövertid /94, Kvalificerad övertid /72).
- **Professionella exporter**:
  - **PDF**: Typsatt med Typst för ett officiellt utseende (likt ett formellt kvitto/faktura).
  - **CSV**: För enkel import i Excel eller lönesystem.
- **E-postintegration**: Förbereder ett mejl till löneadministratör med ett klick.

## Teknisk arkitektur
- **Backend**: Rust (WASM) för beräkningslogik och skiftuppdelning.
- **Frontend**: React + Vite + TypeScript.
- **Typsättning**: Typst (WASM) för högkvalitativ PDF-generering.
- **Säkerhet**: Ingen data sparas i molnet. Allt körs lokalt och sparas endast i din webbläsares `localStorage`.

## Lokal utveckling

### 1. Bygg Rust-modulen
Du behöver ha `wasm-pack` installerat.
```bash
cd wasm-crate
wasm-pack build --target web
cd ..
# Synka binärer till frontend
cp wasm-crate/pkg/*.js www/src/pkg/
cp wasm-crate/pkg/*.wasm www/src/pkg/
cp wasm-crate/pkg/*.d.ts www/src/pkg/
```

### 2. Starta webbappen
```bash
cd www
npm install
npm run dev
```

## Driftsättning
Projektet är konfigurerat för automatisk driftsättning till **GitHub Pages** via GitHub Actions. Varje push till `main`-branchen triggar en ny byggprocess och publicering.
