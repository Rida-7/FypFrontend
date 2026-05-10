import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSlack, FaCheckCircle, FaHashtag } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Grid3X3 } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function SlackChannelSelector() {
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [toast, setToast] = useState(false);
  const [teamId, setTeamId] = useState(null);
  const [error, setError] = useState(null);
  const [hoveredChannel, setHoveredChannel] = useState(null);

  // =========================
  // USER ID
  // =========================
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

  const userId = getUserId();

  // =========================
  // INIT AUTH STATE
  // =========================
  useEffect(() => {
    const rawUser = localStorage.getItem("userId");
    const rawTeam = localStorage.getItem("teamId");

    if (!rawUser) {
      setError("AUTH_ERROR");
      return;
    }

    if (!rawTeam) {
      setError("NO_WORKSPACE");
      return;
    }

    localStorage.setItem("source", "slack");
    setTeamId(rawTeam);
  }, []);

  // =========================
  // HANDLE OAUTH REDIRECT
  // =========================
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamFromURL = params.get("team_id") || params.get("teamId");

    if (teamFromURL) {
      localStorage.setItem("teamId", teamFromURL);
      setTeamId(teamFromURL);
    }

    window.history.replaceState({}, document.title, "/slack");
  }, []);

  // =========================
  // CLEANUP SAFETY
  // =========================
  useEffect(() => {
    return () => {
      setChannels([]);
    };
  }, [teamId]);

  // =========================
  // FETCH CHANNELS
  // =========================
  useEffect(() => {
    if (!userId || !teamId) return;

    const fetchChannels = async () => {
      try {
        const res = await axios.get(
          `${BACKEND_URL}/slack/channels_with_headings`,
          {
            params: {
              user_id: userId,
              team_id: teamId,
            },
          }
        );

        if (res.data.status === "success") {
          setChannels(res.data.channels || []);
        }
      } catch (err) {
        console.error("Failed to fetch channels:", err);
      }
    };

    fetchChannels();
  }, [userId, teamId]);

  // =========================
  // NAVIGATION
  // =========================
  const showTemplates = (channelId) => {
    if (!channelId) return;
    localStorage.setItem("channelId", channelId);
    navigate(`/templates/${channelId}?source=slack`, {
      state: { source: "slack", channelId },
    });
  };

  const runWorkflow = async (channelId) => {
    if (!userId || !teamId) {
      alert("Missing user or workspace");
      return;
    }

    try {
      await axios.post(`${BACKEND_URL}/workflow/start`, {
        user_id: userId,
        project_id: channelId,
        source: "slack",
        team_id: teamId,
        template: "default_slack_template",
      });

      setToast(true);
      setTimeout(() => setToast(false), 2000);

      setTimeout(() => {
        navigate(
          `/generated-doc?boardId=${channelId}&templateName=default_slack_template&userId=${userId}&source=slack&teamId=${teamId}`,
          { state: { source: "slack", boardId: channelId, userId, teamId } }
        );
      }, 600);
    } catch (err) {
      console.error("Workflow start error:", err);
      alert("Failed to start workflow");
    }
  };

  // =========================
  // ERROR UI
  // =========================
  if (error === "AUTH_ERROR") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <FaSlack className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Session Expired</h2>
          <p className="text-gray-500 mb-6">Please login again to continue.</p>
          <button
            onClick={() => (window.location.href = "/login")}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (error === "NO_WORKSPACE") {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-3xl p-12 text-center shadow-sm max-w-sm mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <FaSlack className="w-6 h-6 text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Slack Workspace</h2>
          <p className="text-gray-500 mb-6">Connect your Slack workspace to continue.</p>
          <button
            onClick={() =>
              (window.location.href = `${BACKEND_URL}/slack/auth/connect?user_id=${userId}`)
            }
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            Connect Slack
          </button>
        </div>
      </div>
    );
  }

  if (!teamId) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-gray-500 font-medium">Loading Slack workspace...</p>
      </div>
    );
  }

  // =========================
  // MAIN UI
  // =========================
  const cardTheme = {
    gradient: "from-indigo-700 to-purple-700",
    light: "bg-indigo-50",
    text: "text-indigo-600",
    glow: "rgba(99,102,241,0.22)",
  };

  return (
    <div className="min-h-screen bg-[#fafafa]">

      {/* Background radial */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      <div className="max-w-4xl mx-auto px-6 pt-8 pb-14">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
                <FaSlack className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">
                Slack Workspace
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
              Select a Channel
            </h1>
            <p className="mt-2 text-gray-500 text-xl">
              Choose a channel to generate its document.
            </p>
          </div>

          {channels.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <Grid3X3 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-gray-700">
                {channels.length} channels
              </span>
            </div>
          )}
        </div>

        {/* Empty state */}
        {channels.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-3xl py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <FaHashtag className="w-7 h-7 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-600">No channels found</p>
              <p className="text-sm text-gray-400 mt-1">
                Make sure the bot is added to your Slack channels.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {channels.map((ch) => {
              const isHovered = hoveredChannel === ch.id;
              const c = cardTheme;

              return (
                <div
                  key={ch.id}
                  onMouseEnter={() => setHoveredChannel(ch.id)}
                  onMouseLeave={() => setHoveredChannel(null)}
                  className="group relative bg-white border border-gray-200 rounded-2xl p-7 transition-all duration-200 overflow-hidden"
                  style={{
                    boxShadow: isHovered
                      ? `0 8px 30px ${c.glow}, 0 1px 3px rgba(0,0,0,0.06)`
                      : "0 1px 3px rgba(0,0,0,0.04)",
                    transform: isHovered ? "translateY(-2px)" : "translateY(0)",
                    borderColor: isHovered ? "transparent" : undefined,
                    outline: isHovered ? "1.5px solid rgba(99,102,241,0.4)" : "none",
                  }}
                >
                  {/* Top gradient bar on hover */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`}
                  />

                  {/* Channel info */}
                  <div className="flex items-start gap-4 mb-5">
                    <div
                      className={`flex-shrink-0 rounded-xl ${c.light} flex items-center justify-center`}
                      style={{ width: "52px", height: "52px" }}
                    >
                      <FaHashtag className={`w-6 h-6 ${c.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-900 text-lg truncate pr-6">
                        # {ch.name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1.5 line-clamp-2 leading-relaxed">
                        {ch.topic || "No description — click to explore templates for this channel."}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex gap-2">
                      <button
                        onClick={() => showTemplates(ch.id)}
                        className={`text-sm font-semibold ${c.text} ${c.light} px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity`}
                      >
                        Show Templates
                      </button>
                    </div>

                    <div
                      onClick={() => showTemplates(ch.id)}
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

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 bg-emerald-500 text-white px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg text-sm font-semibold">
          <FaCheckCircle className="w-4 h-4" />
          Workflow Completed
        </div>
      )}

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