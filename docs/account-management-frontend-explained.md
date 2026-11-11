# Account management frontend — explained

## 1. Summary

The Chart of Accounts page now supports creating and editing accounts, filtering active and inactive accounts, and confirming deactivate/reactivate actions. Role accounts show a System badge and do not show a status action. The journal entry form now excludes inactive accounts from its picker. The frontend calls the account API through the existing request wrapper; the backend owns the accounting rules and data checks.

## 2. One request from the page to the database and back

For example, loading the Chart of Accounts calls `getAccounts()` in [src/api/accounts.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/api/accounts.js:3), which uses the shared request wrapper to GET `/api/accounts`. The page reads the returned array and renders it in [src/pages/Accounts.jsx](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Frontend/folio-frontend/src/pages/Accounts.jsx:54). In the backend, [src/routes/account.routes.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/routes/account.routes.js:16) attaches the list validator and controller. [src/validators/account.validator.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/validators/account.validator.js:16) accepts an optional `active=true|false` query. [src/controllers/account.controller.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/controllers/account.controller.js:8) passes the authenticated company ID to [src/services/account.service.js](/Users/lyanafareeha/Desktop/CODING/Bootcamp/Folio/Folio%20-%20Backend/src/services/account.service.js:25). Its parameterized SQL selects that company's accounts, optionally filters active state, and returns camelCase fields. The controller sends `{ "data": [...] }`; the existing client wrapper unwraps `data` for the page.

Create and update use the same route → validator → controller → service pattern. The frontend form validation is in `Accounts.jsx` lines 15–38 and its submit flow in lines 113–153. The server remains authoritative for duplicate codes, parent ownership/type, cycle prevention, role protection, and posted-balance rules.

## 3. Journal entries created by this stage

| Event | Debit account | Credit account | Example amount | Statements changed |
|---|---|---|---:|---|
| None | — | — | — | None; account maintenance does not post journal entries. |

## 4. New tables and columns

This frontend stage adds no tables or columns. It consumes the backend account fields `type`, `normalBalance`, `parentId`, `isActive`, and `systemRole`. The backend schema addition for `system_role` was completed in the preceding backend stage; no frontend schema or migration was added here.

## 5. Data protection rules

| Rule | Where it is enforced |
|---|---|
| Account code is 4–8 digits and name is required, at most 100 characters | Client feedback: `Accounts.jsx` lines 15–25. Server validation: backend `src/validators/account.validator.js` lines 3–10. |
| Type cannot be edited | The edit form renders code/name/parent only; its submit payload contains no type (`Accounts.jsx` lines 120–137). The server PATCH schema also has no type field (backend validator lines 35–46). |
| Parent must be same-company and same-type; no self-parent or cycle | Server service (`account.service.js` lines 43–56, 74–99, 132–141). |
| Role accounts cannot be deactivated; an account with a nonzero posted balance cannot be deactivated | Server service (`account.service.js` lines 101–115, 143–149). UI hides status action for role accounts (`Accounts.jsx` around line 279), while the server still enforces the rule. |
| Deactivation/reactivation requires confirmation | `Accounts.jsx` lines 155–167. |
| Inactive accounts stay out of new journal entry selections | `JournalNew.jsx` lines 306–320 checks `account.isActive`. The backend also validates journal posting. |
| Company isolation and parameterized SQL | Backend controller passes `req.companyId`; account service list and update queries filter by company ID (`account.service.js` lines 25–38, 118–124). |
| Historical account data is retained | This UI offers no delete action. The backend supports only GET, POST and PATCH account routes (`account.routes.js` lines 16–18). |

## 6. Tests and verification

`tests/accounts.test.jsx` covers display fields and System badge, active/inactive filtering, empty and error states, client validation, valid create payload, server validation errors, and cancel/confirm deactivation behavior (notably lines 76–182). `tests/journal-new.test.jsx` now supplies active and inactive account fixtures so the journal page can exercise the updated API field names.

Ran `npx vitest run tests/accounts.test.jsx tests/journal-new.test.jsx`: **2 files passed, 17 tests passed**. Ran `npm run build`: **passed**. Ran `npm run lint`: **passed**. The full `npm test` run had **13 of 14 files and 69 of 70 tests passing**; the remaining pre-existing report-navigation test expects the date `09/11/2026`, while the app's current-date default is `11/11/2026`. I did not change that unrelated test. No browser-driven manual test was run.

## 7. How to try it

1. Start the backend and frontend using the commands in their READMEs, then sign in.
2. Open **Chart of accounts** in the sidebar and click **Add account**.
3. Submit with blank or malformed code/name to see inline validation. Enter a 4–8 digit code, a name, choose a type, and optionally choose a parent of the same type; click **Create account**.
4. Choose **Edit** on a regular account to change its code, name, or parent. There is no type selector in edit mode.
5. Choose **Deactivate** or **Reactivate**. Cancel the browser confirmation to leave the record unchanged, or confirm to send the PATCH request.
6. Use the **Show** filter to view all, active, or inactive accounts. Role accounts show **System** and have no deactivate/reactivate control.
7. Start a new journal entry and inspect an account dropdown. Inactive accounts should not appear.

Expected API results are `{ "data": [...] }` for list, `{ "data": { ...account fields... } }` after create or update; validation and business-rule errors appear as the server's error message in the page.

## 8. Decisions and limitations

The UI uses the browser's native confirmation dialog for status changes. Client validation gives quick feedback, while server validation remains authoritative. Parent selection is filtered to the account's type in the form. Status changes refresh the account list so the active-state label and filter remain consistent. This stage does not add deletion, type changes, import, or new journal behavior. A duplicate code discovered by the server is shown as a server error; client-side duplicate detection is not attempted.

## 9. Examiner questions and a short presentation

1. **Where is the account actually created?** The page calls `createAccount`; backend service inserts it with parameterized SQL and derives the normal balance from type.
2. **Can a user change an account's type while editing?** No. The edit payload and backend PATCH schema do not include type.
3. **Why is the System badge not the only protection?** UI controls can be bypassed, so the backend rejects deactivation of a role account.
4. **Why hide inactive accounts in journal entry selection?** They should not be selected for new postings; the server also enforces posting eligibility.
5. **Does deactivation erase balances or history?** No. It changes active status only; accounts are not deleted and history remains available.

**60-second presentation:** “The Chart of Accounts page now supports creating and editing account details, filtering by status, and reactivating or deactivating accounts after confirmation. It shows system-role accounts with a badge and hides their status action. The journal entry form filters inactive accounts out of its picker. The frontend performs basic validation for fast feedback, then sends requests through the shared API client. The backend validates again, scopes queries to the authenticated company, and protects system accounts, account hierarchy, and posted balances. The UI never creates journal entries when maintaining the chart.”

## 10. Check the implementation yourself

From the frontend repository:

```bash
npm run lint
npx vitest run tests/accounts.test.jsx tests/journal-new.test.jsx
rg -n "function validateForm|window.confirm|account.isActive|getAccounts|createAccount|updateAccount" src/pages/Accounts.jsx src/pages/JournalNew.jsx src/api/accounts.js
```
