"use client";

import React, { useState, useEffect, useRef } from "react";
import gsap from "gsap";
import {
  FOR_ADMIN_CONFIG,
  FOR_USER_CONFIG,
  SERVICE_ID,
  USER_ID,
} from "@/utils/email";
import emailjs from "@emailjs/browser";

type PopupProps = {
  isOpen: boolean;
  onClose: () => void;
  popupType: "meeting" | "default"; // extendable in future
};

export default function Popup({ isOpen, onClose, popupType }: PopupProps) {
  if (!isOpen) return null;

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [userDetails, setUserDetails] = useState({
    name: "",
    email: "",
    number: "",
    type: popupType === "meeting" ? "Meeting" : "Demo",
  });

  // --- Thank You Modal ---
  const ThankYouModal = () => {
    const modalRef = useRef<HTMLDivElement>(null);
    const lineRefs = useRef<(HTMLHeadingElement | HTMLParagraphElement | null)[]>(
      []
    );

    useEffect(() => {
      if (modalRef.current) {
        // fade in modal
        gsap.fromTo(
          modalRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.3, ease: "power2.out" }
        );
      }

      // fade in lines one by one
      if (lineRefs.current.length) {
        gsap.fromTo(
          lineRefs.current.filter(Boolean),
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.4,
          }
        );
      }

      // auto close after 5s with fade out
      const timer = setTimeout(() => {
        if (modalRef.current) {
          gsap.to(modalRef.current, {
            opacity: 0,
            duration: 0.6,
            ease: "power2.inOut",
            onComplete: () => {
              setSubmitted(false);
              onClose();
            },
          });
        }
      }, 5000);

      return () => clearTimeout(timer);
    }, []);

    return (
      <div
        ref={modalRef}
        className="backdrop-blur-[70px] text-white p-12 rounded-[20px] shadow-lg relative w-[400px] text-center"
        style={{
          background:
            "linear-gradient(135deg, rgb(80 80 80 / 27%) 0%, rgb(177 0 175 / 61%) 100%)",
        }}
      >
        <h2
          ref={(el) => {
            lineRefs.current[0] = el;
          }}
          className="text-2xl fontA font-medium mb-4 opacity-0"
        >
          Thank you!
        </h2>
        <p
          ref={(el) => {
            lineRefs.current[1] = el;
          }}
          className="mb-6 opacity-0"
        >
          Someone from our team will connect with&nbsp;you&nbsp;shortly.
        </p>

        <button
          onClick={() => {
            if (modalRef.current) {
              gsap.to(modalRef.current, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.inOut",
                onComplete: () => {
                  setSubmitted(false);
                  onClose();
                },
              });
            }
          }}
          className="bg-[#4c2560] cursor-pointer text-white px-6 py-3 rounded-lg hover:opacity-70 transition duration-500"
        >
          Close
        </button>
      </div>
    );
  };

  // handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserDetails((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // submit via emailjs
  const SubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      setLoading(true);

      console.log("🚀 Submitting details:", userDetails);

      const sendEmail = async (templateId: string) => {
        console.log("📨 Sending email with template:", templateId);
        const response = await emailjs.send(
          SERVICE_ID,
          templateId,
          userDetails,
          { publicKey: USER_ID }
        );
        console.log("✅ Email response:", response);
        return response;
      };

      const userRes = await sendEmail(FOR_USER_CONFIG.template_id);

      if (userRes.status === 200 && userRes.text === "OK") {
        await sendEmail(FOR_ADMIN_CONFIG.template_id);
        setSubmitted(true);
        setUserDetails({
          name: "",
          email: "",
          number: "",
          type: userDetails.type,
        });
      } else {
        console.error("❌ Unexpected EmailJS response:", userRes);
        setErrorMsg("Something went wrong. Please try again later.");
      }
    } catch (error: any) {
      console.error("❌ EmailJS error object:", error);
      console.error("🔍 Stringified error:", JSON.stringify(error, null, 2));
      setErrorMsg("Failed to send. Check console logs for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed z-[20]">
      <div className="absolute inset-0 px-3 w-screen h-screen flex items-center justify-center z-[50] bg-black/40">
        {!submitted ? (
          <div
            className="glass-card w-[94%] lg:w-[540px] mx-auto !rounded-[20px] overflow-hidden text-white flex flex-col justify-center px-3 py-5 md:px-10 md:py-15 h-fit relative"
            style={{
              backdropFilter: "blur(50px)",
              borderRadius: "0px",
              borderWidth: "0px",
              background:
                popupType === "meeting"
                  ? "linear-gradient(135deg, rgba(162, 89, 255, 0) 0%, rgb(107 0 102 / 96%) 100%)"
                  : "linear-gradient(135deg, rgb(162 89 255 / 0%) 0%, rgba(255, 31, 125, 0.32) 100%)",
            }}
          >
            {/* Close Button */}
            <div className="absolute top-5 right-5">
              <div
                onClick={onClose}
                className="glass-card text-sm !rounded-[15px] opacity-70 cursor-pointer z-1 flex items-center py-4 px-4"
              >
                <span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M0.353516 0.646484L14.6595 14.9524M15.1718 0.646484L0.865855 14.9524"
                      stroke="white"
                    />
                  </svg>
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="sticky">
              {popupType === "meeting" ? (
                <h2 className="z-[2] mt-4 capitalize md:mt-2 mb-4 fontA pt-10 lg:pt-[4vh] font-medium text-xl lg:text-[4vh]">
                  Let's explore how UTO can turn your biggest business
                  complexities into competitive advantages
                </h2>
              ) : (
                <>
                  <h2 className="z-[2] mt-2 md:mb-4 fontA pt-10 lg:pt-[4vh] font-medium text-xl lg:text-3xl">
                    Meet UTO at IBC!
                  </h2>
                  <p className="fontA font-regular text-2xl">
                    Hall 2, Stand B45
                  </p>
                </>
              )}

              {/* Form */}
              <form onSubmit={SubmitDetails}>
                <div className="poppins font-light my-8 xl:my-[1vh] flex flex-col gap-[2vh] text-light">
                  <input
                    className="py-4 px-5 bg-[#ffffff0d] rounded-[20px]"
                    type="text"
                    placeholder="Full Name*"
                    name="name"
                    value={userDetails.name}
                    onChange={handleChange}
                    required
                  />
                  <input
                    className="py-4 px-5 bg-[#ffffff0d] rounded-[20px]"
                    type="email"
                    placeholder="Email*"
                    name="email"
                    value={userDetails.email}
                    onChange={handleChange}
                    required
                  />
                  <input
                    className="py-4 px-5 bg-[#ffffff0d] rounded-[20px]"
                    type="text"
                    placeholder="Contact Number"
                    name="number"
                    value={userDetails.number}
                    onChange={handleChange}
                  />


                </div>

                <div className="  flex gap-4 ">
                  <input
                    type="checkbox"
                    name="number"
                  /> <span className="text-sm" >
                    By checking this box, I confirm that I have read and agree to the{" "}
                    <a
                      href="https://drive.google.com/file/d/1N57gQOK0Ig0tcTs4mrGRHnp-Q37F0nVV/view?usp=drive_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline "
                    >
                      privacy policy
                    </a>  {" "}
                    and {" "}
                    <a
                      href="https://drive.google.com/file/d/1m-tY4EJw0St7cVv7av8bYJ20rnwBS-oj/view?usp=drive_link"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline  "
                    >
                      cookie policy
                    </a>
                  </span>
                </div>

                {/* Error message */}
                {errorMsg && (
                  <p className="text-red-400 text-sm mb-2">{errorMsg}</p>
                )}

                {/* CTA Button */}
                <button
                  type="submit"
                  className="mt-5 flex relative overflow-hidden rounded-[20px] cursor-pointer"
                  disabled={loading}
                >
                  <div className="glass-card fontA z-1 flex items-center py-5 px-6">
                    <span className="opacity-70">
                      {loading
                        ? "Please Wait..."
                        : popupType === "meeting"
                          ? "Submit"
                          : "Book a Meeting"}
                    </span>
                  </div>
                  <div
                    className={`!absolute top-[-15px] glow-circle opacity-30 z-0 !h-[80px] ${popupType === "meeting" ? "!w-[90px]" : "!w-[150px]"
                      }`}
                  />
                </button>
              </form>
            </div>
          </div>
        ) : (
          <ThankYouModal />
        )}
      </div>
    </div>
  );
}
