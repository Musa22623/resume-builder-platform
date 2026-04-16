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

- `/api/auth/`
- `/api/resumes/`
- `/api/jobs/`
- `/api/ai/`
- `/api/billing/`
- `/api/admin/`

## Notes

- OpenAI key stays backend-only (`OPENAI_API_KEY`).
- Resume AI optimizer is guarded to preserve factual data.
- Trial/subscription gate implemented via `HasActiveAccess`.
- Billing is gateway-placeholder and Stripe-ready via `Payment` + `SubscriptionPlan` models.
