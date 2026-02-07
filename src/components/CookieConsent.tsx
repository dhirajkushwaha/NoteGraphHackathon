"use client";

import React, { useState, useEffect } from "react";

// simple cookie helpers
const setCookie = (name: string, value: string, days: number) => {
  const date = new Date();
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
  const expires = "expires=" + date.toUTCString();
  document.cookie = `${name}=${value};${expires};path=/`;
};

const getCookie = (name: string) => {
  const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
  return match ? match[2] : null;
};

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = getCookie("cookieConsent");
    if (!consent) {
      setVisible(true); // show only if not set
    }
  }, []);

  const handleConsent = (value: "accepted" | "rejected") => {
    setCookie("cookieConsent", value, 365); // save for 1 year
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 w-full z-[50]">
      <div className="mx-auto max-w-5xl bg-white/90 backdrop-blur-md shadow-lg border border-gray-200 rounded-t-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Text */}
        <p className="text-gray-800 text-sm md:text-base leading-relaxed md:w-2/3">
          We use cookies to enhance your browsing experience, serve personalized
          ads or content, and analyze our traffic. You can accept or reject cookies below.
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => handleConsent("rejected")}
            className="px-4 py-2 text-sm rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 transition"
          >
            Reject
          </button>
          <button
            onClick={() => handleConsent("accepted")}
            className="px-4 py-2 text-sm rounded-lg bg-black text-white hover:bg-gray-800 transition"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
