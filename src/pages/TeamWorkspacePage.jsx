import React, { useEffect, useState } from "react";
import axios from "axios";
import { Users, Copy, Check, UserMinus, Crown, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

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

export default function TeamWorkspacePage() {
  const userId = getUserId();
  const navigate = useNavigate();

  const [step, setStep] = useState("loading"); 
  // steps: loading | setup | join | dashboard

  const [workspaceName, setWorkspaceName]   = useState("");
  const [joinCode, setJoinCode]             = useState("");
  const [workspace, setWorkspace]           = useState(null);
  const [isOwner, setIsOwner]               = useState(false);
  const [memberDetails, setMemberDetails]   = useState({});
  const [copied, setCopied]                 = useState(false);
  const [joinMessage, setJoinMessage]       = useState("");
  const [actionLoading, setActionLoading]   = useState(false);

  // ======================================================
  // ON MOUNT — check if user already has a workspace
  // ======================================================
  useEffect(() => {
    checkWorkspace();
  }, []);

  const checkWorkspace = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/workspace/my`, {
        params: { user_id: userId }
      });

      if (res.data.status === "not_found") {
        // Check if user has team plan (owner) or not (member wanting to join)
        const subRes = await axios.get(`${BACKEND_URL}/subscription/status`, {
          params: { user_id: userId }
        });

        if (subRes.data.plan === "team") {
          setStep("setup"); // Owner — needs to name their workspace
        } else {
          setStep("join");  // Non-owner — needs to enter invite code
        }

      } else {
        // Already in a workspace
        setWorkspace(res.data.workspace);
        setIsOwner(res.data.is_owner);
        fetchMemberDetails(res.data.workspace.members);
        setStep("dashboard");
      }
    } catch (err) {
      console.error(err);
      setStep("join");
    }
  };

  // ======================================================
  // FETCH MEMBER NAMES/EMAILS
  // ======================================================
  const fetchMemberDetails = async (memberIds) => {
    try {
      const res = await axios.post(`${BACKEND_URL}/workspace/member-details`, {
        member_ids: memberIds
      });
      const map = {};
      res.data.members?.forEach((m) => {
        map[m.user_id] = m.name || m.email || m.user_id;
      });
      setMemberDetails(map);
    } catch {
      // silently fail, IDs still show
    }
  };

  // ======================================================
  // STEP 1 (OWNER): CREATE WORKSPACE
  // ======================================================
  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) return;
    setActionLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/workspace/create`, {
        user_id: userId,
        name: workspaceName.trim()
      });

      setWorkspace(res.data.workspace);
      setIsOwner(true);
      fetchMemberDetails(res.data.workspace.members);
      setStep("dashboard");

    } catch (err) {
      alert(err.response?.data?.detail || "Failed to create workspace");
    } finally {
      setActionLoading(false);
    }
  };

  // ======================================================
  // STEP 1 (MEMBER): JOIN WORKSPACE
  // ======================================================
  const handleJoinWorkspace = async () => {
    if (!joinCode.trim()) return;
    setActionLoading(true);
    setJoinMessage("");

    try {
      const res = await axios.post(`${BACKEND_URL}/workspace/join`, {
        user_id: userId,
        invite_code: joinCode.trim()
      });

      setJoinMessage("✅ " + res.data.message);
      setTimeout(() => checkWorkspace(), 1000);

    } catch (err) {
      setJoinMessage("❌ " + (err.response?.data?.detail || "Failed to join"));
    } finally {
      setActionLoading(false);
    }
  };

  // ======================================================
  // COPY INVITE CODE
  // ======================================================
  const copyCode = () => {
    navigator.clipboard.writeText(workspace?.invite_code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ======================================================
  // REMOVE MEMBER
  // ======================================================
  const handleRemove = async (memberId) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await axios.post(`${BACKEND_URL}/workspace/remove-member`, {
        owner_id: userId,
        member_id: memberId
      });
      checkWorkspace();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to remove");
    }
  };

  // ======================================================
  // LOADING
  // ======================================================
  if (step === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  // ======================================================
  // STEP: SETUP (owner names their workspace)
  // ======================================================
  if (step === "setup") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Crown size={28} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Create Your Workspace
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Give your team workspace a name. You'll get an invite code to share with teammates.
            </p>
          </div>

          <input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder="e.g. Momina's Dev Team"
            className="w-full border rounded-xl px-4 py-3 mb-6 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreateWorkspace()}
          />

          <button
            onClick={handleCreateWorkspace}
            disabled={actionLoading || !workspaceName.trim()}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading ? "Creating..." : (
              <>Create Workspace <ArrowRight size={16} /></>
            )}
          </button>
        </motion.div>
      </div>
    );
  }

  // ======================================================
  // STEP: JOIN (teammate enters invite code)
  // ======================================================
  if (step === "join") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl p-10 w-full max-w-md"
        >
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">
              Join a Workspace
            </h2>
            <p className="text-gray-500 text-sm mt-2">
              Ask your team owner for the invite code and enter it below.
            </p>
          </div>

          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter invite code (e.g. aB3xK9mQ)"
            className="w-full border rounded-xl px-4 py-3 mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono tracking-widest"
            onKeyDown={(e) => e.key === "Enter" && handleJoinWorkspace()}
          />

          {joinMessage && (
            <p className="text-sm mb-4 text-center">{joinMessage}</p>
          )}

          <button
            onClick={handleJoinWorkspace}
            disabled={actionLoading || !joinCode.trim()}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {actionLoading ? "Joining..." : (
              <>Join Workspace <ArrowRight size={16} /></>
            )}
          </button>

          <p className="text-center text-xs text-gray-400 mt-4">
            Don't have a code? Ask your team owner to share it with you.
          </p>
        </motion.div>
      </div>
    );
  }

  // ======================================================
  // STEP: DASHBOARD (workspace overview)
  // ======================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users size={28} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {workspace?.name}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {workspace?.member_count} / 5 members
          </p>
        </motion.div>

        {/* INVITE CODE CARD — owner only */}
        {isOwner && workspace?.invite_code && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl shadow-lg p-6 mb-6 border border-indigo-100"
          >
            <div className="flex items-center gap-2 mb-2">
              <Crown size={16} className="text-indigo-600" />
              <h3 className="font-bold text-gray-900">Invite Code</h3>
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Share this code with teammates. They sign up, go to{" "}
              <span className="font-mono bg-gray-100 px-1 rounded">
                /workspace
              </span>{" "}
              and enter this code to join.
            </p>

            <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-5 py-4">
              <span className="flex-1 font-mono text-2xl font-bold text-indigo-700 tracking-widest">
                {workspace.invite_code}
              </span>
              <button
                onClick={copyCode}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
              >
                {copied ? (
                  <><Check size={14} /> Copied!</>
                ) : (
                  <><Copy size={14} /> Copy</>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* MEMBERS LIST */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 mb-6"
        >
          <h3 className="font-bold text-gray-900 mb-5">
            Team Members ({workspace?.member_count})
          </h3>

          <div className="space-y-3">
            {workspace?.members?.map((memberId, i) => (
              <div
                key={memberId}
                className="flex items-center justify-between bg-gray-50 rounded-2xl px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                    {(memberDetails[memberId] || memberId)[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {memberDetails[memberId] || memberId}
                    </p>
                    <div className="flex gap-2">
                      {memberId === userId && (
                        <span className="text-xs text-indigo-500">You</span>
                      )}
                      {memberId === workspace?.owner_id && (
                        <span className="text-xs text-yellow-600 font-medium">Owner</span>
                      )}
                    </div>
                  </div>
                </div>

                {isOwner && memberId !== userId && (
                  <button
                    onClick={() => handleRemove(memberId)}
                    className="text-red-400 hover:text-red-600 transition"
                    title="Remove member"
                  >
                    <UserMinus size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {workspace?.member_count < 5 && isOwner && (
            <p className="text-xs text-gray-400 text-center mt-4">
              {5 - workspace.member_count} slot(s) remaining
            </p>
          )}
        </motion.div>

        {/* GO TO APP BUTTON */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <button
            onClick={() => navigate("/dashboard")}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-3 rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            Go to Dashboard →
          </button>
        </motion.div>

      </div>
    </div>
  );
}