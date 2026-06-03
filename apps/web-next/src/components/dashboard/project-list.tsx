"use client";

import { useProjects } from "@/hooks/useProjects";

export function ProjectList() {
  const { projects, isLoading, activeProjectId, selectActiveProject } = useProjects();

  if (isLoading) return <div className="text-sm text-slate-500">Loading projects...</div>;

  return (
    <div className="rounded-xl border bg-white p-4">
      <h3 className="mb-3 text-sm font-bold">Your Projects</h3>
      {projects.length === 0 ? (
        <p className="text-sm text-slate-500">No projects yet.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((p) => {
            const isActive = p.id === activeProjectId;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => selectActiveProject(p.id)}
                  className={`w-full rounded border px-3 py-2 text-left text-sm transition ${
                    isActive ? "border-slate-900 bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="font-semibold">{p.brand_name || p.name}</div>
                  <div className="text-xs text-slate-500">{p.domain}</div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
