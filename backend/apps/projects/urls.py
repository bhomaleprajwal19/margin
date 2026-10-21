from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import ProjectViewSet, TaskViewSet, dashboard

router = DefaultRouter()
router.register("projects", ProjectViewSet, basename="project")
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [path("dashboard/", dashboard, name="dashboard"), *router.urls]
