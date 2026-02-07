"use client";
import { usePopup } from "@/context/PopupContext";
import Popup from "@/components/Popup";
import ImpactModal from "@/components/ImpactModal";
import ProfilePopup from "@/components/ProfilePopup";
import ThankYouModal from "@/components/ThankYouModal";

export default function GlobalPopup() {
  const { isOpen, type, closePopup, payload } = usePopup();

  if (!isOpen) return null;

  switch (type) {
    case "meeting":
    case "default":
      return <Popup isOpen={isOpen} onClose={closePopup} popupType={type} />;

    case "impact":
      if (Array.isArray(payload)) {
        return (
          <ImpactModal
            isOpen={isOpen}
            onClose={closePopup}
            impact={payload as [string, string, string]}
          />
        );
      }
      return null;

    case "profile":
      if (
        payload &&
        typeof payload === "object" &&
        !Array.isArray(payload) &&
        "url" in payload
      ) {
        return (
          <ProfilePopup
            isOpen={isOpen}
            onClose={closePopup}
            popup={payload as {
              url: string;
              name: string;
              position: string;
              description: string;
            }}
          />
        );
      }
      return null;

    case "thankyou": // ✅ now just call it directly
      return <ThankYouModal onClose={closePopup} />;

    default:
      return null;
  }
}
