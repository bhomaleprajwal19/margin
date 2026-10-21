import django
from django.conf import settings
from django.db import models
from django.utils import timezone


class Project(models.Model):
    class Color(models.TextChoices):
        VERMILION = "vermilion"
        INK = "ink"
        MOSS = "moss"
        OCHRE = "ochre"
        SLATE = "slate"
        PLUM = "plum"

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="projects"
    )
    name = models.CharField(max_length=80)
    description = models.TextField(blank=True)
    color = models.CharField(max_length=16, choices=Color.choices, default=Color.VERMILION)
    archived = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["archived", "-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["owner", "name"], name="unique_project_name_per_owner")
        ]

    def __str__(self):
        return self.name


class Task(models.Model):
    class Status(models.TextChoices):
        TODO = "todo", "To do"
        DOING = "doing", "Doing"
        DONE = "done", "Done"

    class Priority(models.IntegerChoices):
        LOW = 1, "Low"
        MEDIUM = 2, "Medium"
        HIGH = 3, "High"

    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name="tasks")
    title = models.CharField(max_length=160)
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.TODO)
    priority = models.PositiveSmallIntegerField(choices=Priority.choices, default=Priority.MEDIUM)
    due_date = models.DateField(null=True, blank=True)
    position = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["status", "position", "-priority", "created_at"]
        indexes = [models.Index(fields=["project", "status", "position"])]
        constraints = [
            models.CheckConstraint(
                name="task_priority_range",
                # Django 5.1 renamed check= to condition=; support both (4.2 runs on Python 3.9)
                **{
                    "condition" if django.VERSION >= (5, 1) else "check": models.Q(
                        priority__gte=1, priority__lte=3
                    )
                },
            )
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        # completed_at follows status so "done this week" stats stay accurate
        if self.status == self.Status.DONE and self.completed_at is None:
            self.completed_at = timezone.now()
        elif self.status != self.Status.DONE:
            self.completed_at = None
        super().save(*args, **kwargs)

    @property
    def is_overdue(self):
        return (
            self.due_date is not None
            and self.status != self.Status.DONE
            and self.due_date < timezone.localdate()
        )
