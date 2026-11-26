import { Link } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { localized, publicAssetUrl, usePortfolio } from "../portfolio-context.js";

function HeroArtwork({ label, note }) {
  return (
    <div className="hero-art" role="img" aria-label={label}>
      <div className="art-orbit orbit-one"></div>
      <div className="art-orbit orbit-two"></div>
      <div className="art-stamp"><span>DESIGN</span><span>×</span><span>ENGINEER</span></div>
      <div className="code-window">
        <div className="window-top"><span></span><span></span><span></span><span className="window-title">anwar-shama.dev</span></div>
        <div className="code-content" aria-hidden="true">
          <p><span className="code-muted">01</span> <span className="code-purple">const</span> <span className="code-white">goodThings</span> = {"{"}</p>
          <p><span className="code-muted">02</span> &nbsp; <span className="code-blue">curiosity</span>: <span className="code-green">true</span>,</p>
          <p><span className="code-muted">03</span> &nbsp; <span className="code-blue">craft</span>: <span className="code-orange">"intentional"</span></p>
          <p><span className="code-muted">04</span> {"};"}</p>
          <p className="code-comment"><span className="code-muted">05</span> // always learning, always building</p>
        </div>
        <div className="window-footer"><span className="footer-pulse"></span><span>READY TO BUILD</span><span>UTF-8</span></div>
      </div>
      <div className="art-note"><span className="note-icon">✳</span><span>{note}</span></div>
      <span className="art-coordinate">ANWAR SHAMA&nbsp; / &nbsp;SOFTWARE</span>
    </div>
  );
}

export default function HomePage() {
  const { content, language, copy } = usePortfolio();
  const featuredProjects = content.projects.filter((project) => project.featured);
  const featured = (featuredProjects.length > 0 ? featuredProjects : content.projects).slice(0, 3);
  const featuredArticle = content.blogPosts.find((post) => post.featured) || content.blogPosts[0];

  return (
    <>
      <section className="hero container">
        <div className="hero-copy">
          <div className="hero-identity">
            {content.profileImage && (
              <img className="hero-profile-image" src={publicAssetUrl(content.profileImage)} alt={copy.aboutPhotoAlt} />
            )}
            <p className="eyebrow"><span className="status-dot"></span>{copy.availability}</p>
          </div>
          <h1 dangerouslySetInnerHTML={{ __html: copy.homeHeading }} />
          <p className="hero-intro">{localized(content.intro, language)}</p>
          {localized(content.workFocus, language) && (
            <p className="hero-work-focus"><strong>{copy.workFocusLabel}:</strong> {localized(content.workFocus, language)}</p>
          )}
          <div className="hero-actions">
            <Link className="button button-primary" to="/projects">{copy.exploreProjects}<span className="arrow" aria-hidden="true">↗</span></Link>
            <Link className="button button-quiet" to="/contact">{copy.getInTouch}</Link>
            {content.resume && <a className="button button-quiet" href={publicAssetUrl(content.resume)} download>{copy.downloadResume}</a>}
          </div>
          <div className="hero-meta">
            <span>{localized(content.role, language)}</span>
            {localized(content.location, language) && <><span className="meta-separator" aria-hidden="true"></span><span>{localized(content.location, language)}</span></>}
          </div>
        </div>
        <HeroArtwork label={copy.artLabel} note={copy.artNote} />
      </section>

      <section className="section work-section">
        <div className="container">
          <div className="section-topline">
            <div>
              <p className="section-kicker">{copy.selectedWork}</p>
              <h2 dangerouslySetInnerHTML={{ __html: copy.projectsTitle }} />
            </div>
            <Link className="inline-link" to="/projects">{copy.viewAll}<span aria-hidden="true">↗</span></Link>
          </div>
          {featured.length > 0
            ? <div className="project-grid">{featured.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}</div>
            : <p className="empty-state">{copy.emptyProjects}</p>}
        </div>
      </section>

      <section className="section home-about about-section">
        <div className="container home-about-inner">
          <div>
            <p className="section-kicker">{copy.aboutEyebrow}</p>
            <h2>{copy.aboutHeading}</h2>
          </div>
          <p>{localized(content.about, language)}</p>
          <Link className="inline-link" to="/about">{copy.navAbout}<span aria-hidden="true">↗</span></Link>
        </div>
      </section>

      {localized(content.now, language) && (
        <section className="section home-now">
          <div className="container">
            <p className="section-kicker">{copy.nowHeading}</p>
            <p>{localized(content.now, language)}</p>
          </div>
        </section>
      )}

      {content.testimonials.length > 0 && (
        <section className="section testimonials-section">
          <div className="container">
            <div className="section-topline">
              <div>
                <p className="section-kicker">{copy.testimonialsHeading}</p>
                <h2>{copy.testimonialsIntro}</h2>
              </div>
            </div>
            <div className="testimonials-grid">
              {content.testimonials.map((testimonial) => (
                <figure className="testimonial-card" key={testimonial.id}>
                  <blockquote>{localized(testimonial.quote, language)}</blockquote>
                  <figcaption>
                    <strong>{localized(testimonial.name, language)}</strong>
                    <span>{localized(testimonial.role, language)}{localized(testimonial.organization, language) && ` · ${localized(testimonial.organization, language)}`}</span>
                    {testimonial.url && <a href={testimonial.url} target="_blank" rel="noopener noreferrer">{copy.testimonialUrl}<span aria-hidden="true">↗</span></a>}
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {featuredArticle && (
        <section className="section featured-article-section">
          <div className="container featured-article-card">
            <div>
              <p className="section-kicker">{copy.featuredArticle}</p>
              <h2>{localized(featuredArticle.title, language)}</h2>
              <p>{localized(featuredArticle.summary, language)}</p>
            </div>
            <Link className="button button-quiet" to={`/blog#blog-${featuredArticle.id}`}>
              {copy.readArticle}<span aria-hidden="true">↗</span>
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
