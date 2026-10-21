import os
import secrets
from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone

from apps.projects.models import Project, Task

User = get_user_model()

DEMO = {
    ("Website redesign", "ink", "New landing page and pricing section."): [
        ("Write the About page copy", "done", 2, -6),
        ("Pick a typeface pairing", "done", 1, -4),
        ("Build the pricing table", "doing", 3, 1),
        ("Compress and lazy-load images", "todo", 2, 5),
        ("Set up custom domain + HTTPS", "todo", 3, -1),
    ],
    ("Product launch", "vermilion", "Everything that has to happen before release day."): [
        ("Draft the release notes", "done", 2, -2),
        ("Final QA pass on the sign-up flow", "doing", 3, 0),
        ("Schedule the announcement email", "todo", 3, 2),
        ("Prepare support answers for the FAQ", "todo", 1, 6),
    ],
    ("Home & admin", "moss", ""): [
        ("Renew bike insurance", "todo", 2, -3),
        ("Book dentist", "todo", 1, 10),
        ("Sort tax documents", "done", 2, -9),
    ],
}


class Command(BaseCommand):
    help = (
        "Create a 'demo' user with sample projects and tasks. The password is DEMO_PASSWORD "
        "if set, otherwise a random one that is printed once when the user is created."
    )

    def handle(self, *args, **options):
        user, created = User.objects.get_or_create(
            username="demo", defaults={"email": "demo@example.com", "first_name": "Demo"}
        )
        password = os.environ.get("DEMO_PASSWORD")
        if password or created:
            password = password or secrets.token_urlsafe(9)
            user.set_password(password)
            user.save()
            if created and not os.environ.get("DEMO_PASSWORD"):
                self.stdout.write(f"Created user 'demo' with password: {password}")
        user.projects.all().delete()

        today = timezone.localdate()
        now = timezone.now()
        for (name, color, description), tasks in DEMO.items():
            project = Project.objects.create(
                owner=user, name=name, color=color, description=description
            )
            positions = {"todo": 0, "doing": 0, "done": 0}
            for title, status, priority, due in tasks:
                task = Task.objects.create(
                    project=project,
                    title=title,
                    status=status,
                    priority=priority,
                    due_date=today + timedelta(days=due),
                    position=positions[status],
                )
                positions[status] += 1
                if status == "done":
                    # spread completions across recent days so the activity chart has shape
                    Task.objects.filter(pk=task.pk).update(
                        completed_at=now - timedelta(days=abs(due) % 7)
                    )

        self.stdout.write(self.style.SUCCESS("Demo data ready for user 'demo'."))
