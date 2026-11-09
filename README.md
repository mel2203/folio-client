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

## Reports

The authenticated app includes three live reports calculated from posted journal entries for the current company:

- **Trial Balance** at `/reports/trial-balance`: debit and credit balances by account, totals, and a balance status.
- **Profit and Loss** at `/reports/income-statement`: revenue, expenses, and net income or loss for an inclusive date range.
- **Balance Sheet** at `/reports/balance-sheet`: assets, liabilities, equity, and current earnings through the selected date.

Open **Reports** in the sidebar to switch between the three reports. Visiting `/reports` opens Trial Balance. Date selections are kept in the URL: Trial Balance and Balance Sheet use `asOf=YYYY-MM-DD`; Profit and Loss uses `from=YYYY-MM-DD&to=YYYY-MM-DD`. Default dates use Kuala Lumpur time. Displayed report dates use `dd/mm/yyyy`.

Each report includes loading, empty, and error states. Use **Print** to open the browser's print dialog; the printed report includes the company name, report title, and selected date or period.
