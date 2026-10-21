import os

from .base import *  # noqa: F401,F403

DEBUG = False

if SECRET_KEY == "dev-only-insecure-key":  # noqa: F405
    raise RuntimeError("Set DJANGO_SECRET_KEY in production.")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_CONTENT_TYPE_NOSNIFF = True
CSRF_TRUSTED_ORIGINS = env_list("CSRF_TRUSTED_ORIGINS")  # noqa: F405
SECURE_SSL_REDIRECT = os.environ.get("DJANGO_SSL_REDIRECT", "1") == "1"
SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]
SECURE_HSTS_SECONDS = int(os.environ.get("DJANGO_HSTS_SECONDS", str(60 * 60 * 24)))
# HSTS covers only this host. Subdomain/preload HSTS is a per-domain decision, so it's opt-in.
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.environ.get("DJANGO_HSTS_SUBDOMAINS", "0") == "1"
SILENCED_SYSTEM_CHECKS = ["security.W021"]
if not SECURE_HSTS_INCLUDE_SUBDOMAINS:
    SILENCED_SYSTEM_CHECKS.append("security.W005")
SECURE_REFERRER_POLICY = "same-origin"
X_FRAME_OPTIONS = "DENY"
# container health checks call the app on localhost
ALLOWED_HOSTS += ["localhost", "127.0.0.1"]  # noqa: F405
# Serve the React build's root files (index.html, favicon, /assets/*) through WhiteNoise.
WHITENOISE_ROOT = FRONTEND_DIST if FRONTEND_DIST.exists() else None  # noqa: F405


def _vite_hashed(path, url):
    # Vite puts content-hashed files under /assets/, so browsers can cache them forever.
    return url.startswith("/assets/")


WHITENOISE_IMMUTABLE_FILE_TEST = _vite_hashed
# Rate limits are counted in the cache. The default per-process cache would give every
# gunicorn worker its own counter, so use the database (shared by all workers and instances).
CACHES = {
    "default": {
        "BACKEND": "django.core.cache.backends.db.DatabaseCache",
        "LOCATION": "django_cache",
    }
}
STORAGES = {
    "default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"},
}
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"plain": {"format": "%(asctime)s %(levelname)s %(name)s: %(message)s"}},
    "handlers": {"console": {"class": "logging.StreamHandler", "formatter": "plain"}},
    "root": {"handlers": ["console"], "level": os.environ.get("LOG_LEVEL", "INFO")},
    "loggers": {"django.request": {"level": "WARNING"}},
}
