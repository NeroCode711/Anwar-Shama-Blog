import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { defaultContent } from "./default-content.js";
import { messages, themeOptions } from "./i18n.js";
import { localized } from "./portfolio-context.js";
import { PortfolioContext } from "./portfolio-context.js";
import SiteLayout from "./components/SiteLayout.jsx";
import AboutPage from "./pages/AboutPage.jsx";
import AdminPage from "./pages/AdminPage.jsx";
import BlogPage from "./pages/BlogPage.jsx";
import ContactPage from "./pages/ContactPage.jsx";
import ExperiencePage from "./pages/ExperiencePage.jsx";
import HomePage from "./pages/HomePage.jsx";
import ProjectsPage from "./pages/ProjectsPage.jsx";
import ProjectDetailsPage from "./pages/ProjectDetailsPage.jsx";
import ServicesPage from "./pages/ServicesPage.jsx";

function storedValue(key, fallback) {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

const themeColors = {
  light: "#f6f5f1",
  dark: "#1b1e1c",
  ocean: "#edf5f5",
  forest: "#f0f3ed",
  sunset: "#fbf0e9",
  lavender: "#f3f0f9",
  slate: "#1c232b"
};

export default function App() {
  const [language, setLanguage] = useState(() => storedValue("portfolio-language", "en"));
  const [theme, setTheme] = useState(() => {
    const savedTheme = storedValue("portfolio-theme", "light");
    return themeOptions.some((option) => option.value === savedTheme) ? savedTheme : "light";
  });
  const [content, setContent] = useState(defaultContent);
  const [contentStatus, setContentStatus] = useState("loading");
  const [contentError, setContentError] = useState("");

  const refreshContent = useCallback(async () => {
    setContentStatus("loading");
    setContentError("");
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}content.json`);
      if (!response.ok) throw new Error(`Content request failed (${response.status}).`);
      const data = await response.json();
      setContent(data);
      setContentStatus("ready");
    } catch (error) {
      setContentError(error.message);
      setContentStatus("error");
    }
  }, []);

  useEffect(() => {
    refreshContent();
  }, [refreshContent]);

  useEffect(() => {
    const root = document.documentElement;
    root.lang = language;
    root.dir = language === "ar" ? "rtl" : "ltr";
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = themeColors[theme];
    const name = localized(content.name, language);
    const role = localized(content.role, language);
    document.title = `${name} — ${role}`;
    document.querySelector('meta[name="description"]').content = localized(content.intro, language);
    try {
      window.localStorage.setItem("portfolio-language", language);
      window.localStorage.setItem("portfolio-theme", theme);
    } catch {
      // The selected settings still apply for this visit if storage is unavailable.
    }
  }, [content, language, theme]);

  const value = useMemo(() => ({
    content,
    contentStatus,
    contentError,
    refreshContent,
    language,
    setLanguage,
    theme,
    setTheme,
    copy: messages[language]
  }), [content, contentStatus, contentError, refreshContent, language, theme]);

  return (
    <PortfolioContext.Provider value={value}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route index element={<HomePage />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="projects" element={<ProjectsPage />} />
          <Route path="projects/:projectId" element={<ProjectDetailsPage />} />
          <Route path="blog" element={<BlogPage />} />
          <Route path="experience" element={<ExperiencePage />} />
          <Route path="services" element={<ServicesPage />} />
          <Route path="contact" element={<ContactPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </PortfolioContext.Provider>
  );
}
