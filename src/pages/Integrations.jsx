import React from "react";
import {
  SiSlack,
  SiTrello,
  SiClickup,
  SiNotion,
  SiJira,
  SiGithub,
} from "react-icons/si";
import SlackChannelSelector from "../pages/SlackChannelSelector";
const BACKEND_URL = "https://autodocgen2-production-8e78.up.railway.app";

export default function Integrations() {

  const [showSlackSelector, setShowSlackSelector] = React.useState(false);

  // ------------------ Trello OAuth ------------------
  const connectTrello = () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return alert("User ID not found");

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authWindow = window.open(
      `${BACKEND_URL}/trello/connect?user_id=${userId}`,
      "TrelloAuth",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const timer = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(timer);
        console.log("Trello window closed");
      }
    }, 1000);
  };

  // ------------------ Slack OAuth ------------------
  const connectSlack = () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return alert("User ID not found");

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const authWindow = window.open(
      `${BACKEND_URL}/slack/auth/connect?user_id=${userId}`,
      "SlackAuth",
      `width=${width},height=${height},left=${left},top=${top}`
    );

    const timer = setInterval(() => {
      if (authWindow.closed) {
        clearInterval(timer);
        navigate("/slack/select");   //  Show workspace selector
      }
    }, 1000);
  };

  const integrations = [
    {
      name: "Trello",
      icon: <SiTrello className="text-[#0079BF] w-12 h-12" />,
      description: "Manage your boards and tasks seamlessly from one place.",
      action: "Connect to Trello",
      onClick: connectTrello,
    },
    {
      name: "ClickUp",
      icon: <SiClickup className="text-[#7B68EE] w-12 h-12" />,
      description: "Sync tasks, projects, and workflows effortlessly.",
      action: "Connect to ClickUp",
    },
    {
      name: "Slack",
      icon: <SiSlack className="text-[#4A154B] w-12 h-12" />,
      description: "Stay connected and receive real-time updates in Slack.",
      action: "Connect to Slack",
      onClick: connectSlack,
    },
    {
      name: "Notion",
      icon: <SiNotion className="text-black w-12 h-12" />,
      description: "Integrate your Notion workspace to organize everything.",
      action: "Connect to Notion",
    },
    {
      name: "Jira",
      icon: <SiJira className="text-[#0052CC] w-12 h-12" />,
      description: "Track issues and manage sprints directly from your app.",
      action: "Connect to Jira",
    },
    {
      name: "GitHub",
      icon: <SiGithub className="text-gray-800 w-12 h-12" />,
      description: "Link your repositories and automate your development flow.",
      action: "Connect to GitHub",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-16 px-6">

      <div className="max-w-5xl mx-auto text-center mb-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Integrations
        </h1>
        <p className="text-gray-600 text-lg">
          Connect your favorite productivity tools and streamline your workflow.
        </p>
      </div>

      {/* Integration Cards */}
      <div className="max-w-6xl mx-auto grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((tool) => (
          <div
            key={tool.name}
            className="group bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-8 flex flex-col items-center text-center"
          >
            <div className="mb-4 group-hover:scale-110 transition-transform duration-300">
              {tool.icon}
            </div>

            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              {tool.name}
            </h2>

            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              {tool.description}
            </p>

            <button
              onClick={tool.onClick}
              className="mt-auto bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-5 rounded-xl shadow-md transition-colors duration-300"
            >
              {tool.action}
            </button>
          </div>
        ))}
      </div>

      {/* Slack Workspace Selector Appears Here */}
      {showSlackSelector && (
        <div className="max-w-4xl mx-auto mt-16">
          <SlackChannelSelector />
        </div>
      )}
    </div>
  );
}