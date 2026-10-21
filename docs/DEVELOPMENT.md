# Development guide

Setup, deployment and API reference for Margin.

## Project structure

```
margin/
├── backend/
│   ├── config/
│   │   ├── settings/        base.py, dev.py, test.py, prod.py
│   │   └── urls.py          API routes, plus the built React app in production
│   ├── apps/
│   │   ├── accounts/        register, login, logout, me (+ tests)
│   │   └── projects/        Project and Task models, viewsets, dashboard, seed_demo (+ tests)
│   ├── entrypoint.sh        production start: migrate, then gunicorn
│   └── requirements*.txt
├── frontend/
│   └── src/
│       ├── api/             fetch wrapper and endpoint helpers
│       ├── auth/            auth context and route guard
│       ├── components/      layout, task card, dialogs, chart
│       ├── pages/           sign in, overview, project board
│       ├── lib/             date helpers, hooks, constants
│       └── styles/          tokens.css (design tokens), base.css, app.css
├── Dockerfile               builds React, then a Django image that serves both
├── docker-compose.yml       app + MySQL 8, for trying the production setup locally
├── render.yaml              Render blueprint
└── .github/workflows/       CI
```

## Run it locally

You need Python 3.9+ and Node 20+.

```bash
git clone <this-repo-url> margin
cd margin
make setup        # virtualenv, dependencies, database, sample data, npm install
make backend      # terminal 1: http://127.0.0.1:8000
make frontend     # terminal 2: http://localhost:5173
```

`make setup` creates a `demo` user with sample projects. Its password is random and printed once during setup. You can also just register your own account on the sign-in page. To choose the demo password yourself, set `DEMO_PASSWORD` and run `python manage.py seed_demo` again.

Without `make`:

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py runserver

# second terminal
cd frontend
npm install
npm run dev
```

In development Vite proxies `/api` to Django, so no CORS setup is needed.

### Using MySQL or PostgreSQL

Set `DATABASE_URL` in `backend/.env`, install the driver, and migrate:

```bash
pip install mysqlclient          # or: pip install "psycopg[binary]"
# DATABASE_URL=mysql://user:password@127.0.0.1:3306/margin
# DATABASE_URL=postgres://user:password@127.0.0.1:5432/margin
python manage.py migrate
```

## Tests and linting

```bash
make test    # Django tests (25) and Vitest
make lint    # Ruff and ESLint
```

CI runs the same checks on every push and pull request. The backend tests run against MySQL 8 and on Python 3.9, the production settings go through `manage.py check --deploy`, and the Docker image is built and smoke-tested.

## Deploy

The production image is one container: Vite builds the React app, Django serves it next to the API through WhiteNoise, and gunicorn runs it. That gives you one URL and no CORS configuration.

**Try the production setup locally (needs Docker):**

```bash
docker compose up --build    # http://localhost:8000
```

**Render:** push the repository to GitHub, then in Render choose **New, Blueprint**, select the repo and apply. `render.yaml` creates a PostgreSQL database and the web service, generates the secret key and connects the database.

**Any other Docker host** needs these environment variables:

| Variable | Purpose |
| --- | --- |
| `DJANGO_SECRET_KEY` | Required. A long random string. The app refuses to start without it. |
| `DATABASE_URL` | Required. For example `postgres://...` or `mysql://...` |
| `DJANGO_ALLOWED_HOSTS` | Your domain(s), comma separated |
| `CSRF_TRUSTED_ORIGINS` | Your site's origin, for example `https://margin.example.com` |
| `PORT` | Set by most platforms. Defaults to 8000 |
| `DJANGO_ADMIN_URL` | Optional. Move the admin away from `/admin/` |
| `AUTH_TOKEN_TTL_HOURS` | Optional. How long a login lasts (default 168) |
| `WEB_CONCURRENCY` | Optional. Number of gunicorn workers |
| `SEED_DEMO`, `DEMO_PASSWORD` | Optional. Loads a `demo` user with sample data. Set the password as a secret in your platform, never in a file |

Keep secrets in your hosting platform's environment settings. `.env` files are git-ignored and must never be committed.

## Production notes

- Login tokens expire, and logging out deletes the token. An expired session returns to the sign-in page with a message.
- Rate limits: 10 sign-in or register attempts per minute per client, plus general API limits. The counters live in the database cache, so they hold across workers.
- HTTPS redirect, secure cookies, HSTS, `nosniff` and `X-Frame-Options: DENY` are on in production.
- `/api/health/` checks the database and returns 503 if it is unreachable. The Docker image has a matching `HEALTHCHECK`.
- The container runs as a non-root user. Hashed frontend files are served with a one-year cache.
- The database enforces valid task priorities, not only the API.
- A React error boundary shows a reload screen instead of a blank page.

## API

All endpoints live under `/api/`. Everything except register and login needs the header `Authorization: Token <key>`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/auth/register/` | Create an account, returns `{token, user}` |
| POST | `/auth/login/` | Sign in, returns `{token, user}` |
| POST | `/auth/logout/` | Revoke the token |
| GET, PATCH | `/auth/me/` | Current user |
| GET, POST | `/projects/` | List (with task counts) or create |
| GET, PATCH, DELETE | `/projects/:id/` | Read, update or delete |
| GET, POST | `/tasks/?project=&status=&due=overdue\|week&search=` | Filtered list or create |
| GET, PATCH, DELETE | `/tasks/:id/` | Read, update or delete |
| POST | `/tasks/:id/move/` | `{status, position}`: move between columns and reorder |
| GET | `/dashboard/` | Counts, upcoming tasks, 14-day activity |
| GET | `/health/` | Health check for load balancers |
