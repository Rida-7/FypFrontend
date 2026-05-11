import React, { useEffect, useState } from "react";
import {
  FileText,
  Users,
  Crown,
  Layers,
  RefreshCw,
  Globe
} from "lucide-react";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend
} from "recharts";

const BACKEND_URL =
  "https://autodocgen-production-f5de.up.railway.app";

// ======================================================
// DARKER PREMIUM COLORS
// ======================================================
const COLORS = [
  "#4338ca",
  "#6d28d9",
  "#7c3aed",
  "#5b21b6",
  "#312e81",
  "#4c1d95",
  "#3730a3"
];

const PLAN_COLORS = {
  free: "#475569",
  starter: "#4338ca",
  pro: "#6d28d9",
  team: "#312e81"
};

// ======================================================
// STAT CARD
// ======================================================
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-200 flex items-start gap-4">
      <div
        className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}
      >
        <Icon size={22} className="text-white" />
      </div>

      <div>
        <p className="text-sm text-slate-600">{label}</p>

        <p className="text-3xl font-black text-slate-900">
          {value}
        </p>

        {sub && (
          <p className="text-xs text-slate-500 mt-1">
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

// ======================================================
// SECTION HEADER
// ======================================================
function SectionHeader({ title, subtitle }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-slate-900">
        {title}
      </h2>

      {subtitle && (
        <p className="text-sm text-slate-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ======================================================
// MAIN DASHBOARD
// ======================================================
export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchData = async () => {
    setLoading(true);

    try {
      const res = await fetch(
        `${BACKEND_URL}/admin/dashboard`
      );

      const json = await res.json();

      setData(json);

      setLastRefresh(
        new Date().toLocaleTimeString()
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-indigo-700 border-t-transparent rounded-full animate-spin mx-auto mb-3" />

          <p className="text-slate-600 text-sm">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    overview,
    docs,
    subscriptions,
    workspaces
  } = data;

  // ======================================================
  // CHART DATA
  // ======================================================
  const templateData = Object.entries(
    docs.by_template
  ).map(([name, count]) => ({
    name:
      name.length > 10
        ? name.slice(0, 10) + "…"
        : name,
    fullName: name,
    count
  }));

  const sourceData = Object.entries(
    docs.by_source
  ).map(([name, count]) => ({
    name:
      name.charAt(0).toUpperCase() +
      name.slice(1),
    value: count
  }));

  const planData = Object.entries(
    subscriptions.by_plan
  ).map(([name, count]) => ({
    name:
      name.charAt(0).toUpperCase() +
      name.slice(1),
    value: count,
    color:
      PLAN_COLORS[name] || "#475569"
  }));

  return (
    <div className="min-h-screen bg-slate-100">

      {/* ====================================================== */}
      {/* HEADER */}
      {/* ====================================================== */}
      <div className="bg-slate-50 border-b border-slate-200 px-8 py-5 flex items-center justify-between">

        <div>
          <h1 className="text-2xl font-black text-slate-900">
            Admin Dashboard
          </h1>

          <p className="text-sm text-slate-500 mt-0.5">
            AutoDocGen — Platform Analytics
          </p>
        </div>

        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-slate-500">
              Last updated: {lastRefresh}
            </span>
          )}

          <button
            onClick={fetchData}
            className="flex items-center gap-2 bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-800 transition"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      <div className="px-8 py-8 max-w-7xl mx-auto space-y-10">

        {/* ====================================================== */}
        {/* OVERVIEW */}
        {/* ====================================================== */}
        <div>
          <SectionHeader
            title="Overview"
            subtitle="Platform-wide metrics"
          />

          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">

            <StatCard
              icon={Users}
              label="Total Users"
              value={overview.total_users}
              color="bg-indigo-700"
            />

            <StatCard
              icon={FileText}
              label="Docs Generated"
              value={overview.total_docs_generated}
              color="bg-violet-700"
            />

            <StatCard
              icon={Crown}
              label="Subscribers"
              value={overview.active_subscribers}
              color="bg-purple-700"
              sub="paid + free plans"
            />

            <StatCard
              icon={Layers}
              label="Workspaces"
              value={overview.total_workspaces}
              color="bg-blue-700"
            />

            <StatCard
              icon={Globe}
              label="Workspace Members"
              value={overview.total_workspace_members}
              color="bg-sky-700"
            />
          </div>
        </div>

        {/* ====================================================== */}
        {/* CHARTS ROW 1 */}
        {/* ====================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* DOCUMENTS BY TEMPLATE */}
          <div className="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-200">

            <SectionHeader
              title="Documents by Template"
              subtitle="Which template types are most used"
            />

            {templateData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <BarChart
                  data={templateData}
                  barSize={36}
                >
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 12,
                      fill: "#475569"
                    }}
                    axisLine={false}
                    tickLine={false}
                  />

                  <YAxis
                    tick={{
                      fontSize: 12,
                      fill: "#475569"
                    }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />

                  <Tooltip
                    formatter={(
                      val,
                      name,
                      props
                    ) => [
                      val,
                      props.payload.fullName
                    ]}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow:
                        "0 4px 20px rgba(0,0,0,0.15)"
                    }}
                  />

                  <Bar
                    dataKey="count"
                    radius={[8, 8, 0, 0]}
                  >
                    {templateData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          COLORS[
                            i % COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* DOCUMENTS BY SOURCE */}
          <div className="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-200">

            <SectionHeader
              title="Documents by Source"
              subtitle="Trello vs Slack vs GitHub"
            />

            {sourceData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">
                No data yet
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={110}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {sourceData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={
                          COLORS[
                            i % COLORS.length
                          ]
                        }
                      />
                    ))}
                  </Pie>

                  <Tooltip
                    contentStyle={{
                      borderRadius: "12px",
                      border: "none",
                      boxShadow:
                        "0 4px 20px rgba(0,0,0,0.15)"
                    }}
                  />

                  <Legend
                    iconType="circle"
                    wrapperStyle={{
                      fontSize: "13px",
                      paddingTop: "16px"
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ====================================================== */}
        {/* CHARTS ROW 2 */}
        {/* ====================================================== */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* SUBSCRIPTIONS */}
          <div className="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-200">

            <SectionHeader
              title="Subscription Plans"
              subtitle="Distribution of users across plans"
            />

            {planData.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">
                No data yet
              </p>
            ) : (
              <>
                <ResponsiveContainer
                  width="100%"
                  height={200}
                >
                  <PieChart>
                    <Pie
                      data={planData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {planData.map(
                        (entry, i) => (
                          <Cell
                            key={i}
                            fill={entry.color}
                          />
                        )
                      )}
                    </Pie>

                    <Tooltip
                      contentStyle={{
                        borderRadius: "12px",
                        border: "none",
                        boxShadow:
                          "0 4px 20px rgba(0,0,0,0.15)"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="space-y-3 mt-4">
                  {planData.map((plan) => (
                    <div
                      key={plan.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">

                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor:
                              plan.color
                          }}
                        />

                        <span className="text-sm text-slate-700 font-medium">
                          {plan.name}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">

                        <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">

                          <div
                            className="h-2 rounded-full"
                            style={{
                              width: `${
                                (plan.value /
                                  overview.active_subscribers) *
                                100
                              }%`,
                              backgroundColor:
                                plan.color
                            }}
                          />
                        </div>

                        <span className="text-sm font-bold text-slate-900 w-6 text-right">
                          {plan.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* WORKSPACES */}
          <div className="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-200">

            <SectionHeader
              title="Team Workspaces"
              subtitle={`${workspaces.length} workspace(s) created`}
            />

            {workspaces.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-10">
                No workspaces created yet
              </p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">

                {workspaces.map((ws, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between bg-slate-100 rounded-xl px-4 py-3"
                  >

                    <div className="flex items-center gap-3">

                      <div className="w-9 h-9 bg-gradient-to-r from-indigo-700 to-violet-700 rounded-xl flex items-center justify-center text-white text-sm font-bold">
                        {ws.name[0]?.toUpperCase()}
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {ws.name}
                        </p>

                        <p className="text-xs text-slate-500">
                          {ws.created_at
                            ? new Date(
                                ws.created_at
                              ).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-xs font-semibold">
                      <Users size={12} />
                      {ws.member_count} / 5
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ====================================================== */}
        {/* TEMPLATE BREAKDOWN */}
        {/* ====================================================== */}
        <div className="bg-slate-50 rounded-2xl p-6 shadow-sm border border-slate-200">

          <SectionHeader
            title="Template Usage Breakdown"
            subtitle="Detailed count per document type"
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">

              <thead>
                <tr className="border-b border-slate-200">

                  <th className="text-left py-3 px-4 text-slate-600 font-medium">
                    Template
                  </th>

                  <th className="text-left py-3 px-4 text-slate-600 font-medium">
                    Count
                  </th>

                  <th className="text-left py-3 px-4 text-slate-600 font-medium">
                    Share
                  </th>

                  <th className="text-left py-3 px-4 text-slate-600 font-medium">
                    Progress
                  </th>
                </tr>
              </thead>

              <tbody>
                {Object.entries(
                  docs.by_template
                )
                  .sort(
                    (a, b) => b[1] - a[1]
                  )
                  .map(
                    ([name, count], i) => {
                      const pct =
                        Math.round(
                          (count /
                            overview.total_docs_generated) *
                            100
                        );

                      return (
                        <tr
                          key={name}
                          className="border-b border-slate-200 hover:bg-slate-100 transition"
                        >

                          <td className="py-3 px-4">

                            <div className="flex items-center gap-2">

                              <div
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    COLORS[
                                      i %
                                        COLORS.length
                                    ]
                                }}
                              />

                              <span className="font-medium text-slate-800">
                                {name}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-4 font-bold text-slate-900">
                            {count}
                          </td>

                          <td className="py-3 px-4 text-slate-600">
                            {pct}%
                          </td>

                          <td className="py-3 px-4 w-48">

                            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">

                              <div
                                className="h-2 rounded-full transition-all"
                                style={{
                                  width: `${pct}%`,
                                  backgroundColor:
                                    COLORS[
                                      i %
                                        COLORS.length
                                    ]
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    }
                  )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
