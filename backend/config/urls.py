from django.conf import settings
from django.contrib import admin
from django.db import connection
from django.http import FileResponse, Http404, JsonResponse
from django.urls import include, path, re_path


def health(_request):
    """Used by Docker/Render health checks. Fails if the database can't be reached."""
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        return JsonResponse({"status": "error", "database": "unreachable"}, status=503)
    return JsonResponse({"status": "ok"})


def spa(_request):
    """Return the React app's index.html so client-side routes like /projects/3 work."""
    index = settings.FRONTEND_DIST / "index.html"
    if not index.exists():
        raise Http404("Frontend not built. Run `npm run build` in frontend/.")
    return FileResponse(index.open("rb"), content_type="text/html")


urlpatterns = [
    path(settings.ADMIN_URL, admin.site.urls),
    path("api/health/", health),
    path("api/auth/", include("apps.accounts.urls")),
    path("api/", include("apps.projects.urls")),
    re_path(rf"^(?!api/|{settings.ADMIN_URL}|static/).*$", spa),
]
