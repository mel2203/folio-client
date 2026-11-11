# Stage 8 — States and polish

## 1. Summary

This stage adds shared loading skeleton and empty-state components, restyles the 404 and render-error screens, and routes the existing dashboard refresh notifications through Sonner. Account, contact, invoice, and bill dialogs now use the repository’s Radix-based dialog component for focus management, Escape handling, and keyboard navigation. Existing routes, request functions, validation, and money calculations were preserved. The favicon already existed; its folded-page icon now uses the brand’s yellow accent. The intended result is a more consistent and accessible finish. The implementation and verification are described below; visual review of every route at every target width is **not verified**.

## 2. One real request end to end

Example: the invoice list. The frontend maps `/invoices` to the `Invoices` page in [App.jsx](../src/App.jsx#L90-L99). The page reads filters from the URL, calls `listInvoices`, and handles loading, request error, empty results, and returned rows in [Invoices.jsx](../src/pages/Invoices.jsx#L20-L130). The API helper constructs the query string and requests `/api/invoices` in [sales.js](../src/api/sales.js#L3-L10) and [sales.js](../src/api/sales.js#L28-L30). The shared HTTP wrapper makes the fetch and unwraps the API response in [client.js](../src/api/client.js#L24-L75). The new reusable loading and empty presentations are implemented in [LoadingState.jsx](../src/components/LoadingState.jsx#L3-L14) and [EmptyState.jsx](../src/components/EmptyState.jsx#L4-L16).

This is a frontend-only stage. I did not inspect or change the backend route, validator, controller, service, SQL, or live response generation. Those server-side details are **not verified**.

## 3. Journal entries created

| Event | Debit account | Credit account | Worked example | Statements changed |
|---|---|---|---|---|
| None | — | — | This UI polish stage creates no journal entry. | None |

The existing invoice, bill, payment, and journal actions still use their existing API functions. This stage does not post or reverse entries.

## 4. New tables and columns

None. No database or API schema changed.

## 5. Rules that protect the data

| Rule | Enforcement or stage status |
|---|---|
| Request path and authentication handling | Requests still use the shared client wrapper in [client.js](../src/api/client.js#L24-L75). No fetch or token-storage code was moved. |
| Money calculations | No accounting or money logic was changed. Invoice preview still uses integer-cent arithmetic and half-up rounding in [InvoiceForm.jsx](../src/pages/InvoiceForm.jsx#L18-L34); existing money helpers remain responsible for display formatting. |
| Dialog actions | Dialogs only change presentation and keyboard mechanics. The existing handlers and status checks remain in [Accounts.jsx](../src/pages/Accounts.jsx#L308-L315), [ContactDirectoryPage.jsx](../src/pages/ContactDirectoryPage.jsx#L194-L201), [InvoiceDetail.jsx](../src/pages/InvoiceDetail.jsx#L220-L245), and [BillDetail.jsx](../src/pages/BillDetail.jsx#L82-L83). |
| Error and empty-state communication | Loading components announce their label with `role="status"` and `aria-live="polite`; empty states use a labelled status region in [LoadingState.jsx](../src/components/LoadingState.jsx#L3-L10) and [EmptyState.jsx](../src/components/EmptyState.jsx#L4-L13). Existing error messages still use `role="alert"`. |
| Keyboard and reduced motion | Dialogs reuse the Radix wrapper in [dialog.jsx](../src/components/ui/dialog.jsx#L29-L52), which provides focus handling and Escape behavior. Global focus outlines remain in [global.css](../src/styles/global.css#L176-L184). Skeleton animation is disabled for reduced-motion preferences in [global.css](../src/styles/global.css#L366-L368). Tabs continue to use Radix in [tabs.jsx](../src/components/ui/tabs.jsx#L7-L60). |
| Contrast | Core text/background pairs and the new status-pill tint combinations were checked. The measured ratios for violet-on-violet-tint, success-text-on-mint-tint, and destructive-text-on-coral-tint were 4.86:1, 5.69:1, and 5.40:1. This was not a full computed-style audit of every route and state. |
| Tenant isolation and journal immutability | This stage made no backend changes; server enforcement was not verified. |

## 6. Tests and what is not tested

No test files or existing assertions were changed. The relevant existing suites cover:

- [dashboard.test.jsx](../tests/dashboard.test.jsx): dashboard figures, loading and empty states, chart text alternative, and refresh feedback. It passed with Sonner mounted by [App.jsx](../src/App.jsx#L113).
- [accounts.test.jsx](../tests/accounts.test.jsx) and [customers.test.jsx](../tests/customers.test.jsx): chart-of-accounts behaviors and pending contact actions. These suites still passed after their forms moved to Radix dialogs.
- [invoice-form.test.jsx](../tests/invoice-form.test.jsx), [bill-form.test.jsx](../tests/bill-form.test.jsx), [invoice-detail.test.jsx](../tests/invoice-detail.test.jsx), and [bill-detail.test.jsx](../tests/bill-detail.test.jsx): existing form validation, cents-based previews, status-dependent actions, account-loading errors, and print metadata.
- [journal-new.test.jsx](../tests/journal-new.test.jsx) and [journal-pages.test.jsx](../tests/journal-pages.test.jsx): balanced journal-entry submission, journal rendering, navigation, and the existing success status.
- [trial-balance.test.jsx](../tests/trial-balance.test.jsx), [income-statement.test.jsx](../tests/income-statement.test.jsx), [balance-sheet.test.jsx](../tests/balance-sheet.test.jsx), [ar-aging.test.jsx](../tests/ar-aging.test.jsx), [ap-aging.test.jsx](../tests/ap-aging.test.jsx), and [reports-navigation.test.jsx](../tests/reports-navigation.test.jsx): report data, states, date controls, reconciliation, and navigation.
- [api-client.test.js](../tests/api-client.test.js), [reports-api.test.js](../tests/reports-api.test.js), [money.test.js](../tests/money.test.js), [calendar-date.test.js](../tests/calendar-date.test.js), [auth-pages.test.jsx](../tests/auth-pages.test.jsx), [AuthContext.test.jsx](../tests/AuthContext.test.jsx), and [route-guard.test.jsx](../tests/route-guard.test.jsx): shared API behavior, formatting utilities, authentication screens/context, and route protection.

The full command `npm test -- --maxWorkers=1` reported **22 test files passed and 99 tests passed**. `npm run build`, ESLint on the changed React files, and `git diff --check` passed.

Not tested: a complete keyboard-only walkthrough of every dialog and tab, live backend behavior, server-side tenant isolation, and visual comparison of every page at 360px, 768px, and 1280px. The browser check measured no document-level horizontal overflow on the visible login preview at those widths; it did not cover all routes. The preview’s API/CORS connection also prevented authenticated visual review.

## 7. How to try it

1. Run `npm run dev` from the frontend repository and open `http://localhost:5173`.
2. With the API running and CORS configured for the frontend origin, sign in and open the dashboard, contacts, invoices, bills, reports, and journal pages.
3. Use **Refresh** on the dashboard and confirm that success or failure feedback appears through the top-right Sonner toast.
4. Open an account or contact form, and an invoice or bill payment/void dialog. Use Tab and Shift+Tab to move through controls, press Escape to close, and verify focus returns to the opener.
5. Visit an unknown path to see the branded 404. To see the render-error fallback, trigger a component render error in a local test fixture; no production route was added to force an error.
6. Repeat the viewport check at 360px, 768px, and 1280px. On tables, horizontal scrolling should remain within the table container.
7. Verify automated checks with `npm test`, `npm run build`, and `npx eslint src/App.jsx src/components/LoadingState.jsx src/components/EmptyState.jsx src/components/ErrorBoundary.jsx src/pages/NotFound.jsx`.

## 8. Decisions, trade-offs, and limitations

- The loading skeleton is shared across data views; the dashboard keeps its more detailed existing skeleton layout.
- The empty state supports an optional description and action area; current pages use it without inventing actions or records.
- Radix dialogs replace custom modal wrappers but keep the same form state, API calls, and submit handlers. Native browser confirmations for existing delete/deactivate actions remain unchanged.
- The dashboard’s existing custom toast was removed in favor of the already-installed Sonner package. The app-level `Toaster` lives in [App.jsx](../src/App.jsx#L113), allowing tests that render the app to observe it too. The journal’s existing success message remains an inline status, not a toast.
- The favicon was present already, so it was updated rather than replaced. The login page and all other routes keep their existing title mappings in [App.jsx](../src/App.jsx#L30-L62).
- No new package, backend endpoint, or database object was added.
- The API was not reachable from the preview due to the local connection/CORS issue. Full visual and keyboard review remains outstanding.

## 9. Examiner questions and short answers

1. **What does the loading skeleton improve?** It provides a consistent visual placeholder and announces the loading label to assistive technology.
2. **How does the empty state differ from an error?** Empty means the request succeeded but returned no rows; error remains a separate alert with the server/request message.
3. **What does Radix provide for dialogs?** Keyboard focus handling, Escape dismissal, and dialog semantics; the existing submit handlers still determine what the app does.
4. **Did this change accounting calculations?** No. It changed presentation only; existing integer-cent calculations and API figures remain.
5. **What remains unverified?** Backend behavior and the full route-by-route visual, contrast, and keyboard review.

**60-second presentation script:**  
“Stage 8 finishes the interface with shared loading skeletons and empty states. Loading text is announced to assistive technology, and the skeleton animation respects reduced-motion settings. I restyled the 404 and unexpected-error screens, kept route-specific page titles, and adjusted the existing folded-page favicon to use the yellow brand accent. Contact, account, invoice, and bill dialogs now use the existing Radix component, which adds keyboard focus management without changing their API actions or form logic. Dashboard refresh messages now use Sonner. No backend, database, or money calculations changed. The full frontend suite passed with 22 files and 99 tests, and the production build and targeted lint passed. The live API and a complete visual review of every route are still not verified.”

## 10. Three ways to verify the claims

1. `rg -n "LoadingState|EmptyState|toast.success|toast.error" src/App.jsx src/pages src/components`
2. `rg -n "<Dialog|DialogDescription|<Toaster|PAGE_TITLES|document.title" src/App.jsx src/pages`
3. `npm test -- --maxWorkers=1 && npm run build`
