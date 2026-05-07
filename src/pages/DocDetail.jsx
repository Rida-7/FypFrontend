import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import axios from "axios";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function DocumentDetail() {
  const { template_name }      = useParams();
  const templateName           = template_name;
  const [searchParams]         = useSearchParams();
  const [formattedContent, setFormattedContent] = useState([]);
  const [loading, setLoading]  = useState(true);
  const [feedback, setFeedback]   = useState("");
  const [improving, setImproving] = useState(false);

  const source = searchParams.get("source");
  const teamId = searchParams.get("teamId");

  // Read userId from localStorage (same logic as original file 2)
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

  const userId    = getUserId();
  const projectId = searchParams.get("projectId");
  const boardName = searchParams.get("boardName") || projectId;

  console.log("Fetching doc with:", { userId, projectId, templateName });

  useEffect(() => {
    if (!userId || !projectId || !templateName) return;
    fetchGeneratedDoc();
  }, [userId, projectId, templateName]);

  const fetchGeneratedDoc = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/workflow/generated`, {
        params: {
          user_id: userId,
          project_id: projectId,
          template_name: templateName,
          source: source,
          team_id: teamId,
        },
      });
      if (res.data.status === "success") {
        setFormattedContent(applyFormatting(res.data.generated_docs));
      } else {
        setFormattedContent([{ text: "No document found.", type: "error" }]);
      }
    } catch (err) {
      console.error("Error fetching doc:", err);
      setFormattedContent([{ text: "Error loading document.", type: "error" }]);
    } finally {
      setLoading(false);
    }
  };

  const improveDocument = async () => {
    if (!feedback.trim()) {
      alert("Please enter feedback first");
      return;
    }
    setImproving(true);
    try {
      const res = await axios.post(
        `${BACKEND_URL}/workflow/improve-with-feedback`,
        {
          user_id: userId,
          project_id: projectId,
          template_name: templateName,
          feedback: feedback,
        }
      );
      if (res.data.status === "success") {
        alert("✅ Document improved!");
        fetchGeneratedDoc();
        setFeedback("");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Failed to improve document");
    } finally {
      setImproving(false);
    }
  };

  const applyFormatting = (text) =>
    text
      .split(/\n+/)
      .filter((l) => l.trim() && l.trim() !== "---")
      .map((line, idx) => {
        const clean = line.replace(/[*_`#]/g, "").trim();
        if (/^\d+\./.test(line))   return { id: idx, text: clean.replace(/^\d+\.\s*/, ""), type: "list-number" };
        if (/^[-*]\s+/.test(line)) return { id: idx, text: clean.replace(/^[-*]\s+/, ""), type: "list-bullet" };
        if (/^#/.test(line)) {
          const level = line.match(/^#+/)[0].length;
          return { id: idx, text: clean.replace(/^#+\s*/, ""), type: `h${level}` };
        }
        return { id: idx, text: clean, type: "text" };
      });

  const renderGroupedContent = () => {
    const elements = [];
    let currentList = null;

    formattedContent.forEach((item) => {
      if (item.type === "list-bullet" || item.type === "list-number") {
        if (!currentList) currentList = { type: item.type === "list-bullet" ? "ul" : "ol", items: [] };
        currentList.items.push(item);
      } else {
        if (currentList) { elements.push(currentList); currentList = null; }
        elements.push(item);
      }
    });
    if (currentList) elements.push(currentList);

    return elements.map((item, i) => {
      if (item.type === "ul") return (
        <ul key={i} className="my-3 space-y-2 ml-1">
          {item.items.map((li) => (
            <li key={li.id} className="flex items-start gap-2.5 text-gray-600 text-[15px] leading-relaxed">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
              {li.text}
            </li>
          ))}
        </ul>
      );
      if (item.type === "ol") return (
        <ol key={i} className="my-3 space-y-2 ml-1">
          {item.items.map((li, n) => (
            <li key={li.id} className="flex items-start gap-3 text-gray-600 text-[15px] leading-relaxed">
              <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold flex items-center justify-center">{n + 1}</span>
              {li.text}
            </li>
          ))}
        </ol>
      );
      if (item.type === "error") return (
        <div key={i} className="flex items-center gap-3 text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm font-medium">{item.text}</div>
      );
      switch (item.type) {
        case "h1": return (
          <div key={i} className="mt-10 mb-3 first:mt-0">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">{item.text}</h1>
            <div className="mt-2 h-0.5 w-full bg-gradient-to-r from-indigo-200 via-purple-200 to-transparent rounded-full" />
          </div>
        );
        case "h2": return (
          <h2 key={i} className="text-lg font-bold text-gray-800 mt-8 mb-2 flex items-center gap-2">
            <span className="w-1 h-5 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500 inline-block flex-shrink-0" />
            {item.text}
          </h2>
        );
        case "h3": return <h3 key={i} className="text-base font-semibold text-gray-700 mt-5 mb-1.5">{item.text}</h3>;
        default:   return <p key={i} className="text-gray-600 text-[15px] leading-relaxed mb-3">{item.text}</p>;
      }
    });
  };

  if (loading) return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
        <p className="text-gray-500 font-medium">Loading document…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8 pb-20">
        {/* Back link */}
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-indigo-600 transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to documents
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">Document</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            {templateName || "Generated Document"}
          </h1>
          {boardName && (
            <p className="mt-2 text-gray-500 text-lg">
              Project · <span className="font-semibold text-gray-700">{boardName}</span>
            </p>
          )}
        </div>

        {/* Document content */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
          <div className="px-8 py-8">{renderGroupedContent()}</div>
        </div>

        {/* Improve document section */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="h-1 w-full bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500" />
          <div className="px-8 py-6">
            <h2 className="text-lg font-bold text-gray-800 mb-1 flex items-center gap-2">
              <span className="w-1 h-5 rounded-full bg-gradient-to-b from-purple-500 to-pink-500 inline-block flex-shrink-0" />
              Improve Document
            </h2>
            <p className="text-sm text-gray-400 mb-4">
              Give feedback and the AI will regenerate an improved version.
            </p>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="e.g. make it more structured, add risks section, improve clarity…"
              className="w-full border border-gray-200 rounded-xl p-4 text-[15px] text-gray-700 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent resize-none transition mb-4"
              rows={4}
            />
            <button
              onClick={improveDocument}
              disabled={improving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
            >
              {improving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Improving…
                </>
              ) : (
                "Improve Document"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}