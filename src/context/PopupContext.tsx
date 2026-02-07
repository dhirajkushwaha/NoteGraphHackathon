"use client";
import React, { createContext, useContext, useState, ReactNode } from "react";

// Define all popup types and their payloads
type PopupPayloadMap = {
  default: undefined;
  meeting: undefined;
  impact: [string, string, string]; // [title, description, image]
  profile: {
    url: string;
    name: string;
    position: string;
    description: string;
  };
  thankyou: undefined; // ✅ Added Thank You popup
};

export type PopupType = keyof PopupPayloadMap;

type PopupContextType = {
  isOpen: boolean;
  type: PopupType | null;
  payload: PopupPayloadMap[PopupType] | null;
  openPopup: <T extends PopupType>(
    popupType: T,
    payload?: PopupPayloadMap[T]
  ) => void;
  closePopup: () => void;
};

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const PopupProvider = ({ children }: { children: ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<PopupType | null>(null);
  const [payload, setPayload] = useState<any>(null);

  const openPopup = <T extends PopupType>(
    popupType: T,
    popupPayload?: PopupPayloadMap[T]
  ) => {
    setType(popupType);
    setPayload(popupPayload ?? null);
    setIsOpen(true);
  };

  const closePopup = () => {
    setIsOpen(false);
    setType(null);
    setPayload(null);
  };

  return (
    <PopupContext.Provider
      value={{ isOpen, type, payload, openPopup, closePopup }}
    >
      {children}
    </PopupContext.Provider>
  );
};

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (!context) throw new Error("usePopup must be used inside PopupProvider");
  return context;
};
