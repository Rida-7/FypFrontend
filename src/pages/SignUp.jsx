import React, { useState } from "react";
import { Mail, Lock, User, Github } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { motion } from "framer-motion";
import { signUp } from "../api";
import { useNavigate } from "react-router-dom";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleSubmit(e) {
  e.preventDefault();
  try {
    const res = await signUp({ email, password, name });

    const user = res.data.user;
    if (!user || !user._id) {
      throw new Error("Signup failed: invalid user data");
    }

    
    localStorage.setItem("userId", user._id);
    console.log(" userId stored:", user._id);

    navigate("/landing");
  } catch (err) {
    console.error("Sign up failed:", err);
    setError(
      err.response?.data?.detail ||
      err.message ||
      "Sign up failed"
    );
  }
}

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-800 text-gray-100">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md p-8 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 shadow-2xl"
      >
        <h2 className="text-2xl font-semibold text-center mb-2 text-white">
          Create Account
        </h2>
        <p className="text-center text-gray-400 mb-6 text-sm">
          Join AutoDocGen and get started today
        </p>

        {error && (
          <div className="text-red-400 text-sm mb-3 text-center">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-1">
              <User size={16} /> Full Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Momina Rashad"
              className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-100 placeholder-gray-400 transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-1">
              <Mail size={16} /> Email
            </label>
            <input
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              type="email"
              className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-100 placeholder-gray-400 transition"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300 mb-1">
              <Lock size={16} /> Password
            </label>
            <input
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              className="w-full p-3 rounded-lg bg-white/10 border border-gray-600 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none text-gray-100 placeholder-gray-400 transition"
            />
          </div>

          <button className="w-full p-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg transition text-white font-medium shadow-lg">
            Create Account
          </button>
        </form>

        <div className="text-center text-gray-400 text-sm pt-5">
          Or continue with
        </div>

        <div className="flex gap-3 pt-3">
          <a
            href={`${
              BACKEND_URL
            }/auth/google`}
            className="flex-1 p-3 rounded-lg bg-white/10 border border-gray-600 flex items-center justify-center gap-2 hover:bg-white/20 transition"
          >
            <FcGoogle size={20} /> <span>Google</span>
          </a>
          <a
            href={`${
              BACKEND_URL
            }/auth/github`}
            className="flex-1 p-3 rounded-lg bg-white/10 border border-gray-600 flex items-center justify-center gap-2 hover:bg-white/20 transition"
          >
            <Github size={18} /> <span>GitHub</span>
          </a>
        </div>

        <div className="pt-5 text-sm text-center text-gray-300">
          Already have an account?{" "}
          <a href="/signin" className="text-indigo-400 hover:underline">
            Sign in
          </a>
        </div>
      </motion.div>
    </div>
  );
}
