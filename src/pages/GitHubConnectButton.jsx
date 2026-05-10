import React, { useState } from "react";
import { FaGithub } from "react-icons/fa";
import { ArrowRight } from "lucide-react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function GitHubConnectButton() {
  const [hovered, setHovered] = useState(false);

  const connectGitHub = () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return alert("User ID not found");

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authWindow = window.open(
      `${BACKEND_URL}/github/auth/connect?user_id=${userId}`,
      "GitHubAuth",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const timer = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(timer);
        window.location.href = "/github/repositories";
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">

      {/* Background radial */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_40%_at_50%_0%,rgba(99,102,241,0.06),transparent)]" />
      </div>

      {/* Card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="group relative bg-white border border-gray-200 rounded-2xl p-10 transition-all duration-200 overflow-hidden max-w-sm w-full mx-6 text-center"
        style={{
          boxShadow: hovered
            ? "0 8px 30px rgba(99,102,241,0.22), 0 1px 3px rgba(0,0,0,0.06)"
            : "0 1px 3px rgba(0,0,0,0.04)",
          transform: hovered ? "translateY(-2px)" : "translateY(0)",
          borderColor: hovered ? "transparent" : undefined,
          outline: hovered ? "1.5px solid rgba(99,102,241,0.4)" : "none",
        }}
      >
        {/* Top gradient bar on hover */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-700 to-purple-700 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

        {/* Icon */}
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-5">
          <FaGithub className="w-7 h-7 text-indigo-600" />
        </div>

        {/* Badge */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-sm">
            <FaGithub className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs font-bold tracking-widest text-indigo-500 uppercase">
            GitHub Integration
          </span>
        </div>

        <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight mb-2">
          Connect GitHub
        </h2>
        <p className="text-sm text-gray-500 leading-relaxed mb-7">
          Link your GitHub account to explore repositories and generate documentation.
        </p>

        {/* Button */}
        <button
          onClick={connectGitHub}
          className="w-full flex items-center justify-between bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
        >
          <span>Connect GitHub</span>
          <div
            className={`w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center transition-transform duration-200 ${hovered ? "translate-x-0.5" : ""}`}
          >
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
      </div>
    </div>
  );
}