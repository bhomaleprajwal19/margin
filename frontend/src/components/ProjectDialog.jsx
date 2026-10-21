import { useState } from "react";
import { Projects } from "../api/client";
import { PROJECT_COLORS } from "../lib/constants";
import Field from "./Field";
import Modal from "./Modal";

export default function ProjectDialog({ project, onClose, onSaved, onDeleted }) {
  const editing = Boolean(project);
  const [form, setForm] = useState({
    name: project?.name ?? "",
    description: project?.description ?? "",
    color: project?.color ?? "vermilion",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const saved = editing
        ? await Projects.update(project.id, form)
        : await Projects.create(form);
      onSaved(saved);
    } catch (err) {
      setErrors({ ...err.fields, form: Object.keys(err.fields || {}).length ? "" : err.message });
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${project.name}” and all of its tasks? This can't be undone.`))
      return;
    await Projects.remove(project.id);
    onDeleted?.();
  }

  return (
    <Modal
      title={editing ? "Edit project" : "A new project"}
      eyebrow={editing ? project.name : "Projects"}
      onClose={onClose}
    >
      <form onSubmit={submit} className="stack">
        <Field label="Name" id="p-name" error={errors.name}>
          <input id="p-name" value={form.name} onChange={set("name")} required autoFocus maxLength={80} />
        </Field>
        <Field label="What is it for?" id="p-desc" hint="Optional. One line is plenty.">
          <textarea id="p-desc" rows={2} value={form.description} onChange={set("description")} />
        </Field>
        <fieldset className="field">
          <legend>Ink</legend>
          <div className="swatches">
            {PROJECT_COLORS.map((c) => (
              <label key={c} className="swatch-pick" title={c}>
                <input
                  type="radio"
                  name="color"
                  value={c}
                  checked={form.color === c}
                  onChange={set("color")}
                />
                <span className={`swatch swatch-lg swatch-${c}`} />
                <span className="sr-only">{c}</span>
              </label>
            ))}
          </div>
        </fieldset>
        {errors.form && <p className="form-error">{errors.form}</p>}
        <div className="actions">
          {editing && (
            <button type="button" className="btn-danger-text" onClick={remove}>
              Delete project
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn" disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Create project"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
