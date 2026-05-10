import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Check,
  Crown,
  Rocket,
  Users,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function PricingPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [subscription, setSubscription] = useState(null);

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

  useEffect(() => {
    fetchPlans();
    fetchSubscription();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await axios.get(`${BACKEND_URL}/subscription/plans`);
      setPlans(res.data.plans || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSubscription = async () => {
    try {
      if (!userId) return;
      const res = await axios.get(`${BACKEND_URL}/subscription/status`, {
        params: { user_id: userId },
      });
      setSubscription(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpgrade = (plan) => {
    // ✅ LOGIN CHECK — agar user logged in nahi toh signin page pe bhejo
    if (!userId) {
      alert("Please login first to upgrade your plan.");
      navigate("/signin");
      return;
    }

    if (plan === "free") {
      axios
        .post(`${BACKEND_URL}/subscription/upgrade`, {
          user_id: userId,
          plan,
        })
        .then(() => {
          fetchSubscription();
          alert("Switched to Free plan");
        });
      return;
    }

    // ✅ Logged in hai toh payment page pe navigate karo
    navigate(`/payment?plan=${plan}`);
  };

  const getIcon = (key) => {
    switch (key) {
      case "starter":
        return <Rocket size={30} />;
      case "pro":
        return <Crown size={30} />;
      case "team":
        return <Users size={30} />;
      default:
        return <ShieldCheck size={30} />;
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-100">
      {/* BACKGROUND BLOBS */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-300 opacity-20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-300 opacity-20 rounded-full blur-3xl" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* HERO */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-white/70 backdrop-blur-xl border border-white/30 px-5 py-2 rounded-full shadow-md mb-6">
            <Sparkles size={18} className="text-indigo-600" />
            <span className="text-sm font-medium text-gray-700">
              AI Powered Documentation Platform
            </span>
          </div>

          <h1 className="text-5xl md:text-6xl font-black tracking-tight text-gray-900 mb-6 leading-tight">
            Flexible Pricing for
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {" "}
              Every Team
            </span>
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Scale your AI-powered documentation workflow with powerful plans
            designed for individuals, startups, and teams.
          </p>

          {/* ✅ Show login prompt if not logged in */}
          {!userId && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 px-5 py-3 rounded-xl text-sm font-medium"
            >
              <span>⚠️</span>
              <span>
                You need to{" "}
                <button
                  onClick={() => navigate("/signin")}
                  className="underline font-bold hover:text-amber-900 transition-colors"
                >
                  login
                </button>{" "}
                to upgrade your plan.
              </span>
            </motion.div>
          )}
        </motion.div>

        {/* CURRENT PLAN BADGE */}
        {subscription && (
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex justify-center mb-16"
          >
            <div className="bg-white/70 border border-white/30 backdrop-blur-xl px-6 py-2 rounded-full shadow-sm text-sm text-gray-700">
              Current Plan:{" "}
              <span className="font-bold capitalize text-indigo-600">
                {subscription.plan}
              </span>
            </div>
          </motion.div>
        )}

        {/* PRICING CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8">
          {plans.map((plan, index) => {
            const isCurrent = subscription?.plan === plan.key;
            const isPopular = plan.key === "pro";

            return (
              <motion.div
                key={plan.key}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className={`relative overflow-hidden rounded-3xl border backdrop-blur-2xl transition-all duration-300 hover:-translate-y-3 hover:shadow-2xl ${
                  isPopular
                    ? "border-indigo-500 bg-white shadow-[0_20px_60px_rgba(79,70,229,0.25)] scale-[1.02]"
                    : "border-white/30 bg-white/70 shadow-xl"
                }`}
              >
                {/* POPULAR BADGE */}
                {isPopular && (
                  <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs px-5 py-2 rounded-bl-2xl font-semibold tracking-wide">
                    MOST POPULAR
                  </div>
                )}

                <div className="p-8">
                  {/* ICON */}
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 ${
                      isPopular
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                        : "bg-indigo-100 text-indigo-600"
                    }`}
                  >
                    {getIcon(plan.key)}
                  </div>

                  {/* PLAN NAME */}
                  <h2 className="text-3xl font-black text-gray-900 mb-3">
                    {plan.name}
                  </h2>

                  {/* PRICE */}
                  <div className="mb-8">
                    <span className="text-5xl font-black text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-500 ml-2">/{plan.period}</span>
                  </div>

                  {/* FEATURES */}
                  <div className="space-y-5 mb-10">
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-1 rounded-full">
                        <Check size={16} className="text-green-600" />
                      </div>
                      <span className="text-gray-700">
                        {plan.docs === -1
                          ? "Unlimited Documents"
                          : `${plan.docs} AI Documents`}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-1 rounded-full">
                        <Check size={16} className="text-green-600" />
                      </div>
                      <span className="text-gray-700">AI Document Generation</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-1 rounded-full">
                        <Check size={16} className="text-green-600" />
                      </div>
                      <span className="text-gray-700">Smart Templates</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-1 rounded-full">
                        <Check size={16} className="text-green-600" />
                      </div>
                      <span className="text-gray-700">Version History</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="bg-green-100 p-1 rounded-full">
                        <Check size={16} className="text-green-600" />
                      </div>
                      <span className="text-gray-700">Trello / Slack / GitHub</span>
                    </div>
                  </div>

                  {/* BUTTON */}
                  <button
                    disabled={isCurrent}
                    onClick={() => handleUpgrade(plan.key)}
                    className={`w-full py-4 rounded-2xl font-semibold transition-all duration-300 ${
                      isCurrent
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : isPopular
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-xl hover:scale-[1.02]"
                        : "bg-gray-900 text-white hover:bg-black hover:scale-[1.02]"
                    }`}
                  >
                    {isCurrent
                      ? "Current Plan"
                      : !userId
                      ? "Login to Upgrade"
                      : "Upgrade Now"}
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* BOTTOM CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-20"
        >
          <h2 className="text-4xl font-black text-gray-900 mb-4">
            Start Building Smarter Documents
          </h2>
          <p className="text-gray-600 text-lg mb-8">
            Automate documentation workflows with AI.
          </p>
          <button
            onClick={() => (userId ? navigate("/dashboard") : navigate("/signup"))}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10 py-4 rounded-2xl font-semibold shadow-xl hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
          >
            {userId ? "Go to Dashboard" : "Get Started Today"}
          </button>
        </motion.div>
      </div>
    </div>
  );
}