import React, { useState, useEffect, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  FileText, Sparkles, TrendingUp, Clock, CheckCircle2,
  XCircle, ArrowRight, RefreshCw, BarChart3, Activity,
  FolderOpen, AlertCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { getMe } from "../api";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

const getUserId = () => {
  const raw = localStorage.getItem("userId");
  if (!raw) return null;
  if (raw.startsWith("{") || raw.startsWith("[")) {
    try { return JSON.parse(raw)?._id || null; } catch { return null; }
  }
  return raw;
};

// ── Palette ───────────────────────────────────────────────────────────────────
const COLORS = {
  indigo: "#6366f1",
  emerald: "#10b981",
  amber: "#f59e0b",
  sky: "#0ea5e9",
  rose: "#f43f5e",
  purple: "#a855f7",
  trello: "#0079BF",
  github: "#24292E",
  slack: "#611F69",
  jira: "#2684FF",
};
const PIE_PALETTE = [COLORS.indigo, COLORS.emerald, COLORS.amber, COLORS.sky, COLORS.rose, COLORS.purple];

const TIME_FILTERS = [
  { label: "7d", days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
];

// ── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-gray-700">
      <p className="font-semibold mb-1 text-gray-300">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-gray-400">{p.name}:</span>
          <span className="font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} mb-4`}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-0.5">{value}</div>
      <div className="text-sm font-medium text-gray-600">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ── Section Wrapper ───────────────────────────────────────────────────────────
function Section({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-50">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function Analytics() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timePeriod, setTimePeriod] = useState(30);
  const navigate = useNavigate();
  const userId = getUserId();

  const [documents, setDocuments] = useState([]);

  // Derived state
  const [docsOverTime, setDocsOverTime] = useState([]);
  const [templateStats, setTemplateStats] = useState([]);
  const [integrationStats, setIntegrationStats] = useState([]);
  const [boardStats, setBoardStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    total: 0, thisperiod: 0, successRate: 100, uniqueTemplates: 0,
  });

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getMe();
        const userData = res?.data?.user || res?.data;
        if (userData?._id) {
          setUser(userData);
          localStorage.setItem("userId", userData._id);
        } else navigate("/signin");
      } catch { navigate("/signin"); }
    };
    fetchUser();
  }, [navigate]);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchData = useCallback(async (uid) => {
    if (!uid) return;
    try {
      const res = await axios.get(`${BACKEND_URL}/generated-docs/all`, {
        params: { user_id: uid },
      });
      setDocuments(res.data.documents || []);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const uid = user?._id || userId;
    if (uid) fetchData(uid);
    else setLoading(false);
  }, [user, userId, fetchData]);

  // ── Compute analytics ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!documents.length) {
      setDocsOverTime([]);
      setTemplateStats([]);
      setIntegrationStats([]);
      setBoardStats([]);
      setRecentActivity([]);
      setSummaryStats({ total: 0, thisperiod: 0, successRate: 100, uniqueTemplates: 0 });
      return;
    }

    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setDate(cutoff.getDate() - timePeriod);

    const periodDocs = documents.filter((d) => {
      const c = d.created_at ? new Date(d.created_at) : null;
      return c && c >= cutoff;
    });

    // 1. Docs over time
    const makeKey = (d) => {
      if (timePeriod <= 7) return d.toLocaleDateString("en-US", { weekday: "short" });
      if (timePeriod <= 30) return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      return `W${Math.ceil(d.getDate() / 7)} ${d.toLocaleDateString("en-US", { month: "short" })}`;
    };

    const buckets = {};
    for (let i = timePeriod - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const k = makeKey(d);
      if (!(k in buckets)) buckets[k] = 0;
    }
    periodDocs.forEach((doc) => {
      if (!doc.created_at) return;
      const k = makeKey(new Date(doc.created_at));
      if (k in buckets) buckets[k]++;
    });
    setDocsOverTime(Object.entries(buckets).map(([date, docs]) => ({ date, docs })));

    // 2. Template stats
    const tmplMap = {};
    documents.forEach((d) => {
      const t = d.template_name || "Unknown";
      tmplMap[t] = (tmplMap[t] || 0) + 1;
    });
    setTemplateStats(
      Object.entries(tmplMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6)
    );

    // 3. Integration stats
    const srcMap = {};
    documents.forEach((d) => {
      const src = d.source?.toLowerCase() || "trello";
      const label = src.charAt(0).toUpperCase() + src.slice(1);
      srcMap[label] = (srcMap[label] || 0) + 1;
    });
    setIntegrationStats(
      Object.entries(srcMap).map(([name, value]) => ({ name, value }))
    );

    // 4. Top boards
    const boardMap = {};
    documents.forEach((d) => {
      const b = d.board_name || d.project_name || "Unknown";
      boardMap[b] = (boardMap[b] || 0) + 1;
    });
    setBoardStats(
      Object.entries(boardMap)
        .map(([name, docs]) => ({ name: name.length > 22 ? name.slice(0, 22) + "…" : name, docs }))
        .sort((a, b) => b.docs - a.docs)
        .slice(0, 5)
    );

    // 5. Recent activity
    setRecentActivity(
      [...documents]
        .filter((d) => d.created_at)
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 8)
    );

    // 6. Summary
    const successful = documents.filter((d) => !d.error).length;
    setSummaryStats({
      total: documents.length,
      thisperiod: periodDocs.length,
      successRate: documents.length > 0 ? Math.round((successful / documents.length) * 100) : 100,
      uniqueTemplates: Object.keys(tmplMap).length,
    });
  }, [documents, timePeriod]);

  const handleRefresh = () => {
    setRefreshing(true);
    const uid = user?._id || userId;
    if (uid) fetchData(uid);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const intgColorMap = {
    Trello: COLORS.trello, Github: COLORS.github, Slack: COLORS.slack,
    Jira: COLORS.jira,
  };

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-indigo-600" />
              Analytics
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Live insights across all your integrations
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-0.5">
              {TIME_FILTERS.map((f) => (
                <button
                  key={f.days}
                  onClick={() => setTimePeriod(f.days)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    timePeriod === f.days
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

        {/* ── Summary Stats ────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<FileText className="w-5 h-5 text-indigo-600" />}
            label="Total Documents"
            value={summaryStats.total}
            sub="All time"
            color="bg-indigo-50"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
            label={`Last ${timePeriod} Days`}
            value={summaryStats.thisperiod}
            sub={`${(summaryStats.thisperiod / timePeriod).toFixed(1)}/day avg`}
            color="bg-emerald-50"
          />
          <StatCard
            icon={<CheckCircle2 className="w-5 h-5 text-sky-600" />}
            label="Success Rate"
            value={`${summaryStats.successRate}%`}
            sub="Generated successfully"
            color="bg-sky-50"
          />
          <StatCard
            icon={<Activity className="w-5 h-5 text-purple-600" />}
            label="Templates Used"
            value={summaryStats.uniqueTemplates}
            sub="Unique types"
            color="bg-purple-50"
          />
        </div>

        {/* ── Area chart + Pie ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          <div className="lg:col-span-2">
            <Section
              title="Documents Over Time"
              subtitle={`Trend — last ${timePeriod} days`}
            >
              {docsOverTime.every((d) => d.docs === 0) ? (
                <div className="flex flex-col items-center justify-center h-52 text-gray-200">
                  <BarChart3 className="w-10 h-10 mb-2" />
                  <p className="text-sm text-gray-400">No documents in this period</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={230}>
                  <AreaChart data={docsOverTime} margin={{ top: 4, right: 4, left: -22, bottom: 0 }}>
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLORS.indigo} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLORS.indigo} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      interval={timePeriod <= 7 ? 0 : timePeriod <= 30 ? 4 : 1}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9ca3af" }}
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="docs"
                      name="Docs"
                      stroke={COLORS.indigo}
                      strokeWidth={2.5}
                      fill="url(#areaGrad)"
                      dot={{ r: 3, fill: COLORS.indigo, strokeWidth: 0 }}
                      activeDot={{ r: 5, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </Section>
          </div>

          <div>
            <Section title="By Integration" subtitle="Source breakdown">
              {integrationStats.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-52 text-gray-200">
                  <AlertCircle className="w-8 h-8 mb-2" />
                  <p className="text-xs text-gray-400">No data yet</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={165}>
                    <PieChart>
                      <Pie
                        data={integrationStats}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {integrationStats.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={intgColorMap[entry.name] || PIE_PALETTE[i % PIE_PALETTE.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-1">
                    {integrationStats.map((entry, i) => {
                      const clr = intgColorMap[entry.name] || PIE_PALETTE[i % PIE_PALETTE.length];
                      const total = integrationStats.reduce((s, e) => s + e.value, 0);
                      const pct = Math.round((entry.value / total) * 100);
                      return (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: clr }} />
                            <span className="text-gray-600">{entry.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-400">{pct}%</span>
                            <span className="font-semibold text-gray-800 w-5 text-right">{entry.value}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Section>
          </div>
        </div>

        {/* ── Template bar + Top boards ────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <Section title="Most Used Templates" subtitle="Document count all time">
            {templateStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-gray-200">
                <FileText className="w-8 h-8 mb-2" />
                <p className="text-xs text-gray-400">No templates used yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={230}>
                <BarChart
                  data={templateStats}
                  layout="vertical"
                  margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: "#9ca3af" }}
                    tickLine={false}
                    axisLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "#6b7280" }}
                    tickLine={false}
                    axisLine={false}
                    width={88}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Docs" radius={[0, 6, 6, 0]} barSize={16}>
                    {templateStats.map((_, i) => (
                      <Cell key={i} fill={PIE_PALETTE[i % PIE_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </Section>

          <Section title="Top Boards & Projects" subtitle="By docs generated, all time">
            {boardStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-52 text-gray-200">
                <FolderOpen className="w-8 h-8 mb-2" />
                <p className="text-xs text-gray-400">No board data yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {boardStats.map((board, i) => {
                  const pct = Math.round((board.docs / (boardStats[0]?.docs || 1)) * 100);
                  const clr = PIE_PALETTE[i % PIE_PALETTE.length];
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0"
                            style={{ background: `${clr}18`, color: clr }}
                          >
                            {i + 1}
                          </span>
                          <span className="text-sm text-gray-700 font-medium truncate">{board.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-gray-400 shrink-0 ml-2">
                          {board.docs} doc{board.docs !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, background: clr, transition: "width 0.8s ease" }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Section>
        </div>

        {/* ── Recent Activity ──────────────────────────────────────────────── */}
        <Section title="Recent Activity" subtitle="Latest document generations across all integrations">
          {recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-200">
              <Clock className="w-8 h-8 mb-2" />
              <p className="text-sm text-gray-400">No activity yet</p>
              <Link
                to="/boards"
                className="mt-3 text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                Generate your first doc <ArrowRight size={11} />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentActivity.map((doc, i) => {
                const src = doc.source?.toLowerCase() || "trello";
                const srcLabel = src.charAt(0).toUpperCase() + src.slice(1);
                const srcClr = intgColorMap[srcLabel] || COLORS.indigo;

                const timeAgo = (() => {
                  if (!doc.created_at) return "Recently";
                  const diff = Date.now() - new Date(doc.created_at).getTime();
                  const mins = Math.floor(diff / 60000);
                  const hrs = Math.floor(diff / 3600000);
                  const days = Math.floor(diff / 86400000);
                  if (mins < 1) return "Just now";
                  if (mins < 60) return `${mins}m ago`;
                  if (hrs < 24) return `${hrs}h ago`;
                  return `${days}d ago`;
                })();

                return (
                  <div key={i} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                      <FileText size={14} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {doc.board_name || doc.project_name || "Untitled"}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{doc.template_name}</span>
                        <span className="text-gray-200 text-xs">·</span>
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: `${srcClr}15`, color: srcClr }}
                        >
                          {srcLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> {timeAgo}
                      </span>
                      {doc.error
                        ? <XCircle size={14} className="text-rose-400" />
                        : <CheckCircle2 size={14} className="text-emerald-400" />
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* ── Empty CTA ────────────────────────────────────────────────────── */}
        {documents.length === 0 && (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
            <Sparkles className="w-10 h-10 text-indigo-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium mb-1">No data yet</p>
            <p className="text-sm text-gray-400 mb-4">
              Generate your first document to start seeing analytics here.
            </p>
            <Link
              to="/boards"
              className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm hover:bg-indigo-700 transition-colors"
            >
              Get Started <ArrowRight size={14} />
            </Link>
          </div>
        )}

      </div>
    </div>
  );
}