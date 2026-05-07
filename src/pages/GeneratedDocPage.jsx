import React, { useEffect, useState, useRef } from "react";
import { useSearchParams, useLocation, Link } from "react-router-dom";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, FileText, RefreshCw, Send, CheckCircle2 } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ── Input parser (Doc 7) ──────────────────────────────────────────────────────
const parseInput = (input) => {
  const match = input.match(/Add:(.*)/i);
  const new_headings = match
    ? match[1].split(",").map((h) => h.trim()).filter(Boolean)
    : [];
  return { user_feedback: input, new_headings };
};

export default function GeneratedDocPage() {
  const [searchParams] = useSearchParams();
  const location       = useLocation();

  // ── Params: prefer location.state, fall back to searchParams ────────────────
  const boardId      = location.state?.boardId      || searchParams.get("boardId");
  const userId       = location.state?.userId       || searchParams.get("userId");
  const templateName = location.state?.templateName || searchParams.get("templateName");
  const teamId       = location.state?.teamId       || searchParams.get("teamId");
  const source       = location.state?.source       || searchParams.get("source") || "trello";

  const selectedHeadings =
    location.state?.selectedHeadings ||
    JSON.parse(localStorage.getItem("selected_headings") || "[]");

  // ── State ────────────────────────────────────────────────────────────────────
  const [messages, setMessages]           = useState([]);
  const [loading, setLoading]             = useState(false);
  const [interruptData, setInterruptData] = useState(null);
  const [userInput, setUserInput]         = useState("");

  const hasStarted = useRef(false);
  const inputRef   = useRef(null);
  const bottomRef  = useRef(null);

  const isFinal = messages.some((m) => m.content?.includes("Document marked as FINAL"));

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-focus input when interrupt arrives
  useEffect(() => {
    if (interruptData && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 50);
    }
  }, [interruptData]);

  // Auto-start workflow once
  useEffect(() => {
    if (hasStarted.current) return;
    if (!boardId || !userId || !templateName) return;
    hasStarted.current = true;
    startWorkflow();
  }, []);

  // ── Response handler ──────────────────────────────────────────────────────────
  const handleResponse = (data) => {
    if (data.status === "waiting_for_user") {
      const interrupt = data.interrupt?.value;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: interrupt?.final_doc || "Document generated" },
        { role: "system",    content: interrupt?.message   || "Review required" },
      ]);
      setInterruptData(interrupt);
      return;
    }

    const doc = data?.data?.final_doc || data?.data?.draft_doc || "";
    if (!doc) return;
    setMessages((prev) => [...prev, { role: "assistant", content: doc }]);
  };

  // ── Start workflow ────────────────────────────────────────────────────────────
  const startWorkflow = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/workflow/start`, {
        project_id:        boardId,
        user_id:           userId,
        template:          templateName,
        source,
        team_id:           teamId,
        selected_headings: selectedHeadings,
        pdf_headings:      selectedHeadings,
      });
      handleResponse(res.data);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [...prev, { role: "system", content: "Failed to start workflow." }]);
    } finally {
      setLoading(false);
    }
  };

  // ── Finalize ──────────────────────────────────────────────────────────────────
  const handleFinalize = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${BACKEND_URL}/workflow/resume`, {
        user_id:    userId,
        project_id: boardId,
        template:   templateName,
        source,
        team_id:    teamId,
        user_input: "FINALIZE",
        is_final:   true,
      });
      handleResponse(res.data);
      setMessages((prev) => [...prev, { role: "system", content: "Document marked as FINAL" }]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Send feedback ─────────────────────────────────────────────────────────────
  const handleSendFeedback = async () => {
    if (!userInput.trim()) return;
    const { user_feedback, new_headings } = parseInput(userInput);

    setMessages((prev) => [...prev, { role: "user", content: userInput }]);
    setUserInput("");
    setLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/workflow/resume`, {
        user_id:    userId,
        project_id: boardId,
        template:   templateName,
        source,
        team_id:    teamId,
        user_input: user_feedback,
        new_headings,
      });
      handleResponse(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ── Initial loading screen ────────────────────────────────────────────────────
  if (loading && messages.length === 0) return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
        <p className="text-gray-500 font-medium">Generating your document…</p>
        <p className="text-gray-400 text-sm mt-1">This may take a moment</p>
      </div>
    </div>
  );

  // ── Main UI ───────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col">

      {/* Background glow */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-4xl w-full mx-auto px-6 pt-8 pb-6 flex flex-col flex-1 min-h-0">

        {/* Back link */}
        <Link
          to="/documents"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-indigo-600 transition-colors mb-6 group w-fit"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
          Back to documents
        </Link>

        {/* Page header */}
        <div className="mb-6">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">
              Generated Document
            </span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 tracking-tight">
            {templateName || "Document"}
          </h1>
        </div>

        {/* Chat card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">

          {/* Top accent bar */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 flex-shrink-0" />

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-5 min-h-0">
            {messages.map((msg, i) => {
              if (msg.role === "assistant") return (
                <div key={i} className="prose prose-sm max-w-none text-gray-700 leading-relaxed
                  prose-headings:font-bold prose-headings:text-gray-900
                  prose-h1:text-2xl prose-h1:mt-8 prose-h1:mb-3
                  prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-2
                  prose-h3:text-base prose-h3:mt-4 prose-h3:mb-1
                  prose-p:text-gray-600 prose-p:leading-relaxed
                  prose-li:text-gray-600 prose-strong:text-gray-800
                ">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              );

              if (msg.role === "system") return (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium border ${
                    msg.content.includes("FINAL")
                      ? "bg-green-50 border-green-100 text-green-700"
                      : "bg-amber-50 border-amber-100 text-amber-700"
                  }`}
                >
                  {msg.content.includes("FINAL")
                    ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    : <RefreshCw className="w-4 h-4 flex-shrink-0" />
                  }
                  {msg.content}
                </div>
              );

              if (msg.role === "user") return (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[75%] bg-gradient-to-br from-indigo-600 to-purple-600 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-2.5 leading-relaxed shadow-sm">
                    {msg.content}
                  </div>
                </div>
              );

              return null;
            })}

            {/* Typing indicator */}
            {loading && (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                AI is thinking…
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4 flex flex-col gap-3">

            {/* Finalize button */}
            {interruptData && !isFinal && (
              <div className="flex justify-end">
                <button
                  onClick={handleFinalize}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Final
                </button>
              </div>
            )}

            {/* Feedback row */}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isFinal || loading}
                placeholder={
                  isFinal
                    ? "Document finalized."
                    : "Write feedback… or type Add: heading1, heading2 to add sections"
                }
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && userInput.trim()) handleSendFeedback();
                }}
              />
              <button
                onClick={handleSendFeedback}
                disabled={loading || isFinal || !userInput.trim()}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}