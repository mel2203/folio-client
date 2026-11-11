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

## Features

- Dashboard at `/dashboard` with cash, receivables, payables, and current-month net income; a six-month revenue-versus-expenses chart; top expenses and customers; and overdue invoice links.
- Journal entries and chart of accounts.
- Customer, invoice, vendor, and bill workflows backed by the API.
- Trial Balance, Profit and Loss, Balance Sheet, A/R Aging, and A/P Aging reports.
- Responsive layouts, loading and error feedback, toast messages, a top-level error boundary, keyboard focus styles, page-specific browser titles, and a folded-page favicon.

The dashboard uses the backend's `GET /api/dashboard/summary` response for its summary figures. The backend defaults `asOf` to today in Kuala Lumpur; its optional `asOf=YYYY-MM-DD` query is available through the API client but is not exposed as a dashboard control. The overdue list combines the summary totals with records from the existing paginated invoice API; it does not add a backend endpoint or change accounting totals on the client.

## Screenshots

- Dashboard: _Screenshot placeholder — add after deployment._
- Invoices: _Screenshot placeholder — add after deployment._
- Reports: _Screenshot placeholder — add after deployment._

## Live links

- Frontend: Not published.
- Backend API: Not published.

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

## Sales

The authenticated app includes customer and invoice workflows backed by the Sales API:

- **Customers** at `/customers`: search, filter active or inactive customers, page through results, add or edit details and payment terms, and deactivate or reactivate with confirmation.
- **Invoices** at `/invoices`: filter by status, customer, issue-date range, and invoice number. Create drafts at `/invoices/new`; invoice detail pages show server-calculated totals, payments, and links to their journal entries.
- **Draft invoice editing** is available at `/invoices/:id/edit`. Drafts can be saved or deleted. Sending, payment recording, and voiding are available on the invoice detail page when the server status permits them.
- **A/R Aging** at `/reports/ar-aging`: view customer balances in overdue buckets and compare the aging total with the Accounts Receivable ledger. Its `asOf=YYYY-MM-DD` date is stored in the URL.

Invoice dates are plain calendar dates and display as `dd/mm/yyyy`. The form previews rounded amounts using integer cents; the backend returns the official totals after saving. Use **Print** on an invoice detail page for a printable copy with company name, invoice number, issue date, and due date. Browser print styles hide the app navigation and action controls.

Customer and invoice pages show loading, empty, and error states. Sales API functions use the shared request wrapper in `src/api/client.js`.

## Accounting design

- **Double entry:** invoices, payments, bills, and manual journal entries use the backend posting services, which validate balanced debits and credits.
- **Immutability and reversals:** posted journal entries are not edited in the client. Corrections use server-side reversing entries.
- **System roles:** accounting workflows use the server's designated cash, receivable, payable, and tax accounts rather than assuming account codes.
- **Cents arithmetic:** money from the API remains decimal strings. The client formats money using integer cents in `src/utils/money.js`; dashboard report totals come directly from the server.
- **Tenant isolation:** the frontend does not choose a company identifier for business requests. The authenticated server determines and scopes the company.
