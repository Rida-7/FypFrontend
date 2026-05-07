import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { FileText, CheckSquare, Zap, ArrowRight } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function HeadingsPage() {
  const [headings, setHeadings] = useState([]);
  const [selectedHeadings, setSelectedHeadings] = useState([]);
  const [templateType, setTemplateType] = useState("");
  const [loading, setLoading] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  // ── IDs & source (File 4 logic) ──────────────────────
  const source =
    searchParams.get("source") ||
    location.state?.source ||
    localStorage.getItem("source");

  const boardId =
    searchParams.get("boardId") ||
    location.state?.boardId ||
    localStorage.getItem("boardId");

  const channelId =
    searchParams.get("channelId") ||
    location.state?.channelId ||
    localStorage.getItem("channelId");

  const projectId = source === "slack" ? channelId : boardId;

  const templateKey = searchParams.get("templateKey");
  const templateName = searchParams.get("templateName");


  // Persist to localStorage (File 4)
  useEffect(() => {
    if (channelId) localStorage.setItem("channelId", channelId);
    if (boardId) localStorage.setItem("boardId", boardId);
    if (source) localStorage.setItem("source", source);
  }, [channelId, boardId, source]);

  // ── getUserId (File 4 logic) ──────────────────────────
  const getUserId = () => {
    const raw = localStorage.getItem("userId");
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" ? parsed._id : parsed;
    } catch {
      return raw;
    }
  };

  // ── fetchHeadings (merged: File 3 hierarchical + File 4 fallback) ──
  const fetchHeadings = async (key) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/templates/headings`, {
        params: { template: key },
      });
      console.log("Headings response:", res.data);

      if (res.data.status !== "success") { setHeadings([]); return; }

      // Backend returns `sections` not `structure`
      const { type, sections, project_fields, table_columns } = res.data;
      setTemplateType(type || "");

      let extracted = [];

      if (type === "section") {
        // sections is a flat array of strings
        extracted = (sections || []).filter(Boolean);

      } else if (type === "table") {
        extracted = [...(project_fields || []), ...(table_columns || [])];

      } else if (type === "hierarchical") {
        const traverse = (items) => {
          let r = [];
          items.forEach((sec) => {
            if (sec.section) r.push(sec.section);
            if (sec.tables) sec.tables.forEach((t) => t.headers && r.push(...t.headers));
            if (sec.subsections) sec.subsections.forEach((sub) => {
              if (sub.subsection) r.push(sub.subsection);
              if (sub.tables) sub.tables.forEach((t) => t.headers && r.push(...t.headers));
              if (sub.subsubsections) sub.subsubsections.forEach((s) => {
                if (s.subsubsection) r.push(s.subsubsection);
                if (s.tables) s.tables.forEach((t) => t.headers && r.push(...t.headers));
              });
            });
          });
          return r;
        };
        extracted = traverse(sections || []);

      } else {
        // fallback
        extracted = (sections || project_fields || table_columns || [])
          .map((h) => (typeof h === "string" ? h : h?.section || null))
          .filter(Boolean);
      }

      setHeadings(extracted);
    } catch (err) {
      console.error(err);
      setHeadings([]);
    }
  };

  useEffect(() => { if (templateKey) fetchHeadings(templateKey); }, [templateKey]);

  // ── Toggle helpers ────────────────────────────────────
  const toggle = (h) =>
    setSelectedHeadings((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );

  const toggleAll = () =>
    setSelectedHeadings(selectedHeadings.length === headings.length ? [] : [...headings]);

  // ── startWorkflow (File 4: navigate with state, no axios call) ────
  const startWorkflow = () => {
    const userId = getUserId();
    if (!userId) { alert("User not found. Please log in again."); return; }
    if (!projectId) { alert("Missing project/channel ID."); return; }
    if (!selectedHeadings.length) { alert("Select at least one section."); return; }

    localStorage.setItem("selected_headings", JSON.stringify(selectedHeadings));
    localStorage.setItem("template_type", templateType);

    setLoading(true);

    navigate("/generated-doc", {
      state: {
        boardId: projectId,
        userId,
        templateName: templateKey,
        source,
        teamId: localStorage.getItem("teamId") || "",
        selectedHeadings,
        templateType,
      },
    });
  };

  const allSelected = selectedHeadings.length === headings.length && headings.length > 0;

  // ── UI (File 3) ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Ambient background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">Configure</span>
          </div>

          <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
            {templateName || "Template"}
          </h1>
          <p className="mt-1 text-gray-400 text-base">
            Choose the sections to include in your generated document.
          </p>
        </div>

        {/* Headings card */}
        {headings.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-2xl py-16 flex flex-col items-center gap-3">
            <CheckSquare className="w-8 h-8 text-gray-300" />
            <p className="text-gray-500 font-medium">No sections found for this template.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-6">

            {/* Top gradient bar */}
            <div className="h-0.5 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            {/* Select all row */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">
                {selectedHeadings.length} of {headings.length} selected
              </span>
              <button
                onClick={toggleAll}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {/* Headings list */}
            <div className="divide-y divide-gray-50 max-h-[55vh] overflow-y-auto">
              {headings.map((h, idx) => {
                const isChecked = selectedHeadings.includes(h);
                return (
                  <label
                    key={idx}
                    className={`flex items-center gap-4 px-6 py-3.5 cursor-pointer transition-colors duration-150 ${isChecked ? "bg-indigo-50/60" : "hover:bg-gray-50"
                      } ${loading ? "pointer-events-none opacity-50" : ""}`}
                  >
                    {/* Custom checkbox */}
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${isChecked
                        ? "bg-gradient-to-br from-indigo-600 to-purple-600 border-indigo-600"
                        : "border-gray-300 bg-white"
                      }`}>
                      {isChecked && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggle(h)}
                      className="sr-only"
                    />
                    <span className={`text-[15px] leading-relaxed ${isChecked ? "text-gray-900 font-medium" : "text-gray-600"}`}>
                      {h}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={startWorkflow}
          disabled={loading || headings.length === 0}
          className="w-full py-3.5 rounded-xl text-white font-semibold text-base bg-gradient-to-r from-indigo-600 to-purple-600 hover:shadow-lg hover:shadow-indigo-200 transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Zap className="w-4 h-4" />
              Start Workflow
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>

      </div>
    </div>
  );
}