"use client";

import { useEffect } from "react";

const VISITS_KEY = "curated_goods_visits";
const FIRST_VISIT_KEY = "curated_goods_first_visit";

export function getVisitData(): { visitCount: number; firstVisit: string; lastVisit: string } {
  try {
    const visitCount = parseInt(localStorage.getItem(VISITS_KEY) || "0", 10);
    const firstVisit = localStorage.getItem(FIRST_VISIT_KEY) || "";
    return { visitCount, firstVisit, lastVisit: "" };
  } catch {
    return { visitCount: 0, firstVisit: "", lastVisit: "" };
  }
}

export default function VisitTracker() {
  useEffect(() => {
    try {
      const now = new Date().toISOString();
      const currentCount = parseInt(localStorage.getItem(VISITS_KEY) || "0", 10);
      const firstVisit = localStorage.getItem(FIRST_VISIT_KEY);

      localStorage.setItem(VISITS_KEY, String(currentCount + 1));
      if (!firstVisit) {
        localStorage.setItem(FIRST_VISIT_KEY, now);
      }
    } catch {
      // localStorage not available
    }
  }, []);

  return null;
}
