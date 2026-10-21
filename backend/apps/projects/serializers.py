from rest_framework import serializers

from .models import Project, Task


class ProjectSerializer(serializers.ModelSerializer):
    task_count = serializers.IntegerField(read_only=True)
    done_count = serializers.IntegerField(read_only=True)
    overdue_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Project
        fields = [
            "id",
            "name",
            "description",
            "color",
            "archived",
            "task_count",
            "done_count",
            "overdue_count",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_name(self, value):
        value = value.strip()
        owner = self.context["request"].user
        qs = Project.objects.filter(owner=owner, name__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("You already have a project with this name.")
        return value


class TaskSerializer(serializers.ModelSerializer):
    is_overdue = serializers.BooleanField(read_only=True)
    project_name = serializers.CharField(source="project.name", read_only=True)
    project_color = serializers.CharField(source="project.color", read_only=True)

    class Meta:
        model = Task
        fields = [
            "id",
            "project",
            "project_name",
            "project_color",
            "title",
            "notes",
            "status",
            "priority",
            "due_date",
            "position",
            "is_overdue",
            "completed_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "position", "completed_at", "created_at", "updated_at"]

    def validate_project(self, project):
        # Never let a user attach tasks to someone else's project.
        if project.owner_id != self.context["request"].user.id:
            raise serializers.ValidationError("Project not found.")
        return project

    def validate_title(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Title can't be blank.")
        return value


class TaskMoveSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Task.Status.choices)
    position = serializers.IntegerField(min_value=0)
