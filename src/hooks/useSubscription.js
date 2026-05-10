import { useEffect, useState } from "react";
import axios from "axios";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

export default function useSubscription(userId) {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!userId) return;

    try {
      const res = await axios.get(
        `${BACKEND_URL}/subscription/status`,
        {
          params: { user_id: userId },
        }
      );

      setSubscription(res.data);
    } catch (err) {
      console.error("Subscription error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscription();

    // 🔥 real-time-ish update (every 5s)
    const interval = setInterval(() => {
      fetchSubscription();
    }, 5000);

    return () => clearInterval(interval);
  }, [userId]);

  return { subscription, loading, refetch: fetchSubscription };
}