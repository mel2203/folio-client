# Stage 5 — Journal and chart of accounts UI

## 1. Summary

This stage restyles the journal list, manual journal-entry form, journal-entry detail, and chart of accounts to use the Folio redesign components and styles. The existing routes, API calls, validation, integer-cent totals, pagination, account actions, and form submission behavior remain in place. The journal list response used by this client exposes entry date, memo, and status; its lines are fetched by the detail request. The account list response used here has no balance amount. This stage does not add API calls or calculate missing figures, so the list has no fabricated source/line data and the account table has no fabricated balance column. No backend route, validator, controller, service, SQL, database table, or migration was changed or verified.

## 2. One request, end to end

For the journal list, [App.jsx](../src/App.jsx#L86) maps `/journal` to `JournalList`. The page calls the existing `listJournalEntries` function and applies its current filters and pagination in [JournalList.jsx](../src/pages/JournalList.jsx#L20-L105). That function builds the URL query and calls `/api/journal-entries` through the shared request wrapper in [journal.js](../src/api/journal.js#L3-L13) and [client.js](../src/api/client.js#L24-L50). The response the client consumes is `{ data, meta: { page, limit, total } }`; this shape is validated by the page and exercised by [journal-pages.test.jsx](../tests/journal-pages.test.jsx#L49-L89). Each returned entry is now rendered as a panel in [JournalList.jsx](../src/pages/JournalList.jsx#L188-L214).

The server-side route definition, validator, controller, service, SQL, and live HTTP response were not inspected for this frontend-only restyle. Those server details are **not verified** here.

## 3. Journal entries created by this stage

The styling changes and test runs did not create any journal entries. No accounting transaction was run.

| Event | Debit account | Credit account | Worked example | Statements changed |
|---|---|---|---|---|
| None | — | — | No entry was created by this stage | None |

The existing form still submits through the current `createJournalEntry` call; it was not invoked against a server or database during this stage.

## 4. New tables and columns

None. This is a frontend presentation change. No database or API schema was altered.

## 5. Data rules and where they apply

| Rule | Current enforcement and stage status |
|---|---|
| Amounts use integer cents in the form balance check | Existing logic in [JournalNew.jsx](../src/pages/JournalNew.jsx#L48-L63) and [JournalNew.jsx](../src/pages/JournalNew.jsx#L127-L147) was retained. |
| More than two decimal places are rejected | Existing amount parsing and inline field validation in [JournalNew.jsx](../src/pages/JournalNew.jsx#L48-L63) and [JournalNew.jsx](../src/pages/JournalNew.jsx#L300-L389) were retained. |
| Debits and credits must balance before the form can submit | Existing `canSubmit` and `isBalanced` checks in [JournalNew.jsx](../src/pages/JournalNew.jsx#L127-L155) were retained. The form’s balanced/unbalanced appearance is in [JournalNew.css](../src/pages/JournalNew.css#L119-L160). |
| The server remains authoritative for accounting rules | The client still displays server errors from the existing submit flow in [JournalNew.jsx](../src/pages/JournalNew.jsx#L199-L221) and [JournalNew.jsx](../src/pages/JournalNew.jsx#L431-L447). Backend enforcement was not verified. |
| Posted journal entries are immutable | No journal mutation behavior or server code was changed. Server enforcement was not verified in this stage. |
| Company/tenant isolation | No API or server logic was changed. Tenant isolation was not verified in this stage. |
| Account balances must come from the API, not a new client-side calculation | The current account table uses fields from the account response and does not add a balance calculation; see [Accounts.jsx](../src/pages/Accounts.jsx#L230-L286) and the existing fixtures in [accounts.test.jsx](../tests/accounts.test.jsx#L12-L45). |

## 6. Tests and what is not tested

No tests or assertions were edited.

- [journal-pages.test.jsx](../tests/journal-pages.test.jsx#L49-L172) checks list rendering/navigation, URL filters, server pagination, loading/empty/error states, and request failures.
- [journal-pages.test.jsx](../tests/journal-pages.test.jsx#L175-L239) checks integer-cent detail totals, the balanced status, not-found handling, and detail loading.
- [journal-new.test.jsx](../tests/journal-new.test.jsx#L93-L217) checks active-account selection, balance gating, decimal-place validation, canonical two-decimal payloads, and successful navigation.
- [journal-new.test.jsx](../tests/journal-new.test.jsx#L219-L254) checks server validation details and the two-line minimum.
- [accounts.test.jsx](../tests/accounts.test.jsx#L52-L178) checks account grouping, active/inactive filtering, loading/empty/error states, form validation, server errors, and confirmation before deactivation.

The whole frontend suite was run with `npm test -- --maxWorkers=1`: 22 test files passed and 99 tests passed. `npm run build`, targeted ESLint for the four changed page components, and `git diff --check` also passed. A visual browser comparison was **not verified**. No live backend responses, server-side accounting enforcement, database isolation, or database writes were tested in this stage.

## 7. How to try it

1. Start the backend using its normal local development procedure, if you want live data. The backend was not started or changed for this stage.
2. From the frontend repository, run `npm run dev`.
3. Sign in using a development account.
4. In the Folio sidebar, open **Journal**. Compare the panel-based entry rows and filters to the demo.
5. Open an entry to compare its detail panel and ledger table.
6. Choose **New entry** to compare the line grid, add/remove controls, live totals, and disabled-until-valid submit button. Do not submit unless you intend to create an entry in the backend environment you are using.
7. Open **Chart of accounts** to compare the account-type panels, ledger tables, System badges, and inactive-row treatment.

Expected: the existing entries and accounts render with the redesigned panels, typography, table rules, and controls; filters, navigation, and account actions continue to behave as before.

## 8. Decisions, trade-offs, and limitations

- The journal list is now panel-based, but the client’s tested list response does not contain journal lines or a source field. Adding a second request per entry or guessing a source property would change behavior or assume an API shape, so neither was done. Lines remain on the existing detail page.
- The account response used by the UI and its tests contains `normalBalance`, `parentId`, `isActive`, and `systemRole`, but no balance amount. The restyle keeps the existing Parent column and does not calculate balances in the browser.
- The accounts add/edit dialog keeps its existing implementation and behavior; only its appearance changed.
- The local API server and the modified screens were not visually verified in a browser.

## 9. Examiner questions and short answers

1. **Did this stage change how journal entries are posted?** No. It changed presentation only; the existing submit handler still calls the same API function.
2. **How does the form decide whether an entry balances?** It converts amount strings to cents, sums the debit and credit cents, and enables submission only when valid totals match.
3. **Why are there no debit and credit lines on each journal-list panel?** The list response used by this frontend does not provide lines. The detail page uses the existing detail request for those lines.
4. **Why is there no account balance column?** The current account response does not provide a balance, and this stage must not invent one or add client-side accounting calculations.
5. **Were tenant isolation and immutability tested here?** No. Those rules are server-side and this stage did not change or test backend code.

**60-second presentation:** “Stage 5 restyles the journal and chart-of-accounts screens without changing their accounting behavior. Journal entries appear in panels, the entry form uses a responsive twelve-column line layout with add and remove controls, and the detail page uses the shared ledger-table style. The form continues to use integer cents for its balance check and still requires at least two valid balanced lines before it can submit. Accounts are grouped in panels, with system badges and inactive labels. I did not add fields the current API does not provide: journal lines stay on the detail page, and account balances are not calculated in the client. The journal, accounts, and form tests passed, as did the full suite and production build. Backend enforcement and a live visual check were not verified.”

## 10. Three ways to check these claims

1. Run `npm test -- --maxWorkers=1` to execute the frontend tests.
2. Run `rg -n "parseAmountToCents|isBalanced|canSubmit" src/pages/JournalNew.jsx` to inspect the existing cents-based balance gate.
3. Run `rg -n "journal-entry-list|ledger-table|accounts-group|accounts-table" src/pages/JournalList.jsx src/pages/JournalDetail.jsx src/pages/Accounts.jsx` to inspect the new presentation structure.
