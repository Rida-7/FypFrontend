import React, { useEffect, useState, useRef } from "react";
import { Bell, X } from "lucide-react";
import api from "../api";

export default function NotificationBell({ userId }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const res = await api.get(`/notifications/${userId}`);

      setData(res.data.notifications || {});
      setUnreadCount(res.data.unread_count || 0);
    } catch (err) {
      console.error("❌ Notification fetch failed", err);
    }
  };

  useEffect(() => {
    if (!userId) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);

    return () => clearInterval(interval);
  }, [userId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markRead = async (id) => {
    setData((prev) => {
      const updated = structuredClone(prev);

      for (const group of Object.values(updated)) {
        const n = group.find?.((x) => x._id === id);
        if (n) n.is_read = true;
      }

      return updated;
    });

    setUnreadCount((c) => Math.max(c - 1, 0));

    try {
      await api.post(`/notifications/mark-read/${id}`);
    } catch (err) {
      console.error("❌ Failed to mark notification as read", err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* 🔔 Bell */}
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2"
      >
        <Bell size={22} />

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>

      {/* ================= Dropdown ================= */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white shadow-xl rounded-xl border max-h-96 overflow-y-auto z-50">

          {/* Header */}
          <div className="flex justify-between items-center p-3 font-semibold border-b">
            <span>Notifications</span>

            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <X size={18} />
            </button>
          </div>

          {Object.entries(data).length === 0 && (
            <div className="p-3 text-sm text-gray-500">
              No notifications yet.
            </div>
          )}

          {/* 🔥 UPDATED MULTI-SOURCE UI */}
          {Object.entries(data).map(([source, notifications]) => (
            <div key={source}>

              {/* Source Header */}
              <div className="bg-gray-100 px-3 py-2 font-semibold uppercase">
                {source}
              </div>

              {/* Notifications */}
              {notifications.map((n) => (
                <div
                  key={n._id}
                  className={`p-3 border-b text-sm ${
                    n.is_read ? "opacity-60" : ""
                  }`}
                >
                  <div>{n.message}</div>

                  <div className="text-xs text-gray-400">
                    {new Date(n.created_at).toLocaleString()}
                  </div>

                  {!n.is_read && (
                    <button
                      onClick={() => {
                        markRead(n._id);
                        setOpen(false);
                      }}
                      className="text-xs text-indigo-600 mt-1"
                    >
                      Mark as read
                    </button>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}