import React, { useState, useEffect } from "react";
import {
  FileText,
  Plus,
  Search,
  Grid3x3,
  List,
  Clock,
  Settings,
  LogOut,
  ChevronDown,
  FolderOpen,
  Sparkles,
  BarChart3,
  AlertCircle,
  Link as LinkIcon,
  Play,
  Eye,
  Github,
  MessageSquare,
  CheckCircle2,
  XCircle,
  ArrowRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { getMe } from "../api";
import NotificationBell from "../components/NotificationBell";

const BACKEND_URL = "https://autodocgen2-production-8e78.up.railway.app";

// ── Integration config — add more tools here later ───────────────────────────
const INTEGRATIONS = [
  {
    key: "trello",
    name: "Trello",
    color: "#0079BF",
    lightBg: "#E6F3FB",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M21 0H3C1.343 0 0 1.343 0 3v18c0 1.657 1.343 3 3 3h18c1.657 0 3-1.343 3-3V3c0-1.657-1.343-3-3-3zM10.44 18.18c0 .795-.645 1.44-1.44 1.44H4.56c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44H9c.795 0 1.44.645 1.44 1.44v13.62zm10.44-6c0 .795-.645 1.44-1.44 1.44H15c-.795 0-1.44-.645-1.44-1.44V4.56c0-.795.645-1.44 1.44-1.44h4.44c.795 0 1.44.645 1.44 1.44v7.62z" />
      </svg>
    ),
    connected: true,
    linkTo: "/boards",
    connectPath: "/integrations",
    description: "Boards & cards",
  },
  {
    key: "jira",
    name: "Jira",
    color: "#2684FF",
    lightBg: "#E6F0FF",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
        <path d="M11.975 0C5.36 0 0 5.36 0 11.975c0 6.614 5.36 11.974 11.975 11.974 6.614 0 11.974-5.36 11.974-11.974C23.95 5.36 18.589 0 11.975 0zm-.84 17.418l-4.577-4.577 1.413-1.413 3.164 3.164 6.32-6.32 1.413 1.413-7.733 7.733z" />
      </svg>
    ),
    connected: false,
    linkTo: "/integrations",
    connectPath: "/integrations",
    description: "Issues & sprints",
  },
  {
    key: "github",
    name: "GitHub",
    color: "#24292E",
    lightBg: "#F0F0F0",
    icon: <Github size={18} />,
    connected: false,
    linkTo: "/integrations",
    connectPath: "/integrations",
    description: "PRs & repos",
  },
  {
    key: "slack",
    name: "Slack",
    color: "#611F69",
    lightBg: "#F3EAF5",
    icon: <MessageSquare size={18} />,
    connected: false,
    linkTo: "/integrations",
    connectPath: "/integrations",
    description: "Messages & threads",
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const getUserId = () => {
  const raw = localStorage.getItem("userId");
  if (!raw) return null;
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try { return JSON.parse(raw)?._id || null; } catch { return null; }
  }
  return raw;
};

const getStatusColor = (status) => {
  if (!status) return "bg-gray-100 text-gray-600 border-gray-200";
  switch (status.toLowerCase()) {
    case "completed": return "bg-green-100 text-green-700 border-green-200";
    case "in-progress": return "bg-blue-100 text-blue-700 border-blue-200";
    case "review": return "bg-yellow-100 text-yellow-700 border-yellow-200";
    default: return "bg-gray-100 text-gray-600 border-gray-200";
  }
};

// ── Sidebar NavLink ───────────────────────────────────────────────────────────
function NavLink({ to, icon, children, active }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? "bg-indigo-50 text-indigo-700"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <span className={active ? "text-indigo-600" : "text-gray-400"}>{icon}</span>
      {children}
    </Link>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [openDropdown, setOpenDropdown] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [boards, setBoards] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [stats, setStats] = useState({
    totalDocs: 0,
    activeProjects: 0,
    aiGenerated: 0,
    trelloBoards: 0,
  });
  const navigate = useNavigate();
  const userId = getUserId();

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getMe();
        const userData = res?.data?.user || res?.data;
        if (userData?._id) {
          setUser(userData);
          localStorage.setItem("userId", userData._id);
        } else {
          navigate("/signin");
        }
      } catch {
        navigate("/signin");
      }
    };
    fetchUser();
  }, [navigate]);

  // ── Docs ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchDocuments = async () => {
      const uid = user?._id || userId;
      if (!uid) return;
      try {
        const res = await axios.get(`${BACKEND_URL}/generated-docs/all`, {
          params: { user_id: uid },
        });
        if (res.data.documents) {
          setDocuments(res.data.documents);
          const totalDocs = res.data.documents.length;
          const uniqueProjects = new Set(res.data.documents.map((d) => d.project_id)).size;
          setStats((prev) => ({ ...prev, totalDocs, activeProjects: uniqueProjects, aiGenerated: totalDocs }));
        }
      } catch {
        setDocuments([]);
      }
    };
    if (user?._id || userId) fetchDocuments();
  }, [user, userId]);

  // ── Trello Boards ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchBoards = async () => {
      const uid = user?._id || userId;
      if (!uid) return;
      try {
        const res = await axios.get(`${BACKEND_URL}/trello/boards_with_headings`, {
          params: { user_id: uid },
        });
        if (res.data.status === "success") {
          const b = res.data.boards || [];
          setBoards(b);
          setStats((prev) => ({ ...prev, trelloBoards: b.length }));
        }
      } catch {
        setBoards([]);
      } finally {
        setLoading(false);
      }
    };
    if (user?._id || userId) fetchBoards();
    else setLoading(false);
  }, [user, userId]);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await axios.post(`${BACKEND_URL}/auth/logout`, {}, { withCredentials: true });
    } catch {}
    localStorage.removeItem("userId");
    localStorage.removeItem("token");
    sessionStorage.setItem("loggedOut", "true");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    navigate("/");
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">Loading dashboard…</p>
        </div>
      </div>
    );
  }
  if (!user && !loading) return null;

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredDocs = documents.filter((doc) => {
    const matchSearch =
      !searchQuery ||
      doc.board_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.template_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchFilter =
      activeFilter === "all" ||
      (activeFilter === "trello" &&
        doc.source !== "jira" &&
        doc.source !== "github" &&
        doc.source !== "slack") ||
      doc.source === activeFilter;
    return matchSearch && matchFilter;
  });

  const recentDocs = filteredDocs.slice(0, 6);

  const statsCards = [
    {
      label: "Total Documents",
      value: stats.totalDocs,
      sub: stats.totalDocs > 0 ? "AI generated" : "None yet",
      icon: <FileText className="w-5 h-5" />,
      bg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      valColor: "text-indigo-700",
    },
    {
      label: "Active Projects",
      value: stats.activeProjects,
      sub: stats.activeProjects > 0 ? "Across all tools" : "Connect a tool",
      icon: <FolderOpen className="w-5 h-5" />,
      bg: "bg-purple-50",
      iconColor: "text-purple-600",
      valColor: "text-purple-700",
    },
    {
      label: "AI Generated",
      value: stats.aiGenerated,
      sub: "SRS, WBS, Tests…",
      icon: <Sparkles className="w-5 h-5" />,
      bg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      valColor: "text-emerald-700",
    },
    {
      label: "Trello Boards",
      value: stats.trelloBoards,
      sub: stats.trelloBoards > 0 ? "Connected & synced" : "Not connected",
      icon: <BarChart3 className="w-5 h-5" />,
      bg: "bg-blue-50",
      iconColor: "text-blue-600",
      valColor: "text-blue-700",
    },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* ═══ NAVBAR ════════════════════════════════════════════════════════════ */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between gap-4">

            <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent hidden sm:block">
                AutoDocGen
              </span>
            </Link>

            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 flex-1 max-w-sm border border-gray-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
              <Search className="w-4 h-4 text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Search documents…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent outline-none w-full text-sm text-gray-700 placeholder-gray-400"
              />
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {user?._id && <NotificationBell userId={user._id} />}
              <div className="relative">
                <button
                  onClick={() => setOpenDropdown(!openDropdown)}
                  className="flex items-center gap-2 px-2.5 py-2 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-xs">
                    {user?.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-gray-700">{user?.name || "User"}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                </button>

                {openDropdown && (
                  <div className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-semibold text-gray-800">{user?.name}</div>
                      <div className="text-xs text-gray-500 truncate">{user?.email}</div>
                    </div>
                    <div className="py-1.5">
                      <Link
                        to="/settings"
                        onClick={() => setOpenDropdown(false)}
                        className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        <Settings className="w-4 h-4" /> Settings
                      </Link>
                    </div>
                    <div className="border-t border-gray-100 py-1.5">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">

        {/* ═══ SIDEBAR ═══════════════════════════════════════════════════════════ */}
        <aside className="hidden lg:flex flex-col w-60 bg-white border-r border-gray-200 min-h-screen shrink-0">
          <nav className="p-3 space-y-0.5 mt-2">
            <NavLink to="/dashboard" icon={<Grid3x3 size={16} />} active>Dashboard</NavLink>
            <NavLink to="/documents" icon={<FileText size={16} />}>All Documents</NavLink>
            <NavLink to="/boards" icon={<FolderOpen size={16} />}>Trello Boards</NavLink>
            <NavLink to="/integrations" icon={<LinkIcon size={16} />}>Integrations</NavLink>
            <NavLink to="/analytics" icon={<BarChart3 size={16} />}>Analytics</NavLink>
          </nav>

          {/* Trello boards quick list */}
          {boards.length > 0 && (
            <div className="px-3 mt-3 border-t border-gray-100 pt-4">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                Trello Boards
              </p>
              <div className="space-y-0.5">
                {boards.slice(0, 4).map((board, i) => (
                  <Link
                    key={i}
                    to={`/templates/${board.id}?boardName=${encodeURIComponent(board.name)}`}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                    <span className="truncate">{board.name}</span>
                  </Link>
                ))}
                {boards.length > 4 && (
                  <Link
                    to="/boards"
                    className="flex items-center gap-1 px-2 py-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    +{boards.length - 4} more <ArrowRight size={11} />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Integration status in sidebar */}
          <div className="px-3 mt-3 border-t border-gray-100 pt-4 pb-4">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
              Integrations
            </p>
            <div className="space-y-0.5">
              {INTEGRATIONS.map((intg) => (
                <Link
                  key={intg.key}
                  to={intg.connected ? intg.linkTo : intg.connectPath}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  <span style={{ color: intg.color }}>{intg.icon}</span>
                  <span className="flex-1 text-gray-700">{intg.name}</span>
                  {intg.connected
                    ? <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                    : <XCircle size={13} className="text-gray-300 shrink-0" />
                  }
                </Link>
              ))}
            </div>
          </div>
        </aside>

        {/* ═══ MAIN ══════════════════════════════════════════════════════════════ */}
        <main className="flex-1 p-6 lg:p-7 max-w-6xl mx-auto w-full">

          {/* Welcome */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Here's your documentation overview.</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
            {statsCards.map((s, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className={`w-9 h-9 ${s.bg} rounded-lg flex items-center justify-center ${s.iconColor} mb-3`}>
                  {s.icon}
                </div>
                <div className={`text-2xl font-bold ${s.valColor} mb-0.5`}>{s.value}</div>
                <div className="text-xs font-medium text-gray-700">{s.label}</div>
                <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>

          {/* ── Connected Tools ───────────────────────────────────────────────── */}
          <div className="mb-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Connected Tools</h2>
              <Link
                to="/integrations"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                Manage <ArrowRight size={12} />
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {INTEGRATIONS.map((intg) => (
                <Link
                  key={intg.key}
                  to={intg.connected ? intg.linkTo : intg.connectPath}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-gray-300 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: intg.lightBg, color: intg.color }}
                    >
                      {intg.icon}
                    </div>
                    {intg.connected ? (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Live
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Connect
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-semibold text-gray-800">{intg.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{intg.description}</div>
                  {intg.connected ? (
                    <div className="mt-2 text-xs text-indigo-600 font-medium flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open boards <ArrowRight size={10} />
                    </div>
                  ) : (
                    <div className="mt-2 text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Plus size={10} /> Add integration
                    </div>
                  )}
                </Link>
              ))}
            </div>
          </div>

          {/* ── Documents ─────────────────────────────────────────────────────── */}
          <div className="bg-white rounded-xl border border-gray-200 mb-6">
            {/* header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Documents</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "grid" ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:bg-gray-100"}`}
                >
                  <Grid3x3 size={15} />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-1.5 rounded-lg transition-colors ${viewMode === "list" ? "bg-indigo-100 text-indigo-600" : "text-gray-400 hover:bg-gray-100"}`}
                >
                  <List size={15} />
                </button>
              </div>
            </div>

            {/* filter tabs */}
            <div className="flex items-center gap-1.5 px-5 py-2.5 border-b border-gray-100 overflow-x-auto">
              {["all", ...INTEGRATIONS.map((i) => i.key)].map((tab) => {
                const intg = INTEGRATIONS.find((i) => i.key === tab);
                const isActive = activeFilter === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveFilter(tab)}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {intg && (
                      <span style={!isActive ? { color: intg.color } : {}}>
                        {intg.icon}
                      </span>
                    )}
                    {tab === "all" ? "All" : intg?.name}
                  </button>
                );
              })}
            </div>

            {/* docs body */}
            <div className="p-5">
              {recentDocs.length === 0 ? (
                <div className="text-center py-14">
                  <FileText className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 mb-4">
                    {searchQuery
                      ? `No documents match "${searchQuery}"`
                      : activeFilter !== "all"
                      ? `No documents from ${activeFilter} yet`
                      : "No documents yet"}
                  </p>
                  {activeFilter === "all" && (
                    <Link
                      to="/boards"
                      className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-lg text-sm hover:bg-indigo-700 transition-colors"
                    >
                      <Plus size={15} /> Generate your first doc
                    </Link>
                  )}
                  {activeFilter !== "all" &&
                    !INTEGRATIONS.find((i) => i.key === activeFilter)?.connected && (
                      <Link
                        to="/integrations"
                        className="inline-flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50 transition-colors"
                      >
                        <LinkIcon size={15} /> Connect {activeFilter}
                      </Link>
                    )}
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recentDocs.map((doc) => (
                    <div
                      key={doc.id || doc._id}
                      className="border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-indigo-200 transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                          <FileText size={14} className="text-indigo-600" />
                        </div>
                        <span className="text-xs text-gray-400 font-medium truncate">{doc.template_name}</span>
                      </div>
                      <h3 className="text-sm font-semibold text-gray-800 line-clamp-2 mb-3">
                        {doc.board_name || doc.project_name || doc.workspace_name || "Untitled Document"}
                      </h3>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getStatusColor("completed")}`}>
                          Generated
                        </span>
                        <Link
                          to={`/documents/${doc.template_name}?projectId=${doc.project_id}`}
                          className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          <Eye size={12} /> View
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {recentDocs.map((doc) => (
                    <div
                      key={doc.id || doc._id}
                      className="flex items-center gap-3 px-3 py-2.5 border border-gray-100 rounded-lg hover:bg-gray-50 hover:border-indigo-200 transition-all"
                    >
                      <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                        <FileText size={13} className="text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{doc.board_name || "Untitled"}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                          <span>{doc.template_name}</span>
                          <span>·</span>
                          <Clock size={10} />
                          <span>Recently</span>
                        </div>
                      </div>
                      <Link
                        to={`/documents/${doc.template_name}?projectId=${doc.project_id}`}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium shrink-0"
                      >
                        <Eye size={13} /> View
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {documents.length > 6 && (
                <div className="mt-5 text-center">
                  <Link
                    to="/documents"
                    className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    View all {documents.length} documents <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* ── Trello Boards grid ────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-900">Trello Boards</h2>
              <Link
                to="/boards"
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                View all <ArrowRight size={12} />
              </Link>
            </div>

            {boards.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-300 rounded-xl p-8 text-center">
                <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500 mb-3">No Trello boards connected</p>
                <Link
                  to="/integrations"
                  className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                >
                  Connect Trello <ArrowRight size={13} />
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {boards.slice(0, 6).map((board, i) => (
                  <Link
                    key={i}
                    to={`/templates/${board.id}?boardName=${encodeURIComponent(board.name)}`}
                    className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3 hover:shadow-md hover:border-blue-200 transition-all group"
                  >
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center shrink-0">
                      <FolderOpen size={16} className="text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{board.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {board.desc ? board.desc.slice(0, 35) + "…" : "No description"}
                      </p>
                    </div>
                    <Play size={14} className="text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                  </Link>
                ))}
              </div>
            )}
          </div>

        </main>
      </div>
    </div>
  );
}