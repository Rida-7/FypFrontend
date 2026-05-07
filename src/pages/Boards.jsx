import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { FaTrello, FaClipboardList } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Grid3X3 } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function Boards() {
  const navigate = useNavigate();
  const [boards, setBoards]             = useState([]);
  const [hoveredBoard, setHoveredBoard]  = useState(null);
  const tokenHandledRef               = useRef(false);

  // -----------------------------
  // Get userId from localStorage
  // -----------------------------
  const getUserId = () => {
    const raw = localStorage.getItem("userId");
    if (!raw) return null;
    if (raw.startsWith("{") || raw.startsWith("[")) {
      try { return JSON.parse(raw)?._id || null; } catch { return null; }
    }
    return raw;
  };

  // -----------------------------
  // Fetch boards from backend
  // -----------------------------
  const fetchBoards = async () => {
    const userId = getUserId();
    if (!userId) return;

    console.log("Fetching boards for user:", userId);
    try {
      const res = await axios.get(`${BACKEND_URL}/trello/boards_with_headings`, {
        params: { user_id: userId },
      });

      console.log("Boards fetch response:", res.data);
      if (res.data.status === "success") {
        if (res.data.boards.length === 0) {
          console.warn("Trello returned 0 boards. Check token mapping or token validity.");
        }
        setBoards(res.data.boards);
      } else {
        console.warn("Failed to fetch boards:", res.data.message);
      }
    } catch (err) {
      console.error("Error fetching boards:", err);
    }
  };

  // -----------------------------
  // Handle Trello token from URL
  // -----------------------------
  const handleTrelloToken = async () => {
    const userId = getUserId();
    if (!userId || tokenHandledRef.current) return;

    const hash = window.location.hash;
    if (hash.includes("token=")) {
      const params = new URLSearchParams(hash.replace("#", ""));
      const tokenFromUrl = params.get("token");

      if (tokenFromUrl) {
        tokenHandledRef.current = true;
        console.log("Saving Trello token for user:", userId);

        try {
          await axios.post(`${BACKEND_URL}/trello/save_token`, {
            user_id: userId,
            trello_token: tokenFromUrl,
          });

          console.log("Trello token saved");
          window.history.replaceState({}, document.title, "/boards");
          fetchBoards();
        } catch (err) {
          console.error("Failed to save Trello token:", err);
        }
      }
    }
  };

  // -----------------------------
  // Main effect
  // -----------------------------
  useEffect(() => {
    const tryFetch = async () => {
      const userId = getUserId();
      if (!userId) {
        console.warn("userId not found in localStorage, retrying...");
        setTimeout(tryFetch, 1000);
        return;
      }
      console.log("userId found:", userId);
      await handleTrelloToken();
      await fetchBoards();
    };
    tryFetch();
  }, []);

  // -----------------------------
  // Navigate to templates
  // -----------------------------
  const showTemplate = (board) =>
    navigate(`/templates/${board.id}?source=trello`);

  // -----------------------------
  // Card theme
  // -----------------------------
  const cardTheme = {
    gradient: "from-indigo-700 to-purple-700",
    light:    "bg-indigo-50",
    text:     "text-indigo-600",
    glow:     "rgba(99,102,241,0.22)",
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">

      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8 pb-14">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                <FaTrello className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">
                Trello Workspace
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
              Select a Board
            </h1>
            <p className="mt-2 text-gray-500 text-xl">
              Choose a project to explore its documentation templates.
            </p>
          </div>

          {boards.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <Grid3X3 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-gray-700">
                {boards.length} boards
              </span>
            </div>
          )}
        </div>

        {/* Empty state */}
        {boards.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-3xl py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <FaClipboardList className="w-7 h-7 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-600">No boards connected</p>
              <p className="text-sm text-gray-400 mt-1">
                Head to Integrations and connect your Trello account.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {boards.map((board) => {
              const isHovered = hoveredBoard === board.id;
              const c         = cardTheme;

              return (
                <div
                  key={board.id}
                  onMouseEnter={() => setHoveredBoard(board.id)}
                  onMouseLeave={() => setHoveredBoard(null)}
                  className="group relative bg-white border border-gray-200 rounded-2xl p-7 transition-all duration-200 overflow-hidden"
                  style={{
                    boxShadow: isHovered
                      ? `0 8px 30px ${c.glow}, 0 1px 3px rgba(0,0,0,0.06)`
                      : "0 1px 3px rgba(0,0,0,0.04)",
                    transform:   isHovered ? "translateY(-2px)" : "translateY(0)",
                    borderColor: isHovered ? "transparent" : undefined,
                    outline:     isHovered ? "1.5px solid rgba(99,102,241,0.4)" : "none",
                  }}
                >
                  {/* Top gradient bar on hover */}
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

                  {/* Board info */}
                  <div className="flex items-start gap-4 mb-5">
                    <div
                      className={`flex-shrink-0 rounded-xl ${c.light} flex items-center justify-center`}
                      style={{ width: "52px", height: "52px" }}
                    >
                      <FaClipboardList className={`w-6 h-6 ${c.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-900 text-lg truncate pr-6">
                        {board.name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {board.desc || "No description — click to explore templates for this board."}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      onClick={() => showTemplate(board)}
                      className={`text-sm font-semibold ${c.text} ${c.light} px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity`}
                    >
                      View Templates
                    </button>

                    <div
                      onClick={() => showTemplate(board)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${c.gradient} shadow-sm transition-transform duration-200 cursor-pointer ${isHovered ? "translate-x-0.5" : ""}`}
                    >
                      <ArrowRight className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}