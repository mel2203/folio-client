# Sales frontend — explained

## 1. Summary

This stage adds customer and invoice pages and an Accounts Receivable aging page. The pages call the Sales endpoints through the shared API request wrapper. Invoice amounts shown in the form are only a preview; the backend returns the official totals. Sending, recording a payment, or voiding an invoice creates journal entries on the server. No schema or migrations were added in this frontend repository. The corresponding backend work and its explanation are in [sales-backend-explained.md](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/docs/sales-backend-explained.md).

## 2. One request end to end

When a user saves a draft, [InvoiceForm.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/InvoiceForm.jsx:133) validates the fields and calls `createInvoice` or `updateInvoice`. [sales.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/api/sales.js:17) sends the request through [client.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/api/client.js:1). On the backend, [app.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/app.js:30) puts Sales routes behind authentication. [invoice.routes.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/routes/invoice.routes.js:6) attaches the route and validator; [sales.validator.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/validators/sales.validator.js:88) checks item fields and decimal strings. [invoice.controller.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/controllers/invoice.controller.js:18) passes `req.companyId` into the transactional service. [invoice.service.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/services/invoice.service.js:94) checks the customer and revenue accounts, calculates cents, and inserts the draft and its items with parameterized SQL. The response is `{ data: invoice }`; the shared client unwraps `data`, and the form navigates to the new invoice detail route. App routes are in [App.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/App.jsx:21).

The customer list uses the same route → validator → controller → service pattern. Its page and filter state are in [Customers.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/Customers.jsx:10), and API calls are in [sales.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/api/sales.js:13). Invoice list filters and pagination are in [Invoices.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/Invoices.jsx:13).

## 3. Journal entries created by this stage

The frontend itself does not write journal entries. These actions ask the backend to post them, using the Sales rules:

| Event | Debit account | Credit account | Worked example | Statements changed |
|---|---|---|---|---|
| Send a $106.00 invoice with $100.00 net and $6.00 tax | Accounts Receivable $106.00 | Sales Revenue $100.00; Sales Tax Payable $6.00 | One invoice with 1 × $100.00 at 6% tax | Trial Balance and Balance Sheet; revenue affects Profit and Loss |
| Receive a $50.00 customer payment | Deposit asset account $50.00 | Accounts Receivable $50.00 | Partial payment against that invoice | Trial Balance and Balance Sheet; no new revenue |
| Void an unpaid sent invoice | Original credits, now debits | Original debits, now credits | Reversal of the invoice's original posted lines | Trial Balance, Profit and Loss, and Balance Sheet net the original entry to zero |

The backend implementation is in [invoice.service.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/services/invoice.service.js:265) for send, lines 328–373 for payment, and lines 376–410 for reversal. Journal entries and lines remain posted and immutable; voiding adds a reversal entry.

## 4. New tables and columns

This frontend stage adds **no tables or columns**. The backend stage added `customers`, `document_sequences`, `invoices`, `invoice_items`, and `payments` in [006_sales.sql](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/migrations/006_sales.sql:1). Each new table enables row-level security. The migration also adds company/customer/status/date indexes, uniqueness for invoice numbers within a company, and checks for statuses, positive quantities, tax rates, amounts, and payment terms.

## 5. Rules that protect the data

| Rule | Where enforced |
|---|---|
| API calls go through one request wrapper; no page calls `fetch` directly | [sales.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/api/sales.js:1), [client.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/api/client.js:1) |
| Amount preview uses integer cents and half-up rounding | [InvoiceForm.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/InvoiceForm.jsx:10); the server independently calculates official totals in backend [invoice.service.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/services/invoice.service.js:94) |
| Dates are calendar dates, without timezone conversion for display or terms arithmetic | [calendar-date.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/utils/calendar-date.js:1) |
| Invoice date range is checked in the UI and in the API validator | [Invoices.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/Invoices.jsx:69), backend [sales.validator.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/validators/sales.validator.js:104) |
| Draft-only edit and deletion, send/payment/void actions depend on server status | [InvoiceDetail.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/InvoiceDetail.jsx:100); the server enforces each transition in backend [invoice.service.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/services/invoice.service.js:212) |
| Only active customers/accounts appear in creation controls | [InvoiceForm.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/InvoiceForm.jsx:48), [InvoiceDetail.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/InvoiceDetail.jsx:31); server checks ownership and activity before posting |
| A/R aging figures come from the API; the page only formats returned values | [ArAging.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/ArAging.jsx:26); backend query scopes to the company and calculates the ledger comparison in [ar-aging.service.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/services/ar-aging.service.js:3) |
| Print hides navigation/actions and shows company, invoice number, and dates | [Sales.css](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/components/Sales.css:247), [InvoiceDetail.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/InvoiceDetail.jsx:168) |

## 6. Tests and verification

- [invoice-form.test.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/tests/invoice-form.test.jsx:37) checks default due date, a $0.25 × 1 at 6% preview of $0.27, the save payload, and required-field validation.
- [invoice-detail.test.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/tests/invoice-detail.test.jsx:44) checks action visibility for draft, sent, partial, paid, and void invoices and checks the browser print call and invoice header.
- [ar-aging.test.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/tests/ar-aging.test.jsx:26) checks aging buckets, reconciled and mismatch states, date changes in URL/API request, and print.
- Existing API-client and date tests also ran in the full suite.

Ran `npm test`: **Test Files 17 passed (17); Tests 83 passed (83)**. Ran `npm run lint`: passed. Ran `npm run build`: passed; Vite transformed 73 modules. These are mocked client tests and a production bundle build. A live browser session against a running API was **not verified** in this stage.

Backend integration tests previously ran against the configured test database: **Test Suites: 10 passed, 10 total; Tests: 89 passed, 89 total**. They exercise tenant isolation, posting, payments, reversals, and aging reconciliation. See backend [sales.integration.test.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/tests/sales.integration.test.js:98).

## 7. How to try it

1. Start the backend with the setup and run command in its README, and start this client with `npm run dev`. Sign in to an authenticated company.
2. Open **Sales → Customers**, click **Add customer**, enter a name and payment terms, and save. Edit a row or choose **Deactivate**; accept or cancel the browser confirmation.
3. Open **Sales → Invoices**, click **New invoice**, choose a customer, enter an item, select an active revenue account, and enter quantity, price, and tax rate. At price `0.25`, quantity `1.00`, and rate `6.00`, the preview should show `RM 0.27` total. Save the draft.
4. On the invoice detail page, choose **Send invoice**. The server assigns an invoice number and returns official totals and the journal entry link.
5. For a sent invoice, choose **Record payment**, enter an amount and active asset account, and submit. A partial payment changes status to Partial; a full payment changes it to Paid. Only an unpaid sent invoice can be voided.
6. Use **Print** on the detail page to open the browser print dialog. The printed view shows company, invoice number, and dates without the app sidebar or action controls.
7. Open **Reports → A/R Aging**, choose an as-of date, and inspect customer overdue buckets and the ledger reconciliation chip.

## 8. Decisions and limitations

The invoice form shows a clearly labeled preview for quick feedback. It sends the source quantities, prices, and rates, while the server computes and stores official totals. Invoice filters live in the URL and use server pagination. Customer status changes use the browser's native confirmation dialog. A/R aging is a report display, not a client-side calculation. Customer and invoice writes, journal posting, and status enforcement remain backend responsibilities. Credit notes, refunds, recurring invoices, email delivery, PDF export, multi-currency, payment gateways, and voiding payments were not built.

## 9. Examiner questions and a short presentation

1. **Why can the invoice preview differ from an official invoice?** It is explicitly a preview; the server recomputes line rounding and totals before returning the saved invoice.
2. **When does an invoice get its number and affect the ledger?** On Send. Draft creation does not post a journal entry or consume a number.
3. **How does the UI prevent an invalid invoice status action?** It displays buttons based on the returned status; the backend independently rejects invalid transitions.
4. **Does a customer payment create revenue again?** No. It debits the deposit asset account and credits Accounts Receivable.
5. **What does an A/R aging mismatch mean?** Aging open invoices differ from the A/R ledger balance, for example because a manual journal entry affected A/R.

**60-second presentation:** “The Sales screens let a user maintain customers, prepare invoice drafts, send invoices, record payments, and review Accounts Receivable aging. The form previews amounts with integer cents and labels the result as a preview; the backend is responsible for official rounding and totals. Sending an invoice posts receivables against revenue and tax. A payment reduces receivables and increases a selected asset account. The detail page exposes only actions that fit the invoice status, while the backend checks those transitions again. A/R Aging displays server-calculated overdue buckets and compares their total with the ledger. The frontend contains no database writes or accounting journal logic.”

## 10. Check the implementation yourself

From the frontend repository:

```sh
npm test
npm run lint && npm run build
rg -n "createInvoice|recordInvoicePayment|getArAging|Totals preview|reconciles|window.print" src/api/sales.js src/api/reports.js src/pages/InvoiceForm.jsx src/pages/InvoiceDetail.jsx src/pages/ArAging.jsx
```
