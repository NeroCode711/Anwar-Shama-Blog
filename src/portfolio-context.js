import { createContext, useContext } from "react";

export const PortfolioContext = createContext(null);

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) throw new Error("usePortfolio must be used inside PortfolioContext.");
  return context;
}

export function localized(value, language) {
  if (typeof value === "string") return value;
  return value?.[language] || value?.en || "";
}

export function publicAssetUrl(value) {
  if (typeof value !== "string" || value.length === 0) return "";
  if (/^(?:https?:|data:)/i.test(value)) return value;
  return `${import.meta.env.BASE_URL}${value.replace(/^\/+/, "")}`;
}
