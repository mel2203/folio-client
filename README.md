# Folio frontend

Folio is a React single-page app for Malaysian small-business accounting. It connects to the Folio REST API; this repository contains frontend code only.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- The Folio backend running locally for registration, login, and live account/journal data

## Setup

From this directory, install dependencies and create your local environment file:

```sh
npm install
cp .env.example .env
```

Set `VITE_API_URL` in `.env` to the backend origin. The example uses:

```dotenv
VITE_API_URL=http://localhost:3000
```

Vite environment variables are included in the client bundle. Do not put secrets, passwords, or tokens in them. `.env` is ignored by Git; commit only `.env.example`.

## Run the app

Start the backend first, then run the frontend development server:

```sh
npm run dev
```

Vite prints the local client URL, usually `http://localhost:5173`.

The backend must be configured to allow that client origin through CORS. For the backend's local configuration, set its `CLIENT_URL` to the exact frontend origin (for example, `http://localhost:5173`). If the client runs on another port, update the CORS allowlist accordingly.

## Tests

Run the Vitest and Testing Library suite:

```sh
npm test
```

Tests mock `fetch`; they do not require a running API or make real network requests.

## Lint and production build

```sh
npm run lint
npm run build
```

The production files are written to `dist/`. To preview that build locally:

```sh
npm run preview
```
