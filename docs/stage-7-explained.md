# Stage 7 — Sales and purchases UI restyle

## 1. Summary

This stage restyles the existing customer, vendor, invoice, and bill screens to use the redesigned Folio panels, typography, fields, status pills, tables, totals, and dialogs. The existing page routes, API functions, form validation, integer-cent calculations, and document actions remain the source of behavior. The invoice and bill pages still call the API; no backend behavior or response fields were invented or changed. The intent was to bring those screens closer to the supplied demo while retaining the existing application logic.

## 2. One request end to end

Example: a signed-in user opens the invoice list. The client route is registered as `/invoices` in [App.jsx](../src/App.jsx#L90-L99). The [Invoices page](../src/pages/Invoices.jsx#L20-L55) reads the current filters and page from the URL, then calls `listInvoices`. That client function creates a GET request to `/api/invoices` with the query parameters in [sales.js](../src/api/sales.js#L26-L30). The shared [request wrapper](../src/api/client.js#L29-L75) makes the HTTP request and returns `data` and `meta` when the response contains pagination metadata. The page checks that the returned `data` is an array and that `meta` exists, then renders the rows, loading/error/empty states, and pagination in [Invoices.jsx](../src/pages/Invoices.jsx#L73-L130).

This is a frontend-only repository. The backend route, validator, controller, service, SQL, and its own response-generation code were not changed or inspected in this stage. Their internals are therefore **not verified** here.

## 3. Journal entries created

| Event | Debit account | Credit account | Worked example | Statements changed |
|---|---|---|---|---|
| None | — | — | This UI restyle does not create or post any journal entry. | None |

Invoice sending, bill posting, payments, and void/reversal behavior still rely on the existing API operations; this stage changed only their presentation and confirmation UI.

## 4. New tables and columns

None. This frontend stage adds no database tables or columns and includes no migration.

## 5. Rules that protect the data

| Concern | What remains in place |
|---|---|
| Validation | Existing controlled-form validation and server error display remain in [InvoiceForm.jsx](../src/pages/InvoiceForm.jsx#L18-L55), [BillForm.jsx](../src/pages/BillForm.jsx#L20-L52), and the shared contact page in [ContactDirectoryPage.jsx](../src/pages/ContactDirectoryPage.jsx#L73-L143). The stage did not change those rules. |
| Money | Invoice previews continue to use integer cents and half-up rounding, while bill previews sum cents; see [InvoiceForm.jsx](../src/pages/InvoiceForm.jsx#L18-L34) and [BillForm.jsx](../src/pages/BillForm.jsx#L18-L45). List/detail amounts continue to use the existing money helpers. The restyle adds right-aligned tabular-number styling only. |
| Status and actions | Which actions appear for each document status is unchanged in [InvoiceDetail.jsx](../src/pages/InvoiceDetail.jsx#L146-L159) and [BillDetail.jsx](../src/pages/BillDetail.jsx#L66-L72). Void confirmation now uses an in-page dialog; confirming still calls the same existing `voidInvoice` or `voidBill` API function. |
| Tenant isolation and immutability | These are enforced by the server, not by this visual client change. Server-side enforcement was not verified in this frontend-only stage. |
| Request errors | Requests still go through the shared client wrapper, which maps unsuccessful responses into `ApiError` objects and triggers the existing unauthorized handling; see [client.js](../src/api/client.js#L29-L75). |
| Responsive tables and fields | The sales UI has scrollable table containers, responsive form columns, visible focus outlines, and small-screen layout rules in [Sales.css](../src/components/Sales.css#L339-L520). |

## 6. Tests and what is not tested

No test files or existing assertions were changed.

The focused checks covered five suites: customer active-state pending behavior, invoice and bill form previews/validation, invoice payment-account errors and print output, and bill print output. The focused run reported **5 test files passed and 18 tests passed**.

The full suite command `npm test -- --run --maxWorkers=1` reported **22 test files passed and 99 tests passed**. The production build command `npm run build` completed successfully. ESLint passed on the changed sales page components, and `git diff --check` reported no whitespace errors.

The suite does not test the new void-dialog interaction itself, live backend responses, tenant isolation, SQL, or database rules. Browser visual comparison of authenticated sales pages is **not verified**: the local preview reached the login screen, but the configured API returned a CORS error because the preview origin was `127.0.0.1:5173` while the API allowed `localhost:5173`.

## 7. How to try it

1. Start the frontend with `npm run dev`, then open `http://localhost:5173`.
2. Ensure the backend is running at the configured API URL and that its CORS setting allows `http://localhost:5173`, then sign in.
3. Open **Customers**, **Vendors**, **Invoices**, and **Bills** from the app navigation. Compare panel/table layout, rounded status pills, filters, totals, and responsive overflow with the demo.
4. Open an invoice or bill, use **Print**, and confirm the printed view shows the company, document heading, and dates without the action controls.
5. On an unpaid sent invoice or open bill, select **Void**, then cancel and confirm separately. Cancel should leave the document untouched; confirming should call the same existing void API operation.
6. To verify the code without a live backend, run `npm test -- --run --maxWorkers=1` and `npm run build`.

## 8. Decisions, trade-offs, and limitations

- Shared page headers, panels, and button primitives are reused where practical; existing API hooks and response fields were left alone.
- The void prompt is now an in-page accessible-role dialog rather than a browser-native confirm. The business action still requires explicit confirmation, but the new interaction is not covered by a dedicated test yet.
- The existing payment dialog and contact edit dialog were styled in place. No fake demo records or store were copied from the reference project.
- Authenticated visual comparison was blocked by the local CORS mismatch described above. No live API shape or backend behavior is claimed as verified.
- Stage 8 polish, including a full-width/browser-size and contrast review, has not been done.

## 9. Examiner questions and short answers

1. **Did this stage change how invoices are posted?** No. It changes their presentation only; existing posting calls remain in the client.
2. **Why are invoice amounts right-aligned and monospaced?** It makes decimal columns easier to compare visually; it does not change the stored or calculated amount.
3. **Where does invoice list data come from?** The existing `listInvoices` client function requests `/api/invoices`; the page displays the returned data and pagination metadata.
4. **Does the void dialog reverse the entry itself?** No. It asks for confirmation and calls the existing void API function. The server remains responsible for creating the reversal.
5. **Were new journal entries or database structures added?** No. This was a frontend UI restyle with no migrations.

**60-second presentation script:**  
“In Stage 7, I restyled the customer and vendor directories, invoice and bill lists, document forms, and document details. I used the Folio design system for panels, controls, status pills, and responsive ledger tables. I preserved the existing routes, API calls, validation, and cents-based previews. Amounts still come from the API or existing money helpers; the visual changes do not perform floating-point calculations. The invoice and bill detail pages still show the same allowed actions. Void now has an in-page confirmation dialog, but the existing server API remains responsible for the reversal. I ran the full frontend suite and production build. I could not verify the authenticated visual result because the local API rejected the preview origin through CORS.”

## 10. Three ways to verify the claims

1. `rg -n "listInvoices|/api/invoices|request\\(" src/api/sales.js src/api/client.js`
2. `rg -n "parseAmountToCents|roundHalfUp|Confirm void|sales-status--" src/pages/InvoiceForm.jsx src/pages/InvoiceDetail.jsx src/pages/BillDetail.jsx src/components/Sales.css`
3. `npm test -- --run --maxWorkers=1 && npm run build`
