from django.contrib import admin

from .models import Project, Task


class TaskInline(admin.TabularInline):
    model = Task
    extra = 0
    fields = ["title", "status", "priority", "due_date", "position"]


@admin.register(Project)
class ProjectAdmin(admin.ModelAdmin):
    list_display = ["name", "owner", "color", "archived", "updated_at"]
    list_filter = ["archived", "color"]
    search_fields = ["name", "owner__username"]
    inlines = [TaskInline]


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ["title", "project", "status", "priority", "due_date"]
    list_filter = ["status", "priority"]
    search_fields = ["title", "notes"]
