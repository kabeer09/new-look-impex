# Deployment (Vercel + Render + Supabase + Docker)

## Vercel (frontend)
- Root directory: `frontend`. Build: `npm run build`. Env: `NEXT_PUBLIC_API_URL=https://<backend>`.

## Render (backend)
- Option A (Docker): Dockerfile.backend. Option B (native): Build `pip install -r backend/requirements.txt`, Start `uvicorn app.main:app --host 0.0.0.0 --port $PORT` with `PYTHONPATH=backend`.
- Env: `DATABASE_URL` (Supabase), `SECRET_KEY`, `ADMIN_EMAIL/ADMIN_PASSWORD`, `CORS_ORIGINS=https://<vercel-app>`, Google + LLM vars as needed.

## Supabase (Postgres)
- Create project → copy `postgresql://...` pooled URL → `DATABASE_URL=postgresql+psycopg2://...`.
- Tables auto-create on startup (`Base.metadata.create_all`). For production change control use Alembic: `python -m alembic -c backend/alembic.ini upgrade head` (initial revision `0001_initial` mirrors all models).

## Docker local
```powershell
docker compose up --build
# frontend :3000, backend :8000, postgres :5432
```
