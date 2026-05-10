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

  const source =
    searchParams.get("source") ||
    location.state?.source ||
    localStorage.getItem("source") ||
    "trello";

  const boardId =
    searchParams.get("boardId") ||
    location.state?.boardId ||
    localStorage.getItem("boardId");

  const repoId =
    searchParams.get("repoId") ||
    location.state?.repoId ||
    localStorage.getItem("repoId");

  const channelId =
    searchParams.get("channelId") ||
    location.state?.channelId ||
    localStorage.getItem("channelId");

  let projectId = "";
  if (source === "slack") projectId = channelId;
  else if (source === "github") projectId = repoId;
  else projectId = boardId;

  const templateKey = searchParams.get("templateKey");
  const templateName = searchParams.get("templateName");
  const boardName = searchParams.get("boardName") || projectId;

  useEffect(() => {
    if (channelId) localStorage.setItem("channelId", channelId);
    if (boardId)   localStorage.setItem("boardId", boardId);
    if (repoId)    localStorage.setItem("repoId", repoId);
    if (source)    localStorage.setItem("source", source);
  }, [channelId, boardId, repoId, source]);

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

  const fetchHeadings = async (key) => {
    try {
      const res = await axios.get(`${BACKEND_URL}/templates/headings`, {
        params: { template: key },
      });

      if (res.data.status !== "success") { setHeadings([]); return; }

      const { type, sections, project_fields, table_columns } = res.data;
      setTemplateType(type || "");

      let extracted = [];

      if (type === "table") {
        extracted = [...(project_fields || []), ...(table_columns || [])];
      } else if (type === "section" || type === "hierarchical") {
        const traverse = (items = []) => {
          const result = [];
          items.forEach((sec) => {
            if (!sec) return;
            if (sec.section) result.push(sec.section);
            if (Array.isArray(sec.tables))
              sec.tables.forEach((t) => { if (Array.isArray(t.headers)) result.push(...t.headers); });
            if (Array.isArray(sec.subsections))
              sec.subsections.forEach((sub) => {
                if (!sub) return;
                if (sub.subsection) result.push(sub.subsection);
                if (Array.isArray(sub.tables))
                  sub.tables.forEach((t) => { if (Array.isArray(t.headers)) result.push(...t.headers); });
                if (Array.isArray(sub.subsubsections))
                  sub.subsubsections.forEach((s) => {
                    if (!s) return;
                    if (s.subsubsection) result.push(s.subsubsection);
                    if (s.subsection) result.push(s.subsection);
                    if (Array.isArray(s.tables))
                      s.tables.forEach((t) => { if (Array.isArray(t.headers)) result.push(...t.headers); });
                  });
              });
          });
          return result;
        };
        extracted = traverse(sections || []);
      } else {
        extracted = (sections || project_fields || table_columns || [])
          .map((h) => (typeof h === "string" ? h : h?.section || null))
          .filter(Boolean);
      }

      extracted = [...new Set(extracted.filter(Boolean))];
      setHeadings(extracted);
    } catch (err) {
      console.error(err);
      setHeadings([]);
    }
  };

  useEffect(() => { if (templateKey) fetchHeadings(templateKey); }, [templateKey]);

  const toggle = (h) =>
    setSelectedHeadings((prev) =>
      prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]
    );

  const toggleAll = () =>
    setSelectedHeadings(selectedHeadings.length === headings.length ? [] : [...headings]);

  const startWorkflow = () => {
    const userId = getUserId();
    if (!userId)                  { alert("User not found. Please log in again."); return; }
    if (!projectId)               { alert("Missing project/channel/repo ID."); return; }
    if (!selectedHeadings.length) { alert("Select at least one section."); return; }

    localStorage.setItem("selected_headings", JSON.stringify(selectedHeadings));
    localStorage.setItem("template_type", templateType);

    setLoading(true);

    navigate("/generated-doc", {
      state: {
        boardId: projectId,
        repoId,
        userId,
        templateName: templateName,
        source,
        teamId: localStorage.getItem("teamId") || "",
        selectedHeadings,
        templateType,
        doc_type: templateKey?.toLowerCase(),
        boardName,
      },
    });
  };

  const allSelected = selectedHeadings.length === headings.length && headings.length > 0;

  return (
    // ✅ No min-h-screen, no fixed background div — just fit content height
    <div style={{ backgroundColor: "#fafafa", paddingBottom: "24px" }}>
      <div style={{ maxWidth: "896px", margin: "0 auto", padding: "32px 24px 0" }}>

        {/* Header */}
        <div style={{ marginBottom: "32px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
            <div style={{
              width: "32px", height: "32px", borderRadius: "8px",
              background: "linear-gradient(135deg, #4f46e5, #9333ea)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <FileText size={16} color="white" />
            </div>
            <span style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "0.1em", color: "#6366f1", textTransform: "uppercase" }}>
              Configure
            </span>
          </div>
          <h1 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: "800", color: "#111827", margin: "0 0 4px", lineHeight: 1.1 }}>
            {templateName || "Template"}
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "15px", margin: 0 }}>
            Choose the sections to include in your generated document.
          </p>
        </div>

        {/* Headings card */}
        {headings.length === 0 ? (
          <div style={{
            background: "white", border: "1.5px dashed #e5e7eb",
            borderRadius: "16px", padding: "64px 24px",
            display: "flex", flexDirection: "column", alignItems: "center", gap: "12px"
          }}>
            <CheckSquare size={32} color="#d1d5db" />
            <p style={{ color: "#6b7280", fontWeight: "500", margin: 0 }}>No sections found for this template.</p>
          </div>
        ) : (
          <div style={{
            background: "white", border: "1px solid #e5e7eb",
            borderRadius: "16px", overflow: "hidden", marginBottom: "16px"
          }}>
            {/* Top gradient bar */}
            <div style={{ height: "3px", background: "linear-gradient(to right, #6366f1, #a855f7, #ec4899)" }} />

            {/* Select all row */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 24px", borderBottom: "1px solid #f3f4f6"
            }}>
              <span style={{ fontSize: "13px", fontWeight: "600", color: "#374151" }}>
                {selectedHeadings.length} of {headings.length} selected
              </span>
              <button
                onClick={toggleAll}
                style={{ fontSize: "13px", fontWeight: "600", color: "#6366f1", background: "none", border: "none", cursor: "pointer", padding: 0 }}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            </div>

            {/* Headings list — scrollable, no fixed vh */}
            <div style={{ maxHeight: "320px", overflowY: "auto" }}>
              {headings.map((h, idx) => {
                const isChecked = selectedHeadings.includes(h);
                return (
                  <label
                    key={idx}
                    style={{
                      display: "flex", alignItems: "center", gap: "16px",
                      padding: "14px 24px", cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.5 : 1,
                      backgroundColor: isChecked ? "rgba(238,242,255,0.6)" : "white",
                      borderBottom: idx < headings.length - 1 ? "1px solid #f9fafb" : "none",
                      transition: "background-color 0.1s",
                    }}
                  >
                    {/* Custom checkbox */}
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "6px", flexShrink: 0,
                      border: isChecked ? "2px solid #6366f1" : "2px solid #d1d5db",
                      background: isChecked ? "linear-gradient(135deg, #4f46e5, #9333ea)" : "white",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      transition: "all 0.15s",
                    }}>
                      {isChecked && (
                        <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <input type="checkbox" checked={isChecked} onChange={() => toggle(h)} style={{ display: "none" }} />
                    <span style={{
                      fontSize: "15px", lineHeight: "1.6",
                      color: isChecked ? "#111827" : "#4b5563",
                      fontWeight: isChecked ? "500" : "400",
                    }}>
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
          style={{
            width: "100%", padding: "14px", borderRadius: "12px",
            background: loading || headings.length === 0
              ? "#c4b5fd"
              : "linear-gradient(to right, #4f46e5, #9333ea)",
            color: "white", fontWeight: "600", fontSize: "15px",
            border: "none", cursor: loading || headings.length === 0 ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: "8px",
            transition: "opacity 0.2s",
          }}
        >
          {loading ? (
            <>
              <span style={{
                width: "16px", height: "16px", border: "2px solid white",
                borderTopColor: "transparent", borderRadius: "50%",
                display: "inline-block", animation: "spin 0.7s linear infinite"
              }} />
              Processing…
            </>
          ) : (
            <>
              <Zap size={16} />
              Start Workflow
              <ArrowRight size={16} />
            </>
          )}
        </button>

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
}