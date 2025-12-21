import { useEffect, useState } from "react";
import ActivityGrid from "./ActivityGrid";
import ActivityGridMobile from "./ActivityGridMobile";

export default function ActivityGridWrapper() {
  const [isMobile, setIsMobile] = useState<null | boolean>(null);

  // Heights based on calculations
  const desktopHeight = "278px";
  const mobileHeight = "258px";

  // Use the maximum height to prevent content shift before determining device type
  const placeholderHeight = desktopHeight;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check on mount
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  if (isMobile === null) {
    // Return a placeholder with the expected height
    return <div style={{ height: placeholderHeight }} />;
  }

  return isMobile ? <ActivityGridMobile /> : <ActivityGrid />;
}
