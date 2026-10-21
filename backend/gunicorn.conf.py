"""Gunicorn settings for production. Every value can be overridden with an env var."""

import multiprocessing
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8000')}"
workers = int(os.environ.get("WEB_CONCURRENCY", min(multiprocessing.cpu_count() * 2 + 1, 4)))
timeout = int(os.environ.get("GUNICORN_TIMEOUT", "30"))
graceful_timeout = 20
keepalive = 5
# recycle workers now and then so a slow memory leak can't take the service down
max_requests = 1000
max_requests_jitter = 100
# trust X-Forwarded-* from the platform's load balancer (Render, Railway, etc.)
forwarded_allow_ips = "*"
accesslog = "-"
errorlog = "-"
