# Overtime Reporter - Project Context

This project is a hybrid **Rust (WebAssembly)** and **React (Vite/TypeScript)** application designed for tracking overtime hours, calculating compensation, and generating reports in CSV and PDF formats.

## Project Structure

- **`wasm-crate/`**: The core logic written in Rust.
  - `src/lib.rs`: Contains the `AppState` and `OvertimeEntry` logic, including shift splitting ("Smart Mode"), compensation calculations, and CSV generation.
  - `Cargo.toml`: Rust dependencies (`wasm-bindgen`, `serde`, `chrono`, `serde-wasm-bindgen`).
- **`www/`**: The frontend React application.
  - `src/App.tsx`: Main UI and state management. Integrates with the WASM module.
  - `src/typst-pdf.ts` & `src/report.typ`: PDF generation logic using the Typst compiler.
  - `src/pkg/`: Destination for compiled WASM files (`wasm_crate.js`, `wasm_crate_bg.wasm`).
- **`data/`**: Static data files.
  - `sweden_public_holidays_2026_2040.csv`: Raw holiday data.
  - `skogstorp_pay_rates.csv`: Pay rate configuration.

## Key Logic & Conventions

### Overtime Categories
- **Normal**: Weekdays, 06:00 - 17:00.
- **Evening**: Weekdays, 17:00 - 21:00.
- **Night**: Weekdays, 21:00 - 06:00.
- **Weekend**: Saturday and Sunday (full 24h).
- **Public Holiday**: Specified dates (full 24h).

### Compensation Calculation
- **Simple Overtime** (Normal, Evening): `Monthly Salary / 94`
- **Qualified Overtime** (Night, Weekend, Public Holiday): `Monthly Salary / 72`
- **Vacation Pay**: An additional 12% is added to the total gross amount.
- *Note*: Monthly salary is inferred as `2 * periodCompensation` (where `periodCompensation` defaults to 12,899 SEK).

### Data Persistence
- Entries are saved to `localStorage` under the key `overtime_entries`.

## Building and Running

### Rust (WASM)
1. Navigate to `wasm-crate/`.
2. Build the module: `wasm-pack build --target web`.
3. Copy generated files from `wasm-crate/pkg/` to `www/src/pkg/`.

### Frontend
1. Navigate to `www/`.
2. Install dependencies: `npm install --legacy-peer-deps`.
3. Start dev server: `npm run dev`.
4. Build for production: `npm run build`.

## Development Guidelines

- **Surgical Updates**: When modifying Rust logic, always rebuild the WASM module and update the files in `www/src/pkg/`.
- **Translations**: The UI supports Swedish (`sv`) and English (`en`). Add new strings to the `translations` object in `App.tsx`.
- **Typst**: PDF templates are defined in `report.typ`. Use `typst-pdf.ts` to bridge React state to the Typst compiler.
- **Icons**: Use `lucide-react` for icons.
