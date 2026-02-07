"use client";

import { useEffect, useState } from "react";
import Cookies from "js-cookie";

type CookieSettings = {
  privacyPolicy: boolean;
  cookiePolicy: boolean;
  agreement: boolean;
};

const defaultSettings: CookieSettings = {
  privacyPolicy: false, 
  cookiePolicy: false,
  agreement: false,
};

export default function CookiePreferences() {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState<CookieSettings>(defaultSettings);

useEffect(() => {
  const saved = Cookies.get("cookie-preferences");
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setSettings({ ...defaultSettings, ...parsed });
    } catch {
      setSettings(defaultSettings);
    }
  } else {
    // no cookie → show popup
    setOpen(true);
  }
}, []);


  const handleToggle = (key: keyof CookieSettings) => {
     
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAllow = () => {
  if (!settings.privacyPolicy || !settings.cookiePolicy || !settings.agreement) return;
  Cookies.set("cookie-preferences", JSON.stringify(settings), {
    expires: 365,
    sameSite: "Lax",
  });
  setOpen(false);
};

  const handleDeny = () => {
  Cookies.set("cookie-preferences", JSON.stringify({ denied: true }), {
    expires: 365,
    sameSite: "Lax",
  });
  setOpen(false);
};

  return (
    <div className="poppins ">
      {/* Floating cookie button */}
      <button
        className="fixed z-[50] bottom-5 right-5  m-2 rounded-full text-white   cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {/* <img className=" w-[40px] lg:w-[50px] p-1" src="./img/cookie.png" alt="" /> */}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-[90vw] sm:w-[400px] rounded-xl p-6 shadow-xl relative">
            {/* Cross button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-6 text-gray-600 hover:text-black text-lg cursor-pointer"
            >
              ✖
            </button>

            {/* Privacy Policy */}
            <div className="border-b py-7">
              <div className="flex justify-between items-center">
                <span className="font-medium text-black ">Privacy Policy</span>
                <input type="checkbox"  checked={settings.privacyPolicy}   onChange={() => handleToggle("privacyPolicy")} />
              </div>
              <p className="text-sm text-gray-600">
                This Privacy Policy sets out how we use and protect any personal data that you
                provide when you use this website. UTO is committed to ensuring that your privacy is
                protected. Should we ask you to provide certain information by which you can be
                identified when using this website, you can be assured that it will only be used in
                accordance with this Privacy Policy.
              </p>
            </div>

            {/* Cookie Policy */}
            <div className="border-b py-3">
              <div className="flex justify-between items-center">
                <span className="font-medium text-black">Cookie Policy</span>
                <input
                  type="checkbox"
                  checked={settings.cookiePolicy}
                  onChange={() => handleToggle("cookiePolicy")}
                />
              </div>
              <p className="text-sm text-gray-600">
                Strictly necessary cookies are essential for the website to function properly (e.g.,
                security, load balancing) and cannot be disabled. Performance cookies collect
                information about how visitors use the site (e.g., pages visited, error messages) and
                are used to improve site performance.
              </p>
            </div>

            {/* Agreement */}
            <div className="py-3">
              <label className="flex items-start gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={settings.agreement}
                  onChange={() => handleToggle("agreement")}
                />
                <span>
                  I have read and agree to the{" "}
                  <a
                    href="https://drive.google.com/file/d/1N57gQOK0Ig0tcTs4mrGRHnp-Q37F0nVV/view?usp=drive_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600"
                  >
                    privacy policy
                  </a>  {" "}
                  and {" "}
                  <a
                    href="https://drive.google.com/file/d/1m-tY4EJw0St7cVv7av8bYJ20rnwBS-oj/view?usp=drive_link"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline text-blue-600"
                  >
                    cookie policy
                  </a> 
                </span>
              </label>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleDeny}
                className="flex-1 bg-red-700 hover:bg-red-800 text-white py-2 rounded-lg cursor-pointer"
              >
                Deny
              </button>
              <button
                onClick={handleAllow}
                disabled={!settings.agreement || !settings.cookiePolicy}
                className={`flex-1 py-2 rounded-lg cursor-pointer ${
                  settings.agreement && settings.cookiePolicy
                    ? "bg-green-700 hover:bg-green-800 text-white"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
