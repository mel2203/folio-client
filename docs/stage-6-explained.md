# Stage 6 — Reports UI

## 1. Summary

This stage restyles Trial Balance, Profit and Loss, Balance Sheet, A/R Aging, and A/P Aging to use Folio’s shared heading, panel, pill navigation, ledger-table, and print styles. Existing report routes, API calls, report response usage, query parameters, date controls, and empty/loading/error behavior remain in place. Report figures continue to come from API responses; this stage does not add report calculations. The backend repository was not opened or changed, so backend route validators, controllers, services, SQL, and live response details are **not verified** here.

The implementation does what the source below shows. Its intended outcome is to make the existing report pages visually consistent with the demo without changing report behavior.

## 2. One real request end to end

The app maps `/reports/trial-balance` to `TrialBalance` in [App.jsx](../src/App.jsx#L101). That page reads `asOf` from the URL, calls `getTrialBalance({ asOf })`, validates that it received accounts and totals, and renders the report response in [TrialBalance.jsx](../src/pages/TrialBalance.jsx#L16) and [TrialBalance.jsx](../src/pages/TrialBalance.jsx#L34). The API helper sends a GET request to `/api/reports/trial-balance` with the `asOf` query parameter in [reports.js](../src/api/reports.js#L12). The shared request wrapper handles the HTTP request in [client.js](../src/api/client.js#L24).

On success, the frontend expects the request wrapper’s unwrapped `data` value to contain `accounts`, `totals`, and `isBalanced`; this shape appears in [trial-balance.test.jsx](../tests/trial-balance.test.jsx#L31) and is rendered in [TrialBalance.jsx](../src/pages/TrialBalance.jsx#L103). It formats the server’s amount strings with the existing money utility. The page now uses a shared header and panel with the ledger-table style in [TrialBalance.jsx](../src/pages/TrialBalance.jsx#L71).

The backend route, validator, controller, service, SQL query, and a live HTTP response were not inspected. Their details are **not verified** in this frontend-only stage.

## 3. Journal entries created

The report UI changes and tests did not create any journal entries. No accounting transaction was run.

| Event | Debit account | Credit account | Worked example | Statements changed |
|---|---|---|---|---|
| None | — | — | No journal entry was created | None |

This stage only displays existing API report data. It does not post, reverse, or edit journal entries.

## 4. New tables and columns

None. No database or API schema was changed.

## 5. Rules protecting accounting data

| Rule | Enforcement or stage status |
|---|---|
| Report totals and balances are server response values | The report pages render API response fields such as totals, net income, and balance differences; for example [IncomeStatement.jsx](../src/pages/IncomeStatement.jsx#L115) and [BalanceSheet.jsx](../src/pages/BalanceSheet.jsx#L111). This stage added no client-side report aggregation. |
| Money is not calculated with floating point | Display continues through the money helpers, such as [IncomeStatement.jsx](../src/pages/IncomeStatement.jsx#L7) and [TrialBalance.jsx](../src/pages/TrialBalance.jsx#L10). The existing trial-balance difference display uses integer cents in [TrialBalance.jsx](../src/pages/TrialBalance.jsx#L61). |
| Dates remain plain date strings and URL parameters | Existing date inputs and query handling remain in each report page, including [IncomeStatement.jsx](../src/pages/IncomeStatement.jsx#L12) and [AgingReportPage.jsx](../src/pages/AgingReportPage.jsx#L12). The new report links carry the current query string in [ReportsNav.jsx](../src/components/ReportsNav.jsx#L12). |
| Reconciliation is visible in words and not only color | Balance Sheet shows a check mark and “Assets = Liabilities + Equity” when balanced, or a cross and the difference when it is not, in [BalanceSheet.jsx](../src/pages/BalanceSheet.jsx#L111). |
| Journal immutability and tenant isolation | No backend or journal mutation code changed. These server-side rules were **not verified** by this stage. |
| Print view omits navigation and on-screen report controls | Print styles hide the sidebar, report tabs, and report headers, and show the company/report/date print header in [Reports.css](../src/components/Reports.css#L162) and [ReportsPrintHeader.jsx](../src/components/ReportsPrintHeader.jsx#L13). |

## 6. Tests and what is not tested

No tests or assertions were edited.

- [reports-navigation.test.jsx](../tests/reports-navigation.test.jsx#L52) checks the `/reports` redirect, active route links, navigation to Profit and Loss, the print header, and the Print button.
- [trial-balance.test.jsx](../tests/trial-balance.test.jsx#L48) checks API-rendered figures, balance status, mismatch display, date query updates, loading/empty state, and API errors.
- [income-statement.test.jsx](../tests/income-statement.test.jsx#L50) checks revenue and expenses, totals, parenthesized net loss, date/query updates, reversed-range validation, and loading/empty/error states.
- [balance-sheet.test.jsx](../tests/balance-sheet.test.jsx#L53) checks returned figures, reconciliation and mismatch display, date/query updates, and loading/empty/error states.
- [ar-aging.test.jsx](../tests/ar-aging.test.jsx#L26) checks aging buckets, reconciliation, mismatch display, as-of updates, and printing.
- [ap-aging.test.jsx](../tests/ap-aging.test.jsx#L18) checks vendor aging, reconciliation, printing, mismatch, and as-of updates.

The full test command was `npm test -- --maxWorkers=1`; its summary was **22 test files passed, 99 tests passed**. The report-focused run passed **6 test files and 21 tests**. `npm run build`, ESLint on the changed report components, and `git diff --check` passed.

Not tested: backend SQL or tenant scoping, server-side accounting calculations, live API responses, database behavior, print output from an actual printer/browser dialog, or visual pixel comparison with the demo.

## 7. How to try it

1. Start the backend with the project’s normal local development procedure if you want live report data.
2. From the frontend repository, run `npm run dev`.
3. Sign in, then select **Reports** in the sidebar. `/reports` opens Trial Balance.
4. Choose Trial Balance, Profit and Loss, Balance Sheet, A/R Aging, or A/P Aging from the pill row. Change the date controls and check that the URL and displayed report update.
5. Select **Print**. The browser print dialog should show a clean report with company name, report title, and the relevant date or period, without the app sidebar or report controls.

Expected: report navigation uses rounded pills; date controls remain on the right of the page heading when space allows; report tables use ledger styling; totals use double rules; Balance Sheet uses two side-by-side panels on wide screens and stacks them on narrow screens. The existing report figures and status messages should remain unchanged.

## 8. Decisions, trade-offs, and limitations

- The five real report routes remain separate. The pill navigation uses router links, retains the current query string, and keeps each route’s existing parameter convention (`asOf` or `from`/`to`).
- Existing date controls remain as-of controls on point-in-time reports and From/To controls on Profit and Loss. The stage did not introduce new date semantics.
- The Balance Sheet is grouped into two panels: Assets, and Liabilities/Equity. Its existing server-provided totals and balance check are preserved.
- The print action already existed; this stage restyled it and retained `window.print()`.
- There are no new report endpoints, no changes to report formulas, and no new accounting figures computed by the browser.
- No browser visual comparison was completed in this stage.

## 9. Examiner questions and short answers

1. **Where do the report figures come from?** From the existing report API responses. The stage changed their presentation, not their source.
2. **How do report tabs navigate?** They are router links to the existing report routes and append the current query string.
3. **What dates does Profit and Loss use?** It keeps its existing `from` and `to` date parameters; the point-in-time reports continue using `asOf`.
4. **How does the Balance Sheet show a mismatch?** It displays a cross and the API-provided difference; the wording makes the meaning clear without relying on color alone.
5. **Did this stage change accounting rules or database behavior?** No. It is a frontend-only restyle, and backend enforcement was not verified.

**60-second presentation:** “Stage 6 updates the five existing report screens without changing their routes or calculations. Trial Balance, Profit and Loss, Balance Sheet, and the two aging reports now share the Folio heading, pill navigation, and report styling. Date controls continue to use each report’s existing URL parameters, and the tabs retain the current query string. The pages display amounts returned by the API using the existing money formatters. The Balance Sheet has two panels and a reconciliation status with a symbol and text. Print keeps the browser’s print action and hides app navigation and screen controls while showing a report header. The report tests, full frontend tests, lint, and build passed. Backend and live-data behavior were not verified.”

## 10. Three ways to check these claims

1. Run `npm test -- --maxWorkers=1` to execute all frontend tests.
2. Run `rg -n "getTrialBalance|/api/reports/trial-balance|formatReportAmount" src/api/reports.js src/pages/TrialBalance.jsx` to inspect the Trial Balance request and display path.
3. Run `rg -n "location.search|window.print|@media print|reports-page__header" src/components/ReportsNav.jsx src/components/Reports.css` to inspect query retention, print action, and print styles.
