"use client";
import { useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";

interface ThemeObserverProps {
  sectionSelectors: string[]; // e.g., ['#hero', '#about', '#contact']
}

const ThemeObserver = ({ sectionSelectors }: ThemeObserverProps) => {
  const { setTheme } = useTheme();

  useEffect(() => {
    const sections = sectionSelectors.map(sel => document.querySelector(sel));

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const theme = entry.target.getAttribute("data-theme");
            if (theme === "light" || theme === "dark") {
              setTheme(theme);
            }
          }
        });
      },
      { threshold: 0.5 } // fires when 50% of section is visible
    );

    sections.forEach(section => section && observer.observe(section));

    return () => {
      sections.forEach(section => section && observer.unobserve(section));
    };
  }, [sectionSelectors, setTheme]);

  return null; // does not render anything
};

export default ThemeObserver;
