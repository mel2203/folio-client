# Folio Architecture Proposal

## 1. Overview
Folio is a small-business accounting and invoicing app for Malaysian users. The system should be easy to deploy, simple to maintain, and safe enough for financial data. The solution uses a split frontend and API architecture so the UI can stay responsive while the accounting logic stays in one trusted backend.

## 2. Recommended Stack
- Frontend: React + Vite + JavaScript
  - Simple SPA for dashboard, journal, accounts, and auth screens
  - Uses React Router for page flow and fetch for API calls
  - CSS variables and custom components keep the design consistent with the brand system
- Backend: Node.js + Express
  - REST API for authentication, journals, accounts, and reporting endpoints
  - Keeps business rules in one place, such as double-entry validation and ledger checks
- Database: PostgreSQL
  - Financial data needs transactions, constraints, and reliable reporting
  - Good fit for accounting integrity and multi-tenant company data
- Dev tooling: GitHub + Vercel/Render + PostgreSQL managed service
  - Keeps CI/CD simple and suitable for a small team

## 3. Deployment Architecture
- Frontend deploys to Vercel
  - Fast static hosting for the React app
  - Environment variable: `VITE_API_URL`
  - Automatic builds from the main branch
- Backend deploys to Render or Railway
  - Runs as a containerized Node.js service
  - Exposes a single API base URL for the frontend
- Database runs in a managed PostgreSQL service
  - Separate from app servers for clearer security boundaries
  - Backups, restarts, and connection pooling are handled by the provider
- Production flow
  1. code pushed to GitHub
  2. CI runs lint/test checks
  3. frontend deploys to Vercel
  4. backend deploys to the API host
  5. database remains managed and isolated

## 4. Authentication and Authorisation
- Use JWT-based authentication for API access
- Passwords are hashed with bcrypt (cost 12) before storage
- Access tokens are verified on each protected request using HS256
- The backend loads the authenticated user and derives the company context from the user record, never from client input
- Public endpoints: health check, register, and login
- Protected routes require a valid token before access is granted
- Auth endpoints are rate limited in production; rate limiting is disabled only for tests
- On a 401, the client clears local auth state and redirects to `/login`

## 5. Trade-offs and Design Decisions
- Why this stack?
  - React and Vite are fast to build and fit the current front-end team
  - Express + PostgreSQL is simple, familiar, and strong for accounting logic
  - A separate API keeps business validation and company scoping away from the UI
- Trade-offs
  - Split services add operational complexity compared to a monolith
  - JWT is easy to implement but requires careful token expiry and rotation strategy
  - Local storage is simpler for a small app, but cookies with secure flags are safer for production
  - A managed Postgres database adds cost, but it reduces operational risk for financial data
- Why not a heavier enterprise stack?
  - This project does not need a full microservice architecture or heavy framework overhead at this stage
  - Simpler architecture reduces delivery time and makes the accounting rules easier to explain to students and reviewers

## 6. Instructor Review Notes
This proposal is intentionally lean and suitable for a small business accounting tool in a teaching context. It balances correctness, maintainability, and deployment simplicity while keeping the system aligned with the accounting rules already defined for the project.

If you want a stricter production posture later, the next step would be moving auth tokens to secure HttpOnly cookies and introducing refresh-token rotation.
