# Sales coverage stage: explanation

## 1. Summary

This stage added two small frontend reliability fixes and verification coverage for the existing Sales backend. The customer directory now prevents repeat deactivate/reactivate requests while one is pending. Invoice Detail now shows an error when active deposit accounts cannot be loaded or the response is invalid, and it prevents recording a payment until the account request succeeds. The backend Sales features were already present; integration assertions were added there for gaps, but no backend production service or migration was changed. The customer UI test, invoice-detail tests, and targeted lint passed. The backend database integration suite was not run because no test database URL was configured.

## 2. One request end to end

Example: a user records a payment on an invoice.

1. [InvoiceDetail.jsx](../src/pages/InvoiceDetail.jsx), lines 31–49, loads the invoice and active accounts. It keeps an account-loading status and captures request or response-shape errors. The page displays that error and disables the payment action while loading or failed (lines 138–149).
2. When the user submits the payment form, the page validates the entered amount as a positive decimal string with at most two decimal places. It sends `paymentDate`, `amount`, `method`, optional `reference`, and `depositAccountId` (lines 77–111).
3. [sales.js](../src/api/sales.js), lines 55–58, posts to `/api/invoices/:id/payments`. The shared [client.js](../src/api/client.js), lines 56–91, handles the HTTP response and returns `payload.data` to the page.
4. In the separate backend repository, `/api` is behind authentication. The route validates the request with `paymentSchema`; the controller passes the authenticated `req.companyId` and validated body into a transaction. The service checks the invoice state, remaining amount, and same-company active asset account, then posts a balanced entry and updates invoice/payment records. Source references: [app.js](<../../../Folio - Backend/src/app.js>), lines 31–40; [invoice.routes.js](<../../../Folio - Backend/src/routes/invoice.routes.js>), lines 7–14; [sales.validator.js](<../../../Folio - Backend/src/validators/sales.validator.js>), lines 143–153; [invoice.controller.js](<../../../Folio - Backend/src/controllers/invoice.controller.js>), lines 50–55; and [invoice.service.js](<../../../Folio - Backend/src/services/invoice.service.js>), lines 321–365.
5. The backend’s success response is `{ data: { payment, invoice } }`. The shared client unwraps `data`, so Invoice Detail receives `{ payment, invoice }`, uses `result.invoice` to refresh the screen, and closes the payment form ([InvoiceDetail.jsx](../src/pages/InvoiceDetail.jsx), lines 94–111). This response shape is source-derived, not live-observed in this stage.

## 3. Journal entries created by this stage

No production journal entries were created by the frontend change or by editing source files. Backend integration tests were expanded to exercise the existing accounting flows. For context, a small example of those established flows is:

| Event | Debit | Credit | Worked example | Statement effect |
|---|---|---|---|---|
| Send invoice | Accounts Receivable 0.27 | Sales Revenue 0.25; Sales Tax Payable 0.02 | 0.25 at 6% tax, rounded half-up per line. | A/R asset rises; revenue affects profit/equity; tax payable liability rises. |
| Record payment | Deposit asset 0.27 | Accounts Receivable 0.27 | Customer pays the example invoice in full. | Deposit asset rises; A/R asset falls. |
| Void unpaid invoice | Sales Revenue 0.25; Sales Tax Payable 0.02 | Accounts Receivable 0.27 | Reverses the original invoice amounts. | Cancels the original accounting effect; original entry remains posted. |

These entries are made by existing backend logic, not this client patch. Backend references are [invoice.service.js](<../../../Folio - Backend/src/services/invoice.service.js>), lines 258–402, and [sales.integration.test.js](<../../../Folio - Backend/tests/sales.integration.test.js>), lines 217–236, 360–394, and 416–449.

## 4. Tables and columns

This frontend stage adds no tables, columns, or migration. The existing backend [006_sales.sql](<../../../Folio - Backend/migrations/006_sales.sql>) creates customers, document sequences, invoices, invoice items, and payments, and enables row-level security on all five. Key constraints include company-scoped invoice-number uniqueness, controlled invoice statuses, nonnegative totals, paid amount no greater than total, positive item quantity, a 0–100 tax rate, and positive payment amounts. No migration was run.

## 5. Rules protecting the data

| Rule | Where enforced |
|---|---|
| Don’t submit a customer active-state change repeatedly while pending. | [ContactDirectoryPage.jsx](../src/pages/ContactDirectoryPage.jsx), lines 33, 119–135, and 174–178, tracks pending customer IDs and disables the matching button. |
| Don’t hide a deposit-account request failure. | [InvoiceDetail.jsx](../src/pages/InvoiceDetail.jsx), lines 17–18 and 35–49, validates the response and stores the error. Lines 138–149 announce it and gate the payment action. |
| Payment amount stays a decimal string, not a floating-point amount. | InvoiceDetail validates the amount string before posting it (lines 94–99); the shared [money.js](../src/utils/money.js) helpers use integer cents to calculate the remaining balance and format money (lines 1–40). The backend enforces precision too. |
| Server controls status, tenant scope, and accounting rules. | The frontend displays actions based on returned invoice status but the backend remains authoritative. Its payment service checks company ownership and balance; journal service checks a balanced entry. References: backend [invoice.service.js](<../../../Folio - Backend/src/services/invoice.service.js>), lines 321–365, and [journal.service.js](<../../../Folio - Backend/src/services/journal.service.js>), lines 40–102. |
| Errors are communicated accessibly. | Contact action errors and invoice/account errors render with `role="alert"`; account loading uses `role="status"` and `aria-live="polite"`. See [ContactDirectoryPage.jsx](../src/pages/ContactDirectoryPage.jsx), lines 155–160, and [InvoiceDetail.jsx](../src/pages/InvoiceDetail.jsx), lines 138–140. |

## 6. Tests: what they prove and what is not tested

- [customers.test.jsx](../tests/customers.test.jsx), lines 26–54: proves the active-state button changes to a pending label, is disabled during the unresolved request, and does not issue a second update when clicked again.
- [invoice-detail.test.jsx](../tests/invoice-detail.test.jsx), lines 66–73: proves a deposit-account failure is shown as an alert and disables Record payment.
- The rest of invoice-detail.test.jsx checks which actions are visible for each invoice status and the print action (lines 46–80).
- Backend tests in the separate repository were expanded for customer update/no-delete behavior, invoice detail/filter/pagination, concurrent numbering, payment/deposit-account validation, reversals, aging boundaries/tenant isolation, date validation, and money precision. They are in backend [sales.integration.test.js](<../../../Folio - Backend/tests/sales.integration.test.js>), lines 140–601.

Verification actually completed:

- `npm test -- tests/invoice-detail.test.jsx tests/customers.test.jsx`: **2 test files passed, 8 tests passed**.
- ESLint on the affected frontend components and tests: passed.
- Backend pure invoice rounding test: **1 suite passed, 1 test passed**.
- Backend syntax checks and whitespace check: passed.
- The backend database integration suite was **not run**. It needs `DATABASE_URL_TEST`; no database was accessed during this stage. Therefore its expanded assertions remain unverified by execution.

## 7. How to try it

From the frontend repository:

```sh
npm test -- tests/invoice-detail.test.jsx tests/customers.test.jsx
./node_modules/.bin/eslint src/pages/InvoiceDetail.jsx tests/invoice-detail.test.jsx src/pages/ContactDirectoryPage.jsx tests/customers.test.jsx
```

For the backend database integration suite, run this from the backend repository and provide only a dedicated test database URL:

```sh
NODE_ENV=test DATABASE_URL_TEST='<TEST-ONLY-DATABASE-URL>' npm test -- --runTestsByPath tests/sales.integration.test.js
```

The test guard rejects a missing test URL or one equal to `DATABASE_URL`. The integration setup applies migrations to that test database. Do not use a development or production URL. I did not run this command.

Manual checks with the app and API running:

1. Sign in and open Customers. Deactivate a customer. During the request, confirm the button says “Deactivating...” and is disabled.
2. Open a sent invoice. With an account request failure, confirm the error is visible and Record payment is disabled. With active asset accounts available, the payment form should be available.
3. Submit a valid partial or full payment. Confirm the page reflects the invoice returned by the API.

## 8. Decisions, trade-offs, and limitations

- Not built in this stage: new Sales endpoints, new journal-entry behavior, new schema, or a retry button for deposit-account loading.
- The pending customer state is tracked per contact, so one contact’s request does not disable every row.
- A failed deposit-account request is surfaced instead of silently ignored. The message recommends reloading; an inline retry button was not added.
- The frontend requires a valid list-shaped accounts result before payment; it does not guess or fabricate a deposit account.
- The existing backend response shape was confirmed by source, not by a live API call.
- Backend business logic and schema were not changed because they already implemented the requested Sales behavior. Added backend integration coverage awaits execution against a dedicated test database.
- Pre-existing uncommitted backend changes in A/R aging code and its integration test were preserved; the A/R service change was not made in this stage.
- No package was added. No `.env` file was opened, printed, or edited. No migration, seed, or database command was run.

## 9. Examiner questions and a short presentation

**Q1. Why disable the customer button while the request is pending?**

It prevents the user from sending the same deactivate/reactivate operation again before the first request finishes.

**Q2. Why show a deposit-account error rather than ignore it?**

Without account choices, the user cannot safely submit a payment. Showing the error explains why the action is unavailable.

**Q3. Does the frontend decide whether a payment is allowed?**

No. The frontend improves usability, but the backend checks invoice status, outstanding balance, account type, and company ownership.

**Q4. Why does the payment endpoint return both payment and invoice?**

The payment record confirms what was posted, while the updated invoice gives the client the latest paid amount and status without guessing them.

**Q5. What is not verified yet?**

The database-backed backend Sales integration suite. It still needs to run with a dedicated `DATABASE_URL_TEST`.

**60-second presentation:**

“I fixed two client reliability issues in the Sales screens. Customer deactivate/reactivate actions now show a pending state and cannot be submitted twice while in flight. Invoice Detail now reports a failed deposit-account request and prevents recording a payment until the account list is available. The UI sends a decimal-string payment through the existing API and uses the returned invoice to refresh the screen; the server remains responsible for company checks and ledger rules. I added regression tests for both UI cases. The focused tests and lint passed. The backend Sales features already existed, and I expanded their integration tests, but I did not run those database-backed tests because no test database URL was configured.”

## 10. Three ways to check these claims

From the frontend repository:

```sh
# Check the pending action implementation.
rg -n "pendingContactIds|async function toggleActive|Deactivating" src/pages/ContactDirectoryPage.jsx

# Rerun the focused frontend regression tests.
npm test -- tests/invoice-detail.test.jsx tests/customers.test.jsx

# Check surfaced account errors and the payment gate.
rg -n "accountsError|accountsLoading|Record payment" src/pages/InvoiceDetail.jsx
```
