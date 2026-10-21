from datetime import timedelta

from django.db import transaction
from django.db.models import Count, Max, Q
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action, api_view
from rest_framework.response import Response

from .models import Project, Task
from .serializers import ProjectSerializer, TaskMoveSerializer, TaskSerializer


def overdue_q(prefix=""):
    return Q(**{f"{prefix}due_date__lt": timezone.localdate()}) & ~Q(
        **{f"{prefix}status": Task.Status.DONE}
    )


class ProjectViewSet(viewsets.ModelViewSet):
    serializer_class = ProjectSerializer

    def get_queryset(self):
        qs = Project.objects.filter(owner=self.request.user).annotate(
            task_count=Count("tasks", distinct=True),
            done_count=Count("tasks", filter=Q(tasks__status=Task.Status.DONE), distinct=True),
            overdue_count=Count("tasks", filter=overdue_q("tasks__"), distinct=True),
        )
        if self.request.query_params.get("archived") in ("0", "false"):
            qs = qs.filter(archived=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)


class TaskViewSet(viewsets.ModelViewSet):
    """
    Filters: ?project=<id>&status=todo|doing|done&due=overdue|week&search=<text>
    """

    serializer_class = TaskSerializer

    def get_queryset(self):
        qs = Task.objects.filter(project__owner=self.request.user).select_related("project")
        params = self.request.query_params
        if project := params.get("project"):
            qs = qs.filter(project_id=project)
        if status := params.get("status"):
            qs = qs.filter(status=status)
        if search := params.get("search"):
            qs = qs.filter(Q(title__icontains=search) | Q(notes__icontains=search))
        due = params.get("due")
        if due == "overdue":
            qs = qs.filter(overdue_q())
        elif due == "week":
            today = timezone.localdate()
            qs = qs.filter(due_date__range=(today, today + timedelta(days=7))).exclude(
                status=Task.Status.DONE
            )
        return qs

    def perform_create(self, serializer):
        status = serializer.validated_data.get("status", Task.Status.TODO)
        project = serializer.validated_data["project"]
        last = project.tasks.filter(status=status).aggregate(m=Max("position"))["m"]
        serializer.save(position=0 if last is None else last + 1)

    @action(detail=True, methods=["post"])
    def move(self, request, pk=None):
        """Move a task to a column and slot, renumbering siblings so order stays dense."""
        task = self.get_object()
        data = TaskMoveSerializer(data=request.data)
        data.is_valid(raise_exception=True)
        new_status = data.validated_data["status"]

        with transaction.atomic():
            siblings = list(
                Task.objects.select_for_update()
                .filter(project=task.project, status=new_status)
                .exclude(pk=task.pk)
                .order_by("position", "created_at")
            )
            index = min(data.validated_data["position"], len(siblings))
            siblings.insert(index, task)
            task.status = new_status
            task.save()
            for pos, item in enumerate(siblings):
                if item.position != pos:
                    Task.objects.filter(pk=item.pk).update(position=pos)
            task.refresh_from_db()

        return Response(TaskSerializer(task, context={"request": request}).data)


@api_view(["GET"])
def dashboard(request):
    tasks = Task.objects.filter(project__owner=request.user, project__archived=False)
    today = timezone.localdate()
    week_ago = timezone.now() - timedelta(days=7)
    counts = tasks.aggregate(
        open=Count("id", filter=~Q(status=Task.Status.DONE)),
        doing=Count("id", filter=Q(status=Task.Status.DOING)),
        overdue=Count("id", filter=overdue_q()),
        done_this_week=Count("id", filter=Q(completed_at__gte=week_ago)),
    )
    upcoming = (
        tasks.exclude(status=Task.Status.DONE)
        .filter(due_date__isnull=False, due_date__lte=today + timedelta(days=7))
        .select_related("project")
        .order_by("due_date", "-priority")[:8]
    )
    # Completions per day for the last 14 days, oldest first, for the sparkline.
    since = today - timedelta(days=13)
    per_day = {since + timedelta(days=i): 0 for i in range(14)}
    for completed in tasks.filter(completed_at__date__gte=since).values_list(
        "completed_at", flat=True
    ):
        day = timezone.localtime(completed).date()
        if day in per_day:
            per_day[day] += 1

    return Response(
        {
            "counts": counts,
            "upcoming": TaskSerializer(upcoming, many=True, context={"request": request}).data,
            "activity": [{"date": d.isoformat(), "done": n} for d, n in per_day.items()],
        }
    )
