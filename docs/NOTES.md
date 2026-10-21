# Design notes

Why some parts of the code are the way they are.

- **API shape:** resources (`/projects`, `/tasks`) plus one action endpoint, `/tasks/:id/move/`. Reordering updates several rows at once, so it doesn't fit a plain PATCH. It runs in a transaction with `select_for_update` and keeps positions dense.
- **Access control:** querysets are filtered by `request.user` at the root, so another user's objects return 404 rather than 403 and their existence isn't revealed. The task serializer also checks that the target project belongs to you. Tests cover both.
- **Database:** foreign keys with cascade, a unique constraint (project name per user), a check constraint on priority, and a composite index on `(project, status, position)` that matches the board query. Counts come from one annotated query instead of one query per project.
- **Configuration:** settings are split per environment, and a single `DATABASE_URL` switches between SQLite, MySQL and PostgreSQL without code changes.
- **Auth:** DRF tokens, subclassed so they expire. Login and register are throttled in their own scope, and the throttle counters use the database cache so every gunicorn worker shares them.
- **Frontend state:** a small API client turns DRF errors into field-level messages. Auth state lives in a context with a route guard. Board moves are applied optimistically, confirmed by the server, then reconciled.
- **Accessibility:** native `<dialog>` for focus handling, labelled controls, an index menu on mobile, and support for `prefers-reduced-motion` and `prefers-color-scheme`.
- **Delivery:** CI runs lint, tests on MySQL and Python 3.9, deploy checks and a Docker smoke test. The multi-stage image runs as a non-root user and applies migrations on start.
