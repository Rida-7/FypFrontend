import React from "react";
import { useNavigate,Link  } from "react-router-dom";
import useSubscription from "../hooks/useSubscription";
import { Sparkles, TrendingUp, AlertTriangle, ArrowLeft } from "lucide-react";

export default function SubscriptionPage() {
  const navigate = useNavigate();

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
  const { subscription, loading } = useSubscription(userId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-indigo-50">
        <div className="animate-pulse text-gray-500">
          Loading subscription...
        </div>
      </div>
    );
  }

  const usagePercent =
    subscription?.unlimited
      ? 0
      : (subscription?.docs_used / subscription?.docs_limit) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50 flex items-center justify-center p-6">

      <div className="w-full max-w-lg">
        <button
  onClick={() => navigate("/dashboard")}
  className="inline-flex items-center gap-2 border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition"
>
  ← Back to Dashboard
</button>

        {/* HEADER */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-white border shadow-sm px-4 py-2 rounded-full mb-4">
            <Sparkles size={16} className="text-indigo-600" />
            <span className="text-sm text-gray-600">
              Subscription Dashboard
            </span>
          </div>

          <h1 className="text-3xl font-bold text-gray-900">
            Your Subscription
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Manage your plan and usage
          </p>
        </div>

        {/* MAIN CARD */}
        <div className="bg-white border shadow-xl rounded-3xl p-8 space-y-6">

          {/* PLAN */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Current Plan</p>
              <h2 className="text-3xl font-bold capitalize text-gray-900">
                {subscription?.plan}
              </h2>
            </div>

            <div className="flex items-center gap-2 bg-green-50 text-green-600 px-3 py-1 rounded-full text-sm">
              <TrendingUp size={16} />
              Active
            </div>
          </div>

          {/* USAGE SECTION */}
          <div className="bg-gray-50 border rounded-2xl p-5">

            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-600">Documents Used</span>
              <span className="font-semibold text-gray-900">
                {subscription?.docs_used} /{" "}
                {subscription?.unlimited ? "∞" : subscription?.docs_limit}
              </span>
            </div>

            {/* PROGRESS BAR */}
            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(usagePercent || 0, 100)}%`,
                }}
              />
            </div>

            <p className="text-xs text-gray-500 mt-2">
              {subscription?.unlimited
                ? "Unlimited usage"
                : `${Math.round(usagePercent || 0)}% used`}
            </p>
          </div>

          {/* WARNING */}
          {!subscription?.unlimited &&
            subscription?.docs_used >= subscription?.docs_limit && (
              <div className="flex gap-3 bg-red-50 border border-red-200 text-red-600 p-4 rounded-2xl">
                <AlertTriangle size={18} />
                <p className="text-sm">
                  You have reached your plan limit. Upgrade to continue generating documents.
                </p>
              </div>
            )}

          {/* ACTION BUTTON */}
          <button
            onClick={() => navigate("/pricing")}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-2xl font-semibold shadow-md hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            Upgrade Plan
          </button>
        </div>

        {/* FOOTER NOTE */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Billing is managed securely. You can upgrade anytime.
        </p>
      </div>
    </div>
  );
}
