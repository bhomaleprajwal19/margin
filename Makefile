# Shortcuts. Run `make setup` once, then `make backend` and `make frontend` in two terminals.
PY := backend/.venv/bin/python

setup:
	cd backend && python3 -m venv .venv && .venv/bin/pip install --upgrade pip && .venv/bin/pip install -r requirements.txt ruff
	cd backend && [ -f .env ] || cp .env.example .env
	cd backend && .venv/bin/python manage.py migrate && .venv/bin/python manage.py seed_demo
	cd frontend && npm install

backend:
	cd backend && .venv/bin/python manage.py runserver

frontend:
	cd frontend && npm run dev

test:
	cd backend && DJANGO_SETTINGS_MODULE=config.settings.test .venv/bin/python manage.py test
	cd frontend && npm test

lint:
	cd backend && .venv/bin/ruff check . && .venv/bin/ruff format --check .
	cd frontend && npm run lint

docker:
	docker compose up --build

.PHONY: setup backend frontend test lint docker
