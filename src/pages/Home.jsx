import React from "react";

const BACKEND_URL = "https://autodocgen2-production-8e78.up.railway.app";

export default function Home() {
  const connectTrello = () => {
    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authWindow = window.open(
      `${BACKEND_URL}/trello/connect`,
      "TrelloAuth",
      `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
    );

    // Optional: Poll the popup until it closes (e.g., after successful auth)
    const timer = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(timer);
        console.log("Trello window closed ✅");
        // Optionally: refresh tokens or reload integrations list here
      }
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">
        Welcome to Trello Integration
      </h1>
      <p className="text-gray-600 mb-6 max-w-md">
        Connect your Trello account to sync boards, tasks, and documents
        automatically.
      </p>

      <button
        onClick={connectTrello}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-full text-sm sm:text-base shadow-md transition-all duration-200"
      >
        Connect to Trello
      </button>
    </div>
  );
}
