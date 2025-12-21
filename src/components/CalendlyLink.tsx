"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    Calendly: {
      initPopupWidget: (options: { url: string }) => void;
    };
  }
}

const calendlyUrl = "https://calendly.com/d/cmp3-p94-bd3/hearth-onboarding";

const useCalendly = () => {
  useEffect(() => {
    // Create link element for Calendly styles
    const link = document.createElement("link");
    link.href = "https://assets.calendly.com/assets/external/widget.css";
    link.rel = "stylesheet";

    // Create script element for Calendly widget
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;

    // Append elements to the document head
    document.head.appendChild(link);
    document.head.appendChild(script);

    // Cleanup on component unmount
    return () => {
      document.head.removeChild(link);
      document.head.removeChild(script);
    };
  }, []);
};

const CalendlyLink = () => {
  useCalendly();

  const handleCalendlyClick = () => {
    if (window.Calendly) {
      window.Calendly.initPopupWidget({ url: calendlyUrl });
    }
  };

  return (
    <button className="text-brand-orange/80 hover:text-brand-orange underline ml-1" onClick={handleCalendlyClick}>
      Book a quick, 10-minute Hearth onboarding session
    </button>
  );
};

export default CalendlyLink;
