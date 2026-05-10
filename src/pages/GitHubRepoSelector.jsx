import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import { ArrowRight, Grid3X3, GitBranch } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function GitHubRepoSelector() {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingRepoId, setLoadingRepoId] = useState(null);
  const [hoveredRepo, setHoveredRepo] = useState(null);

  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  // --------------------------
  // FETCH REPOS
  // --------------------------
  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    try {
      const res = await axios.get(
        `${BACKEND_URL}/github/repos?user_id=${userId}`
      );
      setRepos(res.data.repos || []);
    } catch (err) {
      console.error("Failed to fetch repos:", err);
    }
  };

  // --------------------------
  // SELECT REPO + FETCH CONTEXT
  // --------------------------
  const selectRepo = async (repo) => {
    try {
      setLoading(true);
      setLoadingRepoId(repo.id);

      await axios.post(`${BACKEND_URL}/github/select-repo`, {
        user_id: userId,
        repo: {
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          owner: { login: repo.owner.login },
          default_branch: repo.default_branch,
        },
      });

      const context = await axios.get(
        `${BACKEND_URL}/github/repo-code-context?user_id=${userId}`
      );
      localStorage.setItem("github_context", JSON.stringify(context.data));

      navigate(`/templates/${repo.id}`, {
        state: {
          repoId: repo.id,
          repoName: repo.name,
          fullName: repo.full_name,
          source: "github",
        },
      });
    } catch (err) {
      console.error("Error selecting repo:", err);
    } finally {
      setLoading(false);
      setLoadingRepoId(null);
    }
  };

  // --------------------------
  // UI
  // --------------------------
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
                <FaGithub className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-sm font-bold tracking-widest text-indigo-500 uppercase">
                GitHub Workspace
              </span>
            </div>
            <h1 className="text-5xl sm:text-6xl font-extrabold text-gray-900 tracking-tight">
              Select a Repo
            </h1>
            <p className="mt-2 text-gray-500 text-xl">
              Choose a repository to generate its documentation.
            </p>
          </div>

          {repos.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
              <Grid3X3 className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-semibold text-gray-700">
                {repos.length} repos
              </span>
            </div>
          )}
        </div>

        {/* Loading banner */}
        {loading && (
          <div className="mb-5 flex items-center gap-3 bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm font-semibold px-5 py-3 rounded-xl">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Fetching repo context...
          </div>
        )}

        {/* Empty state */}
        {repos.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-3xl py-24 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <FaGithub className="w-7 h-7 text-gray-300" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-gray-600">No repositories found</p>
              <p className="text-sm text-gray-400 mt-1">
                Connect your GitHub account to see your repositories.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {repos.map((r) => {
              const isHovered = hoveredRepo === r.id;
              const isLoadingThis = loadingRepoId === r.id;
              const c = cardTheme;

              return (
                <div
                  key={r.id}
                  onMouseEnter={() => setHoveredRepo(r.id)}
                  onMouseLeave={() => setHoveredRepo(null)}
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
                  <div className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${c.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-200`} />

                  {/* Repo info */}
                  <div className="flex items-start gap-4 mb-5">
                    <div
                      className={`flex-shrink-0 rounded-xl ${c.light} flex items-center justify-center`}
                      style={{ width: "52px", height: "52px" }}
                    >
                      <FaGithub className={`w-6 h-6 ${c.text}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <h2 className="font-bold text-gray-900 text-lg truncate pr-6">
                        {r.name}
                      </h2>
                      <p className="text-sm text-gray-500 mt-1 truncate">
                        {r.full_name}
                      </p>
                      {r.default_branch && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <GitBranch className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{r.default_branch}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      onClick={() => selectRepo(r)}
                      disabled={loading}
                      className={`text-sm font-semibold ${c.text} ${c.light} px-3 py-1.5 rounded-full hover:opacity-80 transition-opacity disabled:opacity-50`}
                    >
                      {isLoadingThis ? "Loading..." : "Select Repo"}
                    </button>

                    <div
                      onClick={() => !loading && selectRepo(r)}
                      className={`w-7 h-7 rounded-lg flex items-center justify-center bg-gradient-to-br ${c.gradient} shadow-sm transition-transform duration-200 cursor-pointer ${isHovered ? "translate-x-0.5" : ""} ${loading ? "opacity-50 pointer-events-none" : ""}`}
                    >
                      {isLoadingThis ? (
                        <svg className="w-3.5 h-3.5 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      ) : (
                        <ArrowRight className="w-3.5 h-3.5 text-white" />
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}