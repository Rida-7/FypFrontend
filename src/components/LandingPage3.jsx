import React, { useEffect, useState, useRef } from "react";
import { ArrowRight, LogOut, ChevronDown, User } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getMe } from "../api";

export default function LandingPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [openMenu, setOpenMenu] = useState(false);
  const dropdownRef = useRef(null);

  const features = [
    { icon: "🎨", title: "Creative & Design" },
    { icon: "⚙️", title: "Operations" },
    { icon: "📣", title: "Marketing" },
    { icon: "📋", title: "Project Management", path: "/integrations" },
    { icon: "✅", title: "Task Management" },
    { icon: "👥", title: "HR" },
    { icon: "💻", title: "IT" },
    { icon: "🔗", title: "More Workflows" },
  ];

  const categories = [
    { title: "Work Management", desc: "Run all aspects of work" },
    { title: "CRM", desc: "Streamline sales processes" },
    { title: "Dev", desc: "Manage product lifecycles" },
  ];

  // -----------------------------
  // Sync user (Email + OAuth)
  // -----------------------------
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

  // -----------------------------
  // Close dropdown on outside click
  // -----------------------------
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpenMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // -----------------------------
  // Logout
  // -----------------------------
  const handleLogout = () => {
    localStorage.removeItem("userId");
    setUser(null);
    navigate("/signin");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-white flex flex-col items-center px-4 py-8">
      {/* NAVBAR */}
      <header className="w-full flex justify-between items-center max-w-6xl mb-10">
        <div className="text-2xl font-bold text-indigo-600">AutoDocGen</div>

        <nav className="hidden md:flex gap-6 text-gray-600">
          <a className="hover:text-black">Products</a>
          <a className="hover:text-black">Teams</a>
          <a className="hover:text-black">Platform</a>
          <a className="hover:text-black">Resources</a>
          {user && (
            <Link to="/documents" className="hover:text-black">
              My Documents
            </Link>
          )}
        </nav>

        {/* RIGHT SIDE */}
        {!user ? (
          <div className="flex gap-4">
            <Link to="/signin" className="text-gray-600 hover:text-black">
              Login
            </Link>
            <Link to="/signup">
              <button className="bg-indigo-600 text-white px-5 py-2 rounded-full hover:bg-indigo-700 flex items-center gap-2">
                Get Started <ArrowRight size={16} />
              </button>
            </Link>
          </div>
        ) : (
          <div className="relative" ref={dropdownRef}>
            {/* USER BUTTON */}
            <button
              onClick={() => setOpenMenu(!openMenu)}
              className="flex items-center gap-2 px-4 py-2 border rounded-full hover:bg-gray-50"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center">
                <User size={16} />
              </div>
              <span className="text-sm font-medium text-gray-800">
                {user.name || "Account"}
              </span>
              <ChevronDown size={16} />
            </button>

            {/* DROPDOWN */}
            {openMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white border rounded-xl shadow-lg overflow-hidden z-50">
                <div className="px-4 py-3 border-b">
                  <div className="text-sm font-semibold text-gray-800">
                    {user.name || "User"}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {user.email}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-gray-50"
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* HERO */}
      <section className="max-w-3xl text-center mb-14">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Build Faster, Document Smarter.
        </h1>
        <p className="text-gray-600 mb-8">
          Automatically create and manage project documents with AI.
        </p>

        {!user ? (
          <Link to="/signup">
            <button className="bg-indigo-600 text-white px-8 py-3 rounded-full hover:bg-indigo-700 flex items-center gap-2">
              Get Started <ArrowRight size={18} />
            </button>
          </Link>
        ) : (
          <Link to="/documents">
            <button className="bg-green-600 text-white px-8 py-3 rounded-full hover:bg-green-700">
              Go to Dashboard
            </button>
          </Link>
        )}
      </section>

      {/* CATEGORIES */}
      <section className="flex flex-wrap justify-center gap-4 mb-12">
        {categories.map((c, i) => (
          <div key={i} className="bg-gray-100 border px-6 py-3 rounded-xl w-44">
            <div className="font-semibold">{c.title}</div>
            <p className="text-sm text-gray-600">{c.desc}</p>
          </div>
        ))}
      </section>

      {/* FEATURES */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl">
        {features.map((f, i) =>
          f.path ? (
            <Link key={i} to={f.path}>
              <FeatureCard icon={f.icon} title={f.title} />
            </Link>
          ) : (
            <FeatureCard key={i} icon={f.icon} title={f.title} />
          )
        )}
      </section>
    </div>
  );
}

function FeatureCard({ icon, title }) {
  return (
    <div className="border rounded-2xl p-6 hover:shadow-md transition bg-white flex flex-col items-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-gray-700 font-medium">{title}</h3>
    </div>
  );
}
