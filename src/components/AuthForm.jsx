import React from "react";

export default function AuthForm({ title, children }) {
  return (
    <div className="w-full max-w-md p-8 rounded-2xl backdrop-blur-md bg-white/10 border border-white/10 shadow-2xl text-gray-100">
      {title && (
        <h1 className="text-2xl font-semibold text-center mb-4">{title}</h1>
      )}
      <div className="space-y-4">{children}</div>
    </div>
  );
}
