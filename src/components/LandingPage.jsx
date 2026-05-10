import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  FileText,
  Zap,
  Shield,
  Mail,
  CheckCircle2,
  Sparkles,
  Bot,
  Users,
  TrendingUp,
  Play,
  CreditCard
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api";

export default function LandingPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function syncUser() {
      try {
        const res = await getMe();
        if (res?.data?._id) {
          localStorage.setItem("userId", res.data._id);
          setUser(res.data);
        } else {
          localStorage.removeItem("userId");
          setUser(null);
        }
      } catch {
        localStorage.removeItem("userId");
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    syncUser();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: "smooth" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  const features = [
    {
      icon: <Bot className="w-8 h-8" />,
      title: "AI-Powered Generation",
      desc: "Generate SRS, WBS, Test Cases and many more in seconds with advanced AI.",
      color: "blue",
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Collaborative Review",
      desc: "Stakeholders review, approve, and refine documents in real-time with inline comments.",
      color: "purple",
    },
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Smart Validation",
      desc: "Multi-agent AI detects gaps, inconsistencies, and ensures 100% accuracy.",
      color: "green",
    },
    {
      icon: <TrendingUp className="w-8 h-8" />,
      title: "Version Control",
      desc: "Track every change with Git-style versioning and complete audit trails.",
      color: "orange",
    },
    {
      icon: <Zap className="w-8 h-8" />,
      title: "Agile Integration",
      desc: "Seamlessly sync with Slack, GitHub, Trello, and your entire workflow.",
      color: "indigo",
    },
    {
      icon: <FileText className="w-8 h-8" />,
      title: "Knowledge Hub",
      desc: "Centralized, searchable repository of all project documentation and history.",
      color: "pink",
    },
  ];

  const stats = [
    { number: "10x", label: "Faster Documentation" },
    { number: "95%", label: "Time Saved" },
    { number: "100%", label: "Consistency" },
    { number: "24/7", label: "AI Availability" },
  ];

  const integrations = [
    {
      name: "Trello",
      logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/trello/trello-plain.svg",
    },
    {
      name: "GitHub",
      logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg",
    },
    {
      name: "Slack",
      logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/slack/slack-original.svg",
    },
  ];

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* ANIMATED BACKGROUND */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* NAVBAR */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-white/95 backdrop-blur-lg shadow-md"
            : "bg-white/70 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-transform">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                AutoDocGen
              </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollToSection("features")}
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Features
              </button>
              <button
                onClick={() => scrollToSection("integrations")}
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Integrations
              </button>
              <button
                onClick={() => scrollToSection("how-it-works")}
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                How It Works
              </button>

              {/* ✅ PRICING LINK ADDED */}
              <Link
                to="/pricing"
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Pricing
              </Link>

              <button
                onClick={() => scrollToSection("contact")}
                className="text-gray-600 hover:text-indigo-600 font-medium transition-colors"
              >
                Contact
              </button>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center gap-3">
              <Link to="/signin">
                <button className="text-gray-700 hover:text-indigo-600 font-semibold px-4 py-2 rounded-lg hover:bg-gray-50 transition-all">
                  Sign In
                </button>
              </Link>
              <Link to="/signup">
                <button className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:shadow-indigo-300 transition-all transform hover:-translate-y-0.5 flex items-center gap-2">
                  Get Started <ArrowRight size={16} />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative pt-32 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-full px-4 py-2 mb-8 animate-fade-in">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span className="text-sm font-semibold text-indigo-700">
                AI-Powered Documentation Platform
              </span>
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 mb-6 leading-tight tracking-tight">
              Documentation That
              <span className="block mt-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                Writes Itself
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl sm:text-2xl text-gray-600 mb-12 leading-relaxed max-w-3xl mx-auto">
              Generate, manage, and scale AI-powered software documentation with
              flexible subscription plans for individuals and teams.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-6">
              <Link to="/signup">
                <button className="group bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl text-lg font-bold hover:shadow-2xl hover:shadow-indigo-300 transition-all transform hover:-translate-y-1 flex items-center gap-2">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <button className="group border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-xl text-lg font-bold hover:border-indigo-600 hover:text-indigo-600 transition-all flex items-center gap-2">
                <Play className="w-5 h-5" />
                Watch Demo
              </button>
            </div>

            {/* ✅ PRICING LINK UNDER CTA */}
            <div className="mb-10">
              <Link
                to="/pricing"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-semibold text-base transition-colors group"
              >
                <CreditCard className="w-4 h-4" />
                View Pricing Plans
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap justify-center items-center gap-6 text-sm text-gray-500">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Flexible Subscription Plans</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Secure Payments with Stripe</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span>Scale for Individuals & Teams</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-20 max-w-5xl mx-auto">
            {stats.map((stat, index) => (
              <div key={index} className="text-center group">
                <div className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform">
                  {stat.number}
                </div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section
        id="features"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Everything You Need. Nothing You Don't.
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Powerful features designed to supercharge your documentation
              workflow
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group relative bg-white p-8 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2"
              >
                <div className="w-14 h-14 bg-gradient-to-r from-indigo-100 to-purple-100 rounded-xl flex items-center justify-center text-indigo-600 mb-5 group-hover:scale-110 group-hover:bg-gradient-to-r group-hover:from-indigo-600 group-hover:to-purple-600 group-hover:text-white transition-all duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section
        id="how-it-works"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-white"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-gray-600">
              Three simple steps to automated documentation
            </p>
          </div>

          <div className="relative">
            <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200 -translate-y-1/2 -z-10"></div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              {[
                {
                  step: "01",
                  title: "Connect Your Tools",
                  desc: "Integrate with Slack, GitHub, Trello, or import existing docs in seconds.",
                  icon: <Zap className="w-8 h-8" />,
                },
                {
                  step: "02",
                  title: "AI Does the Work",
                  desc: "Our multi-agent AI analyzes, generates, and structures comprehensive documentation.",
                  icon: <Bot className="w-8 h-8" />,
                },
                {
                  step: "03",
                  title: "Review & Publish",
                  desc: "Collaborate with your team, make refinements, and deploy with confidence.",
                  icon: <CheckCircle2 className="w-8 h-8" />,
                },
              ].map((item, index) => (
                <div key={index} className="relative text-center group">
                  <div className="relative inline-flex items-center justify-center mb-6">
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-full blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                    <div className="relative w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-2xl shadow-indigo-300 group-hover:scale-110 transition-transform">
                      {item.icon}
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center text-xs font-bold text-indigo-600 border-2 border-indigo-200">
                      {item.step}
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed max-w-sm mx-auto">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section
        id="integrations"
        className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-gray-50 to-white"
      >
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-gray-900 mb-4">
            Works With Your Favorite Tools
          </h2>
          <p className="text-xl text-gray-600 mb-12">
            Seamless integration with the tools you already use
          </p>

          <div className="flex flex-wrap justify-center items-center gap-8">
            {integrations.map((integration, index) => (
              <div
                key={index}
                className="group bg-white w-36 h-36 rounded-2xl border-2 border-gray-200 hover:border-indigo-400 flex flex-col items-center justify-center gap-3 hover:shadow-xl transition-all transform hover:-translate-y-2 cursor-pointer"
              >
                <img
                  src={integration.logo}
                  alt={integration.name}
                  className="w-12 h-12 object-contain group-hover:scale-110 transition-transform"
                />
                <div className="text-sm font-semibold text-gray-700 group-hover:text-indigo-600 transition-colors">
                  {integration.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section id="contact" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-3xl p-12 sm:p-16 text-center text-white shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl"></div>

            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-extrabold mb-4">
                Ready to Transform Your Workflow?
              </h2>
              <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
                Choose a subscription plan that fits your workflow and automate
                documentation with AI.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Link to="/signup">
                  <button className="bg-white text-indigo-600 px-8 py-4 rounded-xl text-lg font-bold hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-xl flex items-center gap-2">
                    Start Free Trial <ArrowRight size={20} />
                  </button>
                </Link>

                {/* ✅ PRICING LINK IN CTA */}
                <Link to="/pricing">
                  <button className="border-2 border-white text-white px-8 py-4 rounded-xl text-lg font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                    <CreditCard size={20} /> View Plans
                  </button>
                </Link>

                <a href="mailto:support@autodocgen.com">
                  <button className="border-2 border-white/50 text-white/80 px-8 py-4 rounded-xl text-lg font-bold hover:bg-white/10 transition-all flex items-center gap-2">
                    <Mail size={20} /> Contact Sales
                  </button>
                </a>
              </div>

              <p className="text-sm opacity-75">
                Have questions? Reach us at{" "}
                <a
                  href="mailto:support@autodocgen.com"
                  className="underline font-semibold"
                >
                  support@autodocgen.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 text-gray-400 py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-12">
            <div className="md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-white">
                  AutoDocGen
                </span>
              </div>
              <p className="text-gray-400 mb-6 max-w-sm">
                The AI-powered documentation platform that saves your team
                hundreds of hours every month.
              </p>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Product</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <button
                    onClick={() => scrollToSection("features")}
                    className="hover:text-white transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("integrations")}
                    className="hover:text-white transition-colors"
                  >
                    Integrations
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("how-it-works")}
                    className="hover:text-white transition-colors"
                  >
                    How It Works
                  </button>
                </li>
                {/* ✅ PRICING IN FOOTER */}
                <li>
                  <Link to="/pricing" className="hover:text-white transition-colors">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold mb-4">Support</h4>
              <ul className="space-y-3 text-sm">
                <li>
                  <a
                    href="mailto:support@autodocgen.com"
                    className="hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    support@autodocgen.com
                  </a>
                </li>
                <li>
                  <button
                    onClick={() => scrollToSection("contact")}
                    className="hover:text-white transition-colors"
                  >
                    Contact Us
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm">© 2026 AutoDocGen. All rights reserved.</p>
            <p className="text-sm">Made with ❤️ for developers</p>
          </div>
        </div>
      </footer>

      {/* CUSTOM ANIMATIONS */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(20px, -50px) scale(1.1); }
          50% { transform: translate(-20px, 20px) scale(0.9); }
          75% { transform: translate(50px, 50px) scale(1.05); }
        }
        .animate-blob { animation: blob 7s infinite; }
        .animation-delay-2000 { animation-delay: 2s; }
        .animation-delay-4000 { animation-delay: 4s; }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
      `}</style>
    </div>
  );
}