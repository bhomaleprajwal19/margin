# ---- 1. build the React app ----
FROM node:25-alpine AS frontend
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- 2. build Python wheels (compilers stay in this stage) ----
FROM python:3.12-slim AS wheels
RUN apt-get update \
 && apt-get install -y --no-install-recommends gcc pkg-config default-libmysqlclient-dev \
 && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt backend/requirements-prod.txt ./
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements-prod.txt

# ---- 3. runtime image: Django serves the API and the built frontend ----
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    DJANGO_SETTINGS_MODULE=config.settings.prod \
    PORT=8000

# only the MySQL client library is needed at runtime
RUN apt-get update \
 && apt-get install -y --no-install-recommends libmariadb3 \
 && rm -rf /var/lib/apt/lists/*

COPY --from=wheels /wheels /wheels
RUN pip install --no-index /wheels/* && rm -rf /wheels

WORKDIR /app
COPY backend/ ./
COPY --from=frontend /frontend/dist ./frontend_dist

# collectstatic needs a secret key to import settings; this one is never used at runtime
RUN DJANGO_SECRET_KEY=build-only-not-secret python manage.py collectstatic --noinput

RUN useradd --create-home --uid 10001 margin && chown -R margin /app
USER margin

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\",\"8000\")}/api/health/', timeout=4)"
CMD ["sh", "./entrypoint.sh"]
