from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from .models import Project, Task

User = get_user_model()


class ProjectTaskApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("ada", "ada@example.com", "analytical-engine-1")
        self.other = User.objects.create_user("bob", "bob@example.com", "analytical-engine-2")
        self.client.force_authenticate(self.user)
        self.project = Project.objects.create(owner=self.user, name="Engine")

    def make_task(self, **kwargs):
        defaults = {"project": self.project, "title": "Task"}
        return Task.objects.create(**{**defaults, **kwargs})

    def test_requires_auth(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse("project-list")).status_code, 401)

    def test_list_only_own_projects_with_counts(self):
        Project.objects.create(owner=self.other, name="Secret")
        self.make_task(status="done")
        self.make_task(due_date=timezone.localdate() - timedelta(days=1))
        res = self.client.get(reverse("project-list"))
        self.assertEqual([p["name"] for p in res.data], ["Engine"])
        self.assertEqual(res.data[0]["task_count"], 2)
        self.assertEqual(res.data[0]["done_count"], 1)
        self.assertEqual(res.data[0]["overdue_count"], 1)

    def test_duplicate_project_name_rejected(self):
        res = self.client.post(reverse("project-list"), {"name": "engine"})
        self.assertEqual(res.status_code, 400)

    def test_cannot_read_or_edit_other_users_project(self):
        theirs = Project.objects.create(owner=self.other, name="Secret")
        url = reverse("project-detail", args=[theirs.pk])
        self.assertEqual(self.client.get(url).status_code, 404)
        self.assertEqual(self.client.patch(url, {"name": "Mine"}).status_code, 404)

    def test_cannot_create_task_in_other_users_project(self):
        theirs = Project.objects.create(owner=self.other, name="Secret")
        res = self.client.post(reverse("task-list"), {"project": theirs.pk, "title": "Sneaky"})
        self.assertEqual(res.status_code, 400)
        self.assertFalse(Task.objects.filter(title="Sneaky").exists())

    def test_create_task_appends_to_column(self):
        self.make_task(position=0)
        res = self.client.post(reverse("task-list"), {"project": self.project.pk, "title": "Next"})
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.data["position"], 1)

    def test_blank_title_rejected(self):
        res = self.client.post(reverse("task-list"), {"project": self.project.pk, "title": "   "})
        self.assertEqual(res.status_code, 400)

    def test_marking_done_sets_completed_at_and_reopening_clears_it(self):
        task = self.make_task()
        url = reverse("task-detail", args=[task.pk])
        self.assertIsNotNone(self.client.patch(url, {"status": "done"}).data["completed_at"])
        self.assertIsNone(self.client.patch(url, {"status": "todo"}).data["completed_at"])

    def test_move_reorders_column(self):
        a = self.make_task(title="a", status="doing", position=0)
        b = self.make_task(title="b", status="doing", position=1)
        c = self.make_task(title="c", position=0)
        res = self.client.post(
            reverse("task-move", args=[c.pk]), {"status": "doing", "position": 1}
        )
        self.assertEqual(res.status_code, 200)
        order = list(
            Task.objects.filter(status="doing").order_by("position").values_list("title", flat=True)
        )
        self.assertEqual(order, ["a", "c", "b"])
        a.refresh_from_db()
        b.refresh_from_db()
        self.assertEqual((a.position, b.position), (0, 2))

    def test_filters(self):
        today = timezone.localdate()
        self.make_task(title="late", due_date=today - timedelta(days=2))
        self.make_task(title="soon", due_date=today + timedelta(days=3))
        self.make_task(title="done late", status="done", due_date=today - timedelta(days=2))
        url = reverse("task-list")
        titles = lambda q: {t["title"] for t in self.client.get(url, q).data}  # noqa: E731
        self.assertEqual(titles({"due": "overdue"}), {"late"})
        self.assertEqual(titles({"due": "week"}), {"soon"})
        self.assertEqual(titles({"search": "LATE"}), {"late", "done late"})

    def test_dashboard(self):
        today = timezone.localdate()
        self.make_task(due_date=today - timedelta(days=1))
        self.make_task(status="doing", due_date=today + timedelta(days=2))
        self.make_task(status="done")
        res = self.client.get(reverse("dashboard"))
        self.assertEqual(res.data["counts"]["open"], 2)
        self.assertEqual(res.data["counts"]["overdue"], 1)
        self.assertEqual(res.data["counts"]["done_this_week"], 1)
        self.assertEqual(len(res.data["upcoming"]), 2)
        self.assertEqual(len(res.data["activity"]), 14)
        self.assertEqual(res.data["activity"][-1]["done"], 1)


class HealthAndConstraintTests(APITestCase):
    def test_health_checks_database(self):
        res = self.client.get("/api/health/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "ok")

    def test_priority_out_of_range_rejected(self):
        user = User.objects.create_user("ada", "ada@example.com", "analytical-engine-1")
        self.client.force_authenticate(user)
        project = Project.objects.create(owner=user, name="P")
        res = self.client.post(
            reverse("task-list"), {"project": project.pk, "title": "x", "priority": 9}
        )
        self.assertEqual(res.status_code, 400)

    def test_database_enforces_priority_range(self):
        from django.db import IntegrityError, transaction

        user = User.objects.create_user("bob", "bob@example.com", "analytical-engine-2")
        project = Project.objects.create(owner=user, name="P")
        with self.assertRaises(IntegrityError), transaction.atomic():
            Task.objects.create(project=project, title="x", priority=7)


class SeedCommandTests(APITestCase):
    def run_seed(self, **env):
        from io import StringIO
        from unittest import mock

        from django.core.management import call_command

        out = StringIO()
        with mock.patch.dict("os.environ", env, clear=False):
            call_command("seed_demo", stdout=out)
        return out.getvalue()

    def test_seed_demo_is_idempotent(self):
        self.run_seed()
        self.run_seed()
        self.assertEqual(Project.objects.filter(owner__username="demo").count(), 3)

    def test_random_password_printed_once_and_works(self):
        out = self.run_seed(DEMO_PASSWORD="")
        password = out.split("password: ")[1].split()[0]
        self.assertTrue(User.objects.get(username="demo").check_password(password))
        self.assertNotIn("password:", self.run_seed(DEMO_PASSWORD=""))
        self.assertTrue(User.objects.get(username="demo").check_password(password))

    def test_demo_password_env_is_used_and_not_printed(self):
        out = self.run_seed(DEMO_PASSWORD="from-the-environment-1")
        self.assertNotIn("from-the-environment-1", out)
        self.assertTrue(User.objects.get(username="demo").check_password("from-the-environment-1"))
