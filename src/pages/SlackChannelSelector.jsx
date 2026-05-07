import React, { useState, useEffect } from "react";
import axios from "axios";
import { FaSlack, FaCheckCircle } from "react-icons/fa";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = "https://autodocgen2-production-8e78.up.railway.app";

export default function SlackChannelSelector() {
  const navigate = useNavigate();

  const [channels, setChannels] = useState([]);
  const [toast, setToast] = useState(false);
  const [teamId, setTeamId] = useState(null);
  const [error, setError] = useState(null);

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
  // INIT AUTH STATE (IMPORTANT FIX)
  // =========================
  useEffect(() => {
    const rawUser = localStorage.getItem("userId");
    const rawTeam = localStorage.getItem("teamId");

    // ❌ No login → show error instead of redirect loop
    if (!rawUser) {
      setError("AUTH_ERROR");
      return;
    }

    // ❌ No workspace → show error instead of redirect loop
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

    const teamFromURL =
      params.get("team_id") || params.get("teamId");

    if (teamFromURL) {
      localStorage.setItem("teamId", teamFromURL);
      setTeamId(teamFromURL);
    }

    // clean URL after capturing
    window.history.replaceState({}, document.title, "/slack");
  }, []);

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
        } else {
          console.warn("Slack error:", res.data);
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
    navigate(`/templates/${channelId}?source=slack`);
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

    // go to generated doc page (same pattern as Trello)
    setTimeout(() => {
      navigate(
        `/generated-doc?boardId=${channelId}&templateName=default_slack_template&userId=${userId}&source=slack&teamId=${teamId}`
      );
    }, 600);

  } catch (err) {
    console.error("Workflow start error:", err);
    alert("Failed to start workflow");
  }
};
  // =========================
  // ERROR UI (NO LOGIN LOOP ANYMORE)
  // =========================
  if (error === "AUTH_ERROR") {
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>
        <h2>Session expired</h2>
        <p>Please login again</p>
        <button onClick={() => (window.location.href = "/login")}>
          Go to Login
        </button>
      </div>
    );
  }

  if (error === "NO_WORKSPACE") {
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>
        <h2>No Slack Workspace Connected</h2>
        <p>Please connect Slack to continue</p>
        <button
          onClick={() =>
            (window.location.href =
              "https://autodocgen2-production-8e78.up.railway.app/slack/connect?user_id=" +
              userId)
          }
        >
          Connect Slack
        </button>
      </div>
    );
  }

  // =========================
  // LOADING GUARD
  // =========================
  if (!teamId) {
    return (
      <div style={{ textAlign: "center", marginTop: "5rem" }}>
        <h2>Loading Slack workspace...</h2>
      </div>
    );
  }

  // =========================
  // UI
  // =========================
  return (
    <div style={{ padding: "3rem" }}>
      <div style={{ textAlign: "center", marginBottom: "2rem" }}>
        <FaSlack size={50} color="#4A154B" />
        <h1>Your Slack Channels</h1>
        <p>Select a channel to generate document</p>
      </div>

      {channels.length === 0 ? (
        <p style={{ textAlign: "center" }}>
          No channels found or bot not added yet.
        </p>
      ) : (
        channels.map((ch) => (
          <div
            key={ch.id}
            style={{
              border: "1px solid #ddd",
              padding: "1rem",
              marginBottom: "1rem",
              borderRadius: "8px",
            }}
          >
            <h3>{ch.name}</h3>
            <p>{ch.topic || "No description"}</p>

            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => showTemplates(ch.id)}>
                Show Templates
              </button>

              <button onClick={() => runWorkflow(ch.id)}>
                Run Workflow
              </button>
            </div>
          </div>
        ))
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            background: "green",
            color: "white",
            padding: "10px 15px",
            borderRadius: "8px",
          }}
        >
          <FaCheckCircle /> Workflow Completed
        </div>
      )}
    </div>
  );
}