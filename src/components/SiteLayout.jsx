import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { themeOptions } from "../i18n.js";
import { usePortfolio } from "../portfolio-context.js";

const navigation = [
  ["/", "navHome"],
  ["/about", "navAbout"],
  ["/projects", "navProjects"],
  ["/blog", "navBlog"],
  ["/experience", "navExperience"],
  ["/services", "navServices"],
  ["/contact", "navContact"]
];

export default function SiteLayout() {
  const { content, contentStatus, contentError, language, setLanguage, theme, setTheme, copy } = usePortfolio();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setMenuOpen(false), [location.pathname]);

  return (
    <>
      <a
        className="skip-link"
        href="#main"
        onClick={(event) => {
          event.preventDefault();
          const main = document.getElementById("main");
          main?.focus();
          main?.scrollIntoView();
        }}
      >
        {copy.skip}
      </a>
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" to="/" aria-label={content.name.en}>
            <span className="brand-mark">A<span>.</span></span>
            <span className="brand-name">{content.name[language] || content.name.en}</span>
          </Link>

          <button
            className="menu-toggle"
            id="menu-toggle"
            type="button"
            aria-expanded={menuOpen}
            aria-controls="site-nav"
            aria-label={menuOpen ? copy.menuClose : copy.menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span></span><span></span>
          </button>

          <nav className={`site-nav${menuOpen ? " is-open" : ""}`} id="site-nav" aria-label={copy.mainNav}>
            {navigation.map(([to, key]) => (
              <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => isActive ? "is-active" : ""}>
                {copy[key]}
              </NavLink>
            ))}
          </nav>

          <div className="header-actions">
            <button
              className="text-button"
              id="language-toggle"
              type="button"
              aria-label={copy.languageLabel}
              onClick={() => setLanguage(language === "en" ? "ar" : "en")}
            >
              {copy.switchLanguage}
            </button>
            <span className="action-divider" aria-hidden="true"></span>
            <select
              className="theme-picker"
              id="theme-picker"
              aria-label={copy.themeLabel}
              value={theme}
              onChange={(event) => setTheme(event.target.value)}
            >
              {themeOptions.map((option) => (
                <option key={option.value} value={option.value}>{copy[option.label]}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {contentStatus === "error" && (
        <div className="container api-alert" role="alert">
          {copy.contentUnavailable}
          <span className="api-error-detail">{contentError}</span>
        </div>
      )}

      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-inner">
          <Link className="brand footer-brand" to="/">
            <span className="brand-mark">A<span>.</span></span>
            <span className="brand-name">{content.name[language] || content.name.en}</span>
          </Link>
          <p>© {new Date().getFullYear()} {content.name.en}. {copy.footerMade}</p>
          <div className="footer-links">
            <Link to="/admin">{copy.contentGuide}</Link>
            <Link to="/contact">{copy.navContact}</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
