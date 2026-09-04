import React, { createContext, useContext, useState, useEffect } from "react";

export type SegmentType = "premium" | "public";

interface SegmentContextProps {
  segment: SegmentType;
  setSegment: (segment: SegmentType) => void;
  toggleSegment: () => void;
}

const SegmentContext = createContext<SegmentContextProps | undefined>(undefined);

export const SegmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [segment, setSegmentState] = useState<SegmentType>(() => {
    const saved = localStorage.getItem("easy_pref_segment");
    return (saved === "premium" || saved === "public") ? (saved as SegmentType) : "premium";
  });

  const setSegment = (seg: SegmentType) => {
    setSegmentState(seg);
  };

  const toggleSegment = () => {
    setSegmentState((prev) => (prev === "premium" ? "public" : "premium"));
  };

  useEffect(() => {
    localStorage.setItem("easy_pref_segment", segment);
    const root = document.documentElement;
    if (segment === "public") {
      root.classList.add("segment-public");
      root.classList.remove("segment-premium");
    } else {
      root.classList.add("segment-premium");
      root.classList.remove("segment-public");
    }
  }, [segment]);

  return (
    <SegmentContext.Provider value={{ segment, setSegment, toggleSegment }}>
      {children}
    </SegmentContext.Provider>
  );
};

export const useSegment = () => {
  const context = useContext(SegmentContext);
  if (context === undefined) {
    throw new Error("useSegment must be used within a SegmentProvider");
  }
  return context;
};
