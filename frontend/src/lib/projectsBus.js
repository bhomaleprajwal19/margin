// Tiny pub/sub so the sidebar refreshes its project list after edits elsewhere.
const listeners = new Set();
export const onProjectsChanged = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};
export const projectsChanged = () => listeners.forEach((fn) => fn());
