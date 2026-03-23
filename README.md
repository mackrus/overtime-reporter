# Overtime Reporter

**Live Website:** [https://mackrus.github.io/overtime-reporter/](https://mackrus.github.io/overtime-reporter/)

A simple tool to report overtime categories (Weekend, Public Holiday, etc.) with CSV and PDF export.
Built with **Rust (WASM)** for core logic and **React (Vite/TypeScript)** for the UI.

## Features
- Multiple overtime entries in one session.
- Automatic CSV export for supervisors.
- Professional PDF export for employees.
- Data persistence using browser `localStorage`.
- Deployment to GitHub Pages via GitHub Actions.

## Prerequisites
- [Rust](https://rustup.rs/) (with `wasm32-unknown-unknown` target)
- [wasm-pack](https://rustwasm.github.io/wasm-pack/)
- [Node.js](https://nodejs.org/) (npm)

## Local Development

### 1. Build the Rust WASM module
Whenever you change the Rust code in `wasm-crate/src/`, rebuild the module:
```bash
cd wasm-crate
wasm-pack build --target web
cd ..
# Copy the generated files to the frontend (automatically done in dev if set up, but manually for now)
mkdir -p www/src/pkg
cp wasm-crate/pkg/*.js www/src/pkg/
cp wasm-crate/pkg/*.wasm www/src/pkg/
cp wasm-crate/pkg/*.d.ts www/src/pkg/
```

### 2. Start the React frontend
```bash
cd www
npm install --legacy-peer-deps
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

## Deployment to GitHub Pages
This project is configured to deploy automatically when you push to the `main` branch.
1. Push your code to a GitHub repository.
2. In GitHub, go to **Settings > Pages**.
3. Under **Build and deployment > Source**, select **GitHub Actions**.
4. The workflow in `.github/workflows/deploy.yml` will handle the rest.

## Customization
Overtime categories are defined in `wasm-crate/src/lib.rs`. You can add more categories there and update the corresponding switch cases in `www/src/App.tsx`.
