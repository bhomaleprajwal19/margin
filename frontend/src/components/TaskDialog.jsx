import { useState } from "react";
import { Tasks } from "../api/client";
import { COLUMNS, PRIORITIES } from "../lib/constants";
import Field from "./Field";
import Modal from "./Modal";

export default function TaskDialog({ task, projectId, defaultStatus = "todo", onClose, onSaved, onDeleted }) {
  const editing = Boolean(task);
  const [form, setForm] = useState({
    title: task?.title ?? "",
    notes: task?.notes ?? "",
    status: task?.status ?? defaultStatus,
    priority: task?.priority ?? 2,
    due_date: task?.due_date ?? "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const payload = { ...form, priority: Number(form.priority), due_date: form.due_date || null };
    try {
      const saved = editing
        ? await Tasks.update(task.id, payload)
        : await Tasks.create({ ...payload, project: projectId });
      onSaved(saved);
    } catch (err) {
      setErrors({ ...err.fields, form: Object.keys(err.fields || {}).length ? "" : err.message });
      setSaving(false);
    }
  }

  async function remove() {
    await Tasks.remove(task.id);
    onDeleted(task);
  }

  return (
    <Modal title={editing ? "Edit task" : "New task"} eyebrow={task?.project_name} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <Field label="Title" id="t-title" error={errors.title}>
          <input id="t-title" value={form.title} onChange={set("title")} required autoFocus maxLength={160} />
        </Field>
        <Field label="Notes" id="t-notes" error={errors.notes}>
          <textarea id="t-notes" rows={4} value={form.notes} onChange={set("notes")} />
        </Field>
        <div className="row-3">
          <Field label="Column" id="t-status">
            <select id="t-status" value={form.status} onChange={set("status")}>
              {COLUMNS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Priority" id="t-priority">
            <select id="t-priority" value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Due" id="t-due" error={errors.due_date}>
            <input id="t-due" type="date" value={form.due_date} onChange={set("due_date")} />
          </Field>
        </div>
        {errors.form && <p className="form-error">{errors.form}</p>}
        <div className="actions">
          {editing && (
            <button type="button" className="btn-danger-text" onClick={remove}>
              Delete
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Add task"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
