import { useEffect } from "react";

export function KossiRedirect() {
  useEffect(() => {
    const url = import.meta.env.VITE_KOSSI_URL || "http://localhost:3000";
    // Open Kossi in the same tab
    window.location.replace(url);
  }, []);

}

export default KossiRedirect;
