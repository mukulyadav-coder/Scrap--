# ScrapSetu

ScrapSetu is a responsive marketplace web client with an authenticated FastAPI
backend for recyclable-material listings, offers, orders, and collection.

## Implemented

- Login, registration, session restoration, logout, and role-based dashboards.
- Public registration for Seller, Collector, Buyer, and Recycler. Admin accounts
  are provisioned only by the backend; public Admin registration is rejected.
- Authenticated listings, offers, offer acceptance, order settlement, rates,
  bulk requirements, verification review, admin complaint resolution, and
  collector inventory APIs.
- Server-side ownership and role checks for marketplace actions.
- Image upload to backend-local storage, with JPEG, PNG, and WebP validation.
- Demo cash/UPI settlement records only; the app does not move real money.

## Known limitations

- Forgot/reset-password delivery and password-change endpoints do not exist;
  the UI reports this instead of pretending a recovery request succeeded.
- Verification submission, complaint reporting, profile editing, and support
  ticket workflows are not yet connected to their backend APIs.
- Recycler accounts use the buyer/procurement dashboard; recycler-specific
  document workflows are not complete.
- Uploads are on local disk and served as static files. Use private object
  storage and an access-controlled delivery mechanism before production.
- The configured CSV store is suitable for local development and small pilots,
  not multi-instance production. PostgreSQL is not implemented, and no
  automated backup/restore workflow is included.
- Some dashboard analytics and market-facing copy are illustrative; they are
  not independently verified external data.
- The separate `server/` API on port 8000 is legacy and does not use the new
  ScrapSetu authentication or authorization. Keep it local/demo-only; do not
  expose it publicly.

## Local setup

### 1. Configure the authenticated backend

In PowerShell:

```powershell
cd scrapsetu\backend
Copy-Item .env.example .env
```

Set `JWT_SECRET` in `.env` to a unique random value of at least 32 characters.
To provision an initial administrator, set both `ADMIN_SEED_EMAIL` and
`ADMIN_SEED_PASSWORD` in this server-only file. The seed password must be at
least 12 characters, include an uppercase letter and a digit, and be no more
than 72 UTF-8 bytes. Never put these values in frontend code, README files, or
source control. There are no universal demo credentials; each deployment must
securely provision its own administrator.

Install dependencies and start the API:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
```

The API health check is `http://127.0.0.1:8001/api/health`; interactive API
documentation is available at `http://127.0.0.1:8001/docs`.

### 2. Start the web client

In another PowerShell window:

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` to the ScrapSetu backend at
`127.0.0.1:8001`. For a different backend origin, set `VITE_API_BASE_URL` to
the API base including `/api` (for example `https://api.example.com/api`) and
configure backend `CORS_ORIGINS` with the exact frontend origin.

### 3. Admin login

Use the email and password configured in the backend's `ADMIN_SEED_EMAIL` and
`ADMIN_SEED_PASSWORD` values. The server creates that account at startup. These
are deployment-specific credentials and are intentionally not included here.
For the existing local development setup, use only the credentials supplied
separately to the project owner; do not commit or copy the ignored
`scrapsetu/backend/.env` file.

## Deployment notes

- Serve the API through the same site as the web app, or a same-site reverse
  proxy. The refresh cookie is `HttpOnly` and `SameSite=Strict`; a cross-site
  frontend/API deployment will prevent reliable session restoration.
- Configure `CORS_ORIGINS`, `JWT_SECRET`, admin seed values, persistent CSV and
  upload directories, and HTTPS in the deployment environment.
- The Vite proxy is development-only. This repository does not include a
  production Vercel-to-backend rewrite or provision persistent backend storage.
- Do not deploy the legacy port-8000 service publicly until its endpoints have
  authentication, authorization, and production-safe CORS.
- Password reset, email/SMS delivery, production payment processing, durable
  object storage, and database migration/backups remain deployment/product
  work.

## Validation

```powershell
cd client
npm run build
npm run lint

cd ..\scrapsetu\backend
python -m pytest
```

The backend tests cover public roles, Admin registration rejection,
authentication/session behavior, listing ownership, offer acceptance, and
order settlement persistence.

See [scrapsetu/docs/architecture.md](scrapsetu/docs/architecture.md) for the
API and storage architecture.
