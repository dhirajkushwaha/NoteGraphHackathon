

import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import "./globals.css";


import Script from "next/script";
import Captcha from "@/components/Captcha";
import CustomCursor from "@/components/customCursor";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins-sans",
  subsets: ["latin"], // ✅ required
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

import SmoothScroller from "@/components/SmoothScroller";

import Navbar from "@/components/Navbar";

import Footer from "@/components/Footer";
export const metadata: Metadata = {
  title: "UTO - Engineered for Impact | Media Tech Solutions",
  description: "Transform media complexity into competitive advantage. Advanced tech, proven results, unstoppable growth. Complete media value chain enablement.",
};


import { PopupProvider, usePopup } from "@/context/PopupContext";

import CookiePopup from "@/components/CookieConsent";


import CookiePreferences from "../components/Cookie";

import GlobalPopup from "@/components/GlobalPopup";
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  return (
    <html lang="en">
      <body
        className={`  ${poppins.variable} antialiased`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-W50XGNLWXG"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-W50XGNLWXG');
          `}
        </Script>
        
        <PopupProvider>
           <CustomCursor />

          <Navbar />
          <GlobalPopup />
          <SmoothScroller>
            <main>
              {children}
              <Captcha   />

            </main>



          </SmoothScroller>
          {/* <CookiePopup /> */}
          {/* i commented this for removing the cookie  prefreence  */}
          {/* <CookiePreferences /> */}
        </PopupProvider>



      </body>
    </html>
  );
}