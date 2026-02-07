"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    grecaptcha: any;
  }
}

export default function Captcha() {
  useEffect(() => {
    const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!;
    const ACTION = "page_load";

    // 1️⃣ Load reCAPTCHA script (once)
    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if (window.grecaptcha) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src = `https://www.google.com/recaptcha/api.js?render=${SITE_KEY}`;
        script.async = true;
        script.defer = true;

        script.onload = () => resolve();
        script.onerror = () => reject("Failed to load reCAPTCHA script");

        document.body.appendChild(script);
      });

    // 2️⃣ Execute v3 check
    const runCaptcha = async () => {
      try {
        console.log("[reCAPTCHA] Waiting for ready...");

        await new Promise<void>((resolve) =>
          window.grecaptcha.ready(() => resolve())
        );

        console.log("[reCAPTCHA] Executing v3 check...");

        const token = await window.grecaptcha.execute(SITE_KEY, {
          action: ACTION,
        });

        console.log("[reCAPTCHA] Token generated");

        // 3️⃣ Send token + action to server
        const res = await fetch("/api/verify-captcha", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            action: ACTION,
          }),
        });

        const data = await res.json();

        if (data.success) {
          console.log(
            `[reCAPTCHA] Verified ✅ | Score: ${data.score} | Action: ${data.action}`
          );
        } else {
          console.warn("[reCAPTCHA] Verification failed ❌", data);
        }
      } catch (err) {
        console.error("[reCAPTCHA] Error during verification ❌", err);
      }
    };

    loadScript().then(runCaptcha);
  }, []);

  return null;
}
