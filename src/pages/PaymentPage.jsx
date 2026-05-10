import React, { useState, useEffect } from "react";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Check, Zap } from "lucide-react";
import { useSearchParams, useNavigate } from "react-router-dom";

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// ======================================================
// CHECKOUT FORM
// ======================================================
function CheckoutForm({ clientSecret, plan, userId }) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    if (!stripe || !elements) return;

    setLoading(true);

    const card = elements.getElement(CardElement);

    const result = await stripe.confirmCardPayment(clientSecret, {
      payment_method: { card },
    });

    setLoading(false);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    if (result.paymentIntent.status === "succeeded") {

      // ======================================================
      // TEAM PLAN → upgrade + create workspace → /workspace
      // ======================================================
      if (plan === "team") {
        try {
          // 1. Upgrade subscription
          await axios.post(`${BACKEND_URL}/subscription/upgrade`, {
            user_id: userId,
            plan: "team",
          });

          // 2. Create workspace (auto, one per owner)
          await axios.post(`${BACKEND_URL}/workspace/create`, {
            user_id: userId,
            name: "My Team Workspace",
          });

          alert("Payment Successful 🎉 Your team workspace is ready!");
          navigate("/workspace");

        } catch (err) {
          console.error(err);
          alert("Payment succeeded. Redirecting to workspace...");
          navigate("/workspace");
        }

      // ======================================================
      // OTHER PLANS → /subscription
      // ======================================================
      } else {
        alert("Payment Successful 🎉");
        navigate("/subscription");
      }
    }
  };

  return (
    <div className="w-full max-w-md bg-white shadow-xl rounded-2xl p-6 border">

      {/* PLAN SUMMARY */}
      <div className="mb-4 bg-indigo-50 rounded-xl px-4 py-3 text-sm text-indigo-700 font-medium capitalize">
        Upgrading to: <span className="font-bold">{plan}</span> plan
      </div>

      <div className="border p-4 rounded-xl mb-6">
        <CardElement />
      </div>

      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Zap size={18} />
        {loading ? "Processing..." : `Pay for ${plan} plan`}
      </button>
    </div>
  );
}

// ======================================================
// PAYMENT PAGE
// ======================================================
export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState(null);
  const [searchParams] = useSearchParams();
  const plan = searchParams.get("plan");

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
    createPaymentIntent();
  }, []);

  const createPaymentIntent = async () => {
    try {
      const res = await axios.post(
        `${BACKEND_URL}/subscription/create-payment-intent`,
        { user_id: userId, plan }
      );
      setClientSecret(res.data.clientSecret);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="grid md:grid-cols-2 gap-8 w-full max-w-5xl">

        {/* LEFT — plan info */}
        <div className="bg-white p-8 rounded-2xl shadow">
          <h2 className="text-2xl font-bold mb-2 capitalize">
            {plan} Plan
          </h2>

          {/* Show team-specific info */}
          {plan === "team" && (
            <p className="text-sm text-indigo-600 mb-4 bg-indigo-50 rounded-xl px-3 py-2">
              🏢 After payment, your team workspace will be created automatically.
              You'll get an invite code to share with up to 4 teammates.
            </p>
          )}

          <div className="space-y-3 mt-4">
            <div className="flex gap-2 items-center">
              <Check className="text-green-500" size={18} />
              <span>AI Document Generation</span>
            </div>
            <div className="flex gap-2 items-center">
              <Check className="text-green-500" size={18} />
              <span>Slack / GitHub / Trello Integration</span>
            </div>
            <div className="flex gap-2 items-center">
              <Check className="text-green-500" size={18} />
              <span>Version History</span>
            </div>
            {plan === "team" && (
              <>
                <div className="flex gap-2 items-center">
                  <Check className="text-green-500" size={18} />
                  <span>Up to 5 team members</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Check className="text-green-500" size={18} />
                  <span>Shared workspace & documents</span>
                </div>
                <div className="flex gap-2 items-center">
                  <Check className="text-green-500" size={18} />
                  <span>Invite code for teammates</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT — stripe form */}
        <div>
          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <CheckoutForm
                clientSecret={clientSecret}
                plan={plan}
                userId={userId}   
              />
            </Elements>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400">
              Loading payment...
            </div>
          )}
        </div>

      </div>
    </div>
  );
}