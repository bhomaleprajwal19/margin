import django
from django.db import migrations, models

# Django 5.1 renamed CheckConstraint(check=...) to condition=...; Django 4.2 is used on Python 3.9.
_rule = models.Q(("priority__gte", 1), ("priority__lte", 3))
_kwarg = "condition" if django.VERSION >= (5, 1) else "check"


class Migration(migrations.Migration):
    dependencies = [
        ("projects", "0001_initial"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="task",
            constraint=models.CheckConstraint(name="task_priority_range", **{_kwarg: _rule}),
        ),
    ]
