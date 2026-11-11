# Stage 4: Dashboard frontend explanation

## 1. Summary

This frontend stage adds an authenticated dashboard at `/dashboard`, which is also the destination after login and the authenticated root route. It displays the server's cash, receivable, payable, income, monthly revenue/expense, overdue, customer, and expense-account figures. A chart has a hidden data table for screen readers; overdue invoice links are loaded separately from the existing paginated invoice API. Dashboard money remains in decimal strings until it is parsed into integer cents for display or chart coordinates. This frontend does not create journal entries or change accounting totals. The separate backend dashboard and demo-seeder work is described in [stage4-dashboard-api-explained.md](../../../Folio%20-%20Backend/docs/stage4-dashboard-api-explained.md) and [stage4-demo-seed-explained.md](../../../Folio%20-%20Backend/docs/stage4-demo-seed-explained.md).

## 2. One request end to end

Example: a signed-in user opens Dashboard.

1. The dashboard component calls `getDashboardSummary()` without a date query in [dashboard.js](../src/api/dashboard.js#L3). This uses the shared `request` wrapper in [client.js](../src/api/client.js#L24), which sends the stored bearer token. Token access is centralized in [tokenStorage.js](../src/api/tokenStorage.js#L1).
2. The backend mounts dashboard routes at `/api/dashboard` in [app.js](../../../Folio%20-%20Backend/src/app.js#L38). Its route maps `GET /summary` through request validation in [dashboard.routes.js](../../../Folio%20-%20Backend/src/routes/dashboard.routes.js#L7). The validator accepts an optional plain date and otherwise uses today's date in Kuala Lumpur in [dashboard.validator.js](../../../Folio%20-%20Backend/src/validators/dashboard.validator.js#L5).
3. The thin controller passes the authenticated company ID and validated date to the service in [dashboard.controller.js](../../../Folio%20-%20Backend/src/controllers/dashboard.controller.js#L4). The SQL in [dashboard.service.js](../../../Folio%20-%20Backend/src/services/dashboard.service.js#L5) uses parameters for company and date. It filters posted entries and company-scoped rows, and aggregates the cash balance, monthly performance, overdue totals, top customers, and top expense accounts. The service also calls the existing A/R and A/P aging functions in [dashboard.service.js](../../../Folio%20-%20Backend/src/services/dashboard.service.js#L169).
4. The service turns database numeric strings into integer cents and back into two-decimal strings, then the controller responds with `{ data }`. See the response mapping in [dashboard.service.js](../../../Folio%20-%20Backend/src/services/dashboard.service.js#L183). The checked-in service is the source for this response contract. A live backend response was not requested or observed during this frontend work.
5. The frontend validates the response shape, displays the summary, and loads overdue invoice details using the existing invoice-list API. The list is filtered by due date and unpaid balance using plain-date comparisons and integer cents in [Dashboard.jsx](../src/pages/Dashboard.jsx#L76). `Promise.allSettled` lets the summary and invoice list show their own errors instead of hiding one behind the other in [Dashboard.jsx](../src/pages/Dashboard.jsx#L161).

The response shape defined by the backend source is:

```json
{
  "data": {
    "asOf": "YYYY-MM-DD",
    "currency": "MYR",
    "balances": {
      "cash": "0.00",
      "accountsReceivable": "0.00",
      "accountsPayable": "0.00"
    },
    "netIncomeThisMonth": "0.00",
    "monthlyPerformance": [
      { "month": "YYYY-MM", "revenue": "0.00", "expenses": "0.00" }
    ],
    "overdueInvoices": { "count": 0, "amount": "0.00" },
    "topCustomers": [
      { "customerId": "id", "name": "Customer", "invoicedAmount": "0.00" }
    ],
    "topExpenseAccounts": [
      { "accountId": "id", "code": "6000", "name": "Expense", "amount": "0.00" }
    ]
  }
}
```

`monthlyPerformance` contains six rows in the actual service response. The example row and IDs above illustrate types and field names, not live data. The summary contains overdue totals, not invoice records; the dashboard uses the existing invoice-list endpoint for its five-row detail list.

## 3. Journal entries created

The dashboard frontend and `GET /api/dashboard/summary` create no journal entries. The separate Stage 4 demo seeder creates activity using the existing posting services; its worked examples are included here so the dashboard and demo activity are explained together. Those values are examples from the seeder, not output from a database run. See `Folio - Backend/docs/stage4-demo-seed-explained.md`.

| Event | Debit account | Credit account | Worked example | Statement effect |
|---|---|---|---|---|
| Owner contribution | Cash and Bank | Owner's Capital | RM 30,000.00 | Balance sheet cash and equity increase. |
| Send an invoice | Accounts Receivable | Sales Revenue; Sales Tax Payable when tax is positive | RM 850.00 revenue + RM 51.00 tax = RM 901.00 receivable | Balance sheet receivable and tax payable increase; income statement revenue increases. |
| Receive a customer payment | Cash and Bank | Accounts Receivable | RM 901.00 full payment, or RM 450.50 partial payment | Balance sheet cash increases and receivable decreases; revenue is not recorded again. |
| Post a rent bill | Rent Expense | Accounts Payable | RM 3,500.00 | Balance sheet payable increases; income statement expense increases. |
| Pay a bill | Accounts Payable | Cash and Bank | RM 465.00, or RM 232.50 partial payment | Balance sheet payable and cash decrease; expense is not recorded again. |
| Read dashboard figures or refresh the page | None | None | None | No statement changes. |

## 4. New tables and columns

No database tables or columns were added or changed by the dashboard frontend. No migration was run. The frontend adds the permitted `recharts` dependency for the monthly performance chart. It also adds a dashboard API module, dashboard page and styles, reusable toast and error-boundary components, and a folded-page [favicon](../public/favicon.svg).

## 5. Rules that protect the data

| Rule | Where it is enforced |
|---|---|
| The server is the authority for report totals. | KPI totals, monthly figures, overdue totals, and rankings are rendered from the summary response in [Dashboard.jsx](../src/pages/Dashboard.jsx#L257). The client does not sum those report totals. |
| Money is not calculated with decimal floating point. | Monetary strings are parsed through `parseAmountToCents`. Overdue invoice display subtracts integer cents. Chart coordinates use cents and are checked as safe integers in [Dashboard.jsx](../src/pages/Dashboard.jsx#L20). The chart formatter converts integer cents back to display money. |
| The zero-activity chart is an empty state, not misleading cent ticks. | The component checks whether any monthly amount is non-zero before drawing the chart in [Dashboard.jsx](../src/pages/Dashboard.jsx#L158). A regression test covers this state in [dashboard.test.jsx](../tests/dashboard.test.jsx#L107). |
| Dates are plain dates. | The server defaults `asOf` to the current Kuala Lumpur date. The dashboard compares `YYYY-MM-DD` dates as strings and formats them with the shared calendar-date helper in [Dashboard.jsx](../src/pages/Dashboard.jsx#L76). The UI does not offer a historical date control. |
| A company identifier is not supplied by the frontend. | The shared API wrapper sends the token from the centralized token module. The backend controller uses `req.companyId`, and its SQL receives that company as a bound parameter. |
| Loading, empty, errors, and refresh state are visible. | The dashboard has an announced loading skeleton, empty sections, an error state, retry, and a disabled refresh button while loading in [Dashboard.jsx](../src/pages/Dashboard.jsx#L235). A refresh reports success or partial failure using [Toast.jsx](../src/components/Toast.jsx#L1). |
| Chart information is available without relying on color. | The chart has an accessible description and a visually hidden month/revenue/expenses table in [Dashboard.jsx](../src/pages/Dashboard.jsx#L292) and [Dashboard.jsx](../src/pages/Dashboard.jsx#L314). |
| Focus and route failures remain usable. | Global focus-visible styles are in [global.css](../src/styles/global.css#L20). A route-level error boundary is used in [App.jsx](../src/App.jsx#L68), and unmatched paths render the existing 404 page via [App.jsx](../src/App.jsx#L108). |
| Tenant isolation and ledger rules remain server-side. | The frontend does not authorize by decoding a token or write journal data. Company scoping, posted-entry filtering, and accounting rules are enforced by the backend dashboard and posting services. |

## 6. Tests and what is not tested

- [dashboard.test.jsx](../tests/dashboard.test.jsx#L72) checks the API summary display, invoice link, MYR formatting, chart text alternative, current-date request without an `asOf` query, and successful refresh feedback.
- [dashboard.test.jsx](../tests/dashboard.test.jsx#L100) checks the loading skeleton and the all-zero monthly empty state.
- [dashboard.test.jsx](../tests/dashboard.test.jsx#L125) checks a failed summary request, its accessible error message, and retry behavior.
- [route-guard.test.jsx](../tests/route-guard.test.jsx#L36) checks anonymous access to protected routes and the authenticated default dashboard route.
- The full frontend suite reported **22 test files passed, 99 tests passed**.
- `npm run build` completed successfully. Targeted ESLint on changed application source completed successfully.
- `npm run lint` was run and remains blocked by the existing `react-refresh/only-export-components` error in unchanged [SalesStatus.jsx](../src/components/SalesStatus.jsx#L3).
- A browser width sweep used a mocked API at 320px across login, register, dashboard, journal, accounts, customers, invoices, vendors, bills, reports, root redirects, and 404 routes. The document width stayed at 320px on the routes visited. It is not a real-device test.
- Not verified: live backend integration, database-backed dashboard tests, `seed-demo.js`, real customer data, and deployment. The seeder was not run and no database was accessed.

## 7. How to try it

1. Configure and run the backend using its own README, then start the client from the frontend repository:

   ```sh
   npm install
   npm run dev
   ```

2. Open the Vite URL, sign in with a test account, and select **Dashboard** in the sidebar. After login, the app also routes to `/dashboard`; the authenticated root `/` redirects there in [App.jsx](../src/App.jsx#L77).
3. Confirm the cash, A/R, A/P, and net-income cards; the six-month chart or its empty state; overdue totals and links; top expense accounts; and top customers.
4. Select **Refresh**. The button is disabled while requests run and a toast reports the result.
5. To verify the code without a running API, run `npm test` and `npm run build`. The tests mock `fetch`, so they do not contact a backend or database.

Expected dashboard money uses `RM` with thousands separators and two decimal places. The displayed `As of` date is formatted `dd/mm/yyyy`.

## 8. Decisions, trade-offs, and limitations

- The backend response has only the overdue count and amount. Rather than invent an endpoint, the frontend obtains invoice detail from the existing paginated invoices API and shows up to five overdue invoices.
- The dashboard always requests the backend's Kuala Lumpur “today” default. Although the API client can pass `asOf`, a date picker was not included because the existing invoice-list response's paid amount is current-state data, not historical payment data.
- Charts use integer cents for coordinates. Recharts requires numeric coordinates, so cents are converted to safe integers; values outside the safe integer range raise an error instead of silently losing precision.
- An all-zero six-month period uses an explanatory empty state instead of showing an arbitrary cent-level axis.
- The optional public landing page, real deployment links, and screenshots were not added. No backend code, database schema, or migration was changed in the frontend part.

## 9. Examiner questions and a short presentation

1. **Why does the dashboard use both a summary API and an invoice list?** The summary provides official totals. It does not contain invoice details, so the existing list API supplies the five links.
2. **Why not total the figures in React?** The backend is the source of accounting figures. The frontend only parses cents for display and individual outstanding invoice amounts.
3. **How is the chart money-safe?** API decimal strings become integer cents. The chart receives safe integer coordinates, not decimal amounts.
4. **How is the company selected?** The API client sends the authentication token. The backend gets the company ID from the authenticated request, not from a dashboard query or body.
5. **How can a screen reader access the chart values?** The chart has an accessible description and an accompanying visually hidden table.

**60-second presentation:** “The dashboard is the first page after login. It asks the backend for the official company summary: cash, receivables, payables, this month’s net income, six months of revenue and expenses, overdue totals, top customers, and top expense accounts. The backend scopes the SQL to the authenticated company and uses posted ledger data. The dashboard shows an accessible chart and a text table, and it gets invoice links from the existing invoice list because the summary has no invoice details. Amounts stay as decimal strings at the API boundary and are parsed into integer cents for client display. Loading, error, empty, and refresh states are visible. This screen is read-only and does not create journal entries.”

## 10. Three ways to check these claims

Run these from `Folio - Frontend/folio-frontend`:

```sh
grep -n 'path="/dashboard"\|PageTitleManager\|path="\*"' src/App.jsx
grep -n 'getDashboardSummary\|loadOverdueInvoices\|parseAmountToCents\|hasPerformance' src/pages/Dashboard.jsx
npm test -- --run tests/dashboard.test.jsx tests/route-guard.test.jsx
```
