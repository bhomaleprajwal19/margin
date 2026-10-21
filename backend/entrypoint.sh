#!/bin/sh
# Production start: apply migrations, create the cache table, optionally load demo data (needs DEMO_PASSWORD), then serve.
set -e
python manage.py migrate --noinput
python manage.py createcachetable
if [ "$SEED_DEMO" = "1" ]; then
  python manage.py seed_demo
fi
exec gunicorn config.wsgi:application -c gunicorn.conf.py
