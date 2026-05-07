import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText, History, X, ChevronRight, FolderOpen,
  AlertCircle, Eye, ChevronDown,
} from "lucide-react";
import {
  SiSlack,
  SiTrello,
  SiClickup,
  SiNotion,
  SiJira,
  SiGithub,
  SiAsana,
  SiLinear,
} from "react-icons/si";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ── Tool metadata ─────────────────────────────────────────────────────────────
const TOOL_CONFIG = {
  trello:  { label: "Trello",  color: "#0079BF", bg: "#e8f4fd", Icon: SiTrello },
  slack:   { label: "Slack",   color: "#E01E5A", bg: "#fde8ef", Icon: SiSlack },
  github:  { label: "GitHub",  color: "#24292e", bg: "#f0ebfd", Icon: SiGithub },
  notion:  { label: "Notion",  color: "#374151", bg: "#f3f4f6", Icon: SiNotion },
  jira:    { label: "Jira",    color: "#0052CC", bg: "#e6effe", Icon: SiJira },
  asana:   { label: "Asana",   color: "#F06A6A", bg: "#fef0f0", Icon: SiAsana },
  linear:  { label: "Linear",  color: "#5E6AD2", bg: "#eeeffe", Icon: SiLinear },
  clickup: { label: "ClickUp", color: "#7B68EE", bg: "#f0eeff", Icon: SiClickup },
};

function getToolConfig(toolName = "") {
  const key = toolName.toLowerCase().trim();
  return (
    TOOL_CONFIG[key] || {
      label: toolName || "Other",
      color: "#6366f1",
      bg: "#eef2ff",
      Icon: null, // fallback: will render FileText from lucide
    }
  );
}

// Adjust these field names to match your actual API response
function resolveToolName(doc) {
  return (
    doc.tool_name ||
    doc.tool ||
    doc.source ||
    doc.integration ||
    doc.workspace_type ||
    "Other"
  );
}

function resolveProjectName(doc) {
  return (
    doc.board_name ||
    doc.project_name ||
    doc.workspace_name ||
    "Unknown Project"
  ).trim();
}

// =====================================================
// 📄 FULL VERSION VIEW MODAL
// =====================================================
function FullDocModal({ content, onClose }) {
  if (!content) return null;
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm" />
      <div
        className="relative bg-white w-full max-w-3xl max-h-[80vh] overflow-auto rounded-2xl shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-gray-900">Full Document</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <pre className="whitespace-pre-wrap text-sm text-gray-700 px-6 py-5 leading-relaxed">
          {content}
        </pre>
      </div>
    </div>
  );
}

// =====================================================
// 🔁 Version History Modal
// =====================================================
function VersionHistory({ selectedDoc, userId, onClose }) {
  const [versions, setVersions]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [fullView, setFullView]   = useState(null);
  const [expanded, setExpanded]   = useState(null);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (!selectedDoc) return;
    const fetchVersions = async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `${BACKEND_URL}/generated-docs/versions?` +
            `user_id=${userId}&project_id=${selectedDoc.project_id}&template_name=${selectedDoc.template_name}`
        );
        if (!res.ok) throw new Error("Failed to fetch versions");
        const data = await res.json();
        setVersions(data.versions || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchVersions();
  }, [selectedDoc, userId]);

  const restoreVersion = async (version) => {
    try {
      setRestoring(true);
      await fetch(`${BACKEND_URL}/generated-docs/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          project_id: selectedDoc.project_id,
          template_name: selectedDoc.template_name,
          version,
        }),
      });
      alert("Version restored successfully!");
      window.location.reload();
    } catch (e) {
      alert(e.message);
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <History className="w-4 h-4 text-white" />
            </div>
            <h2 className="font-bold text-gray-900 text-lg">Version History</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loading && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin mr-2" />
              Loading…
            </div>
          )}
          {error && <p className="text-red-500 text-sm py-4">{error}</p>}
          {!loading && !error && versions.length === 0 && (
            <p className="text-gray-400 text-sm py-8 text-center">
              No version history available.
            </p>
          )}

          <div className="space-y-3">
            {versions
              .slice()
              .reverse()
              .map((v, i) => (
                <div
                  key={i}
                  className="border border-gray-100 rounded-xl overflow-hidden bg-gray-50"
                >
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      Version {v.version}
                      {v.is_latest && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                        onClick={() => setFullView(v.content)}
                      >
                        <Eye className="w-3.5 h-3.5" /> Full View
                      </button>
                      <button
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium flex items-center gap-1"
                        onClick={() => setExpanded(expanded === i ? null : i)}
                      >
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform ${
                            expanded === i ? "rotate-180" : ""
                          }`}
                        />
                        {expanded === i ? "Collapse" : "Expand"}
                      </button>
                      <button
                        disabled={restoring}
                        className="text-xs bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 py-1 rounded-lg font-semibold disabled:opacity-50 hover:opacity-90 transition"
                        onClick={() => restoreVersion(v.version)}
                      >
                        Restore
                      </button>
                    </div>
                  </div>
                  {expanded === i && (
                    <div className="border-t border-gray-100 px-4 py-3 text-sm text-gray-700 whitespace-pre-wrap bg-white max-h-[300px] overflow-auto leading-relaxed">
                      {v.content}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>
      </div>

      {fullView && (
        <FullDocModal content={fullView} onClose={() => setFullView(null)} />
      )}
    </div>
  );
}

// =====================================================
// 📄 MAIN PAGE
// =====================================================
export default function DocumentsPage() {
  const [docs, setDocs]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [hoveredDoc, setHoveredDoc]   = useState(null);
  const [collapsedTools, setCollapsedTools] = useState({});

  const getUserId = () => {
    const raw = localStorage.getItem("userId");
    if (!raw) return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try {
        return JSON.parse(raw)?._id || null;
      } catch {
        return null;
      }
    }
    return raw;
  };
  const userId = getUserId();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`${BACKEND_URL}/generated-docs/all?user_id=${userId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((d) => setDocs(d.documents || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading)
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
        </div>
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="text-gray-500 font-medium">Loading your documents…</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{error}</p>
        </div>
      </div>
    );

  if (!docs.length)
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
        </div>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-4">
            <FileText className="w-7 h-7 text-indigo-300" />
          </div>
          <p className="font-semibold text-gray-600">No documents yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Run a workflow on a board to generate your first document.
          </p>
        </div>
      </div>
    );

  // ── 1. Latest version per (project_id + template_name) ───────────────────
  const latestMap = docs.reduce((acc, doc) => {
    const key = doc.project_id + "_" + doc.template_name;
    if (!acc[key] || (doc.version || 0) > (acc[key].version || 0)) {
      acc[key] = doc;
    }
    return acc;
  }, {});

  // ── 2. Group: tool → project → docs[] ────────────────────────────────────
  const groupedByTool = Object.values(latestMap).reduce((acc, doc) => {
    const tool    = resolveToolName(doc);
    const project = resolveProjectName(doc);
    if (!acc[tool]) acc[tool] = {};
    if (!acc[tool][project]) acc[tool][project] = [];
    acc[tool][project].push(doc);
    return acc;
  }, {});

  const cardGradient = "from-indigo-500 to-purple-600";
  const cardGlow     = "rgba(99,102,241,0.13)";

  const toggleTool = (tool) =>
    setCollapsedTools((prev) => ({ ...prev, [tool]: !prev[tool] }));

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-8 pb-20">

        {/* ── Page Header ── */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">
                Workspace
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
              Documents
            </h1>
            <p className="mt-2 text-gray-500 text-xl">
              All your generated docs, grouped by tool and project.
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <FileText className="w-4 h-4 text-indigo-400" />
            <span className="text-sm font-semibold text-gray-700">
              {Object.keys(latestMap).length} docs
            </span>
          </div>
        </div>

        {/* ── Tool Sections ── */}
        {Object.entries(groupedByTool).map(([toolName, projects]) => {
          const toolCfg     = getToolConfig(toolName);
          const isCollapsed = collapsedTools[toolName];
          const totalDocs   = Object.values(projects).reduce(
            (s, arr) => s + arr.length,
            0
          );

          return (
            <div key={toolName} className="mb-12">

              {/* ── Tool Header (collapsible) ── */}
              <button
                onClick={() => toggleTool(toolName)}
                className="w-full flex items-center gap-3 mb-5"
              >
                <div
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border font-bold text-sm flex-shrink-0"
                  style={{
                    background: toolCfg.bg,
                    borderColor: toolCfg.color + "44",
                    color: toolCfg.color,
                  }}
                >
                  {toolCfg.Icon
                    ? <toolCfg.Icon size={15} />
                    : <FileText size={15} />
                  }
                  {toolCfg.label}
                </div>
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                  {totalDocs} doc{totalDocs !== 1 ? "s" : ""}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 flex-shrink-0 ${
                    isCollapsed ? "-rotate-90" : ""
                  }`}
                />
              </button>

              {/* ── Projects inside tool ── */}
              {!isCollapsed &&
                Object.entries(projects).map(([projectName, projectDocs]) => (
                  <div key={projectName} className="mb-8 pl-1">

                    {/* Project sub-header */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-md bg-gray-100 border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <FolderOpen className="w-3 h-3 text-gray-500" />
                      </div>
                      <h3 className="text-sm font-bold text-gray-700">
                        {projectName}
                      </h3>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">
                        {projectDocs.length} doc{projectDocs.length !== 1 ? "s" : ""}
                      </span>
                      <div className="flex-1 h-px bg-gray-100" />
                    </div>

                    {/* Doc cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {projectDocs.map((doc) => {
                        const docKey =
                          doc.id ||
                          doc._id ||
                          doc.project_id + doc.template_name;
                        const isHovered = hoveredDoc === docKey;

                        return (
                          <div
                            key={docKey}
                            onMouseEnter={() => setHoveredDoc(docKey)}
                            onMouseLeave={() => setHoveredDoc(null)}
                            className="group relative bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col transition-all duration-200"
                            style={{
                              boxShadow: isHovered
                                ? `0 8px 28px ${cardGlow}, 0 1px 4px rgba(0,0,0,0.05)`
                                : "0 1px 3px rgba(0,0,0,0.04)",
                              transform: isHovered
                                ? "translateY(-2px)"
                                : "translateY(0)",
                            }}
                          >
                            {/* Tool-colored top accent on hover */}
                            <div
                              className="h-0.5 w-full transition-opacity duration-200"
                              style={{
                                background: `linear-gradient(to right, ${toolCfg.color}, #a855f7)`,
                                opacity: isHovered ? 1 : 0,
                              }}
                            />

                            <div className="p-5 flex flex-col flex-1">
                              {/* Card header */}
                              <div className="flex items-start gap-3 mb-3">
                                <div
                                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                                  style={{ background: toolCfg.bg }}
                                >
                                  {toolCfg.Icon
                                    ? <toolCfg.Icon size={18} style={{ color: toolCfg.color }} />
                                    : <FileText className="w-4 h-4" style={{ color: toolCfg.color }} />
                                  }
                                </div>
                                <div className="min-w-0">
                                  <h4 className="font-bold text-gray-900 text-base leading-tight truncate">
                                    {doc.template_name}
                                  </h4>
                                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                                    {projectName}
                                  </p>
                                </div>
                              </div>

                              {/* ✅ Current version badge */}
                              <span className="self-start text-xs bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold mb-3">
                                v{doc.version ?? "—"} · current
                              </span>

                              {/* Preview */}
                              <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 flex-1 mb-4">
                                {doc.generated_docs
                                  ? doc.generated_docs
                                      .replace(/[#*_`]/g, "")
                                      .slice(0, 100) + "…"
                                  : "No content preview available."}
                              </p>

                              {/* Actions */}
                              <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100">
                                <Link
                                  to={`/documents/${doc.template_name}?projectId=${doc.project_id}&boardName=${encodeURIComponent(projectName)}`}
                                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r ${cardGradient} hover:shadow-md transition-all duration-200 hover:-translate-y-0.5`}
                                >
                                  View Doc <ChevronRight className="w-3.5 h-3.5" />
                                </Link>
                                <button
                                  onClick={() =>
                                    setSelectedDoc({
                                      project_id: doc.project_id,
                                      template_name: doc.template_name,
                                    })
                                  }
                                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-gray-200 bg-white hover:border-indigo-200 hover:bg-indigo-50 transition-all"
                                  title="Version History"
                                >
                                  <History className="w-4 h-4 text-gray-400" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          );
        })}
      </div>

      {selectedDoc && (
        <VersionHistory
          selectedDoc={selectedDoc}
          userId={userId}
          onClose={() => setSelectedDoc(null)}
        />
      )}

      <style>{`.line-clamp-2{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}`}</style>
    </div>
  );
}