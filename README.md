# Resume Builder Platform MVP

Production-minded monorepo MVP for:
- Web app (`frontend`, React + Vite)
- Backend API (`backend`, Django + DRF + PostgreSQL)
- Desktop app (`desktop`, Electron as API client)

## Run with Docker

1. Copy `.env.example` values as needed.
2. Start:

```bash
docker compose up --build
```

Services:
- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Backend API Groups

- `/api/v1/auth/`
- `/api/v1/resumes/`
- `/api/v1/jobs/`
- `/api/v1/ai/`
- `/api/v1/billing/`
- `/api/v1/admin/`
- `/api/v1/support/`

## Notes

- OpenAI key stays backend-only (`OPENAI_API_KEY`).
- Resume AI optimizer is guarded to preserve factual data.
- Trial/subscription gate implemented via `HasActiveAccess`.
- Billing is gateway-placeholder and Stripe-ready via `Payment` + `SubscriptionPlan` models.

## Env Files

- add .env file to /
POSTGRES_DB=resume_builder
POSTGRES_USER=resume_username
POSTGRES_PASSWORD=resume_password
POSTGRES_HOST=localhost
POSTGRES_PORT=5433

- add .env.docker file to /apps/backend
DJANGO_SECRET_KEY=django-insecure-dev-secret-key-2026-super-long-1234567890
DJANGO_DEBUG=1
DJANGO_ALLOWED_HOSTS=localhost,127.0.0.1
POSTGRES_HOST=db
POSTGRES_PORT=5432
OPENAI_API_KEY=sk-proj-...
STRIPE_SUCCESS_URL=http://localhost:5173/payment?status=success
STRIPE_CANCEL_URL=http://localhost:5173/payment?status=cancel
GOOGLE_OAUTH_WEB_CLIENT_ID=131885...apps.googleusercontent.com
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_a1...
NEXT_PUBLIC_STRIPE_KEY=pk_test_..
EMAIL_HOST_USER=mailname@gmail.com #Gmail User
EMAIL_HOST_PASSWORD=abcde..        #Gmail 2-Step password

- add .env.docker file to /apps/frontend
VITE_APP_NAME=Resume Builder
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=13188562...apps.googleusercontent.com #GOOGLE_CLIENT_AUTH_ID
