import { useState } from "react";
import { Link } from "react-router-dom";
import { localized, publicAssetUrl, usePortfolio } from "../portfolio-context.js";

const visuals = ["visual-orbit", "visual-bloom", "visual-form"];

export default function ProjectCard({ project, index }) {
  const { language, copy } = usePortfolio();
  const [activeImage, setActiveImage] = useState(0);
  const images = Array.isArray(project.images) ? project.images : project.image ? [project.image] : [];
  const imageIndex = activeImage < images.length ? activeImage : 0;
  const image = images[imageIndex];
  const title = localized(project.title, language);
  const className = `project-visual ${visuals[index % visuals.length]}`;
  const label = (
    <span className="project-visual-label">
      <span>{title}</span>
      <span className="project-open" aria-hidden="true">↗</span>
    </span>
  );
  const visual = (
    <>
      {image && <img className="project-image" src={publicAssetUrl(image)} alt={`${title} ${imageIndex + 1}`} loading="lazy" />}
      {project.url
        ? <a className="project-visual-link" href={project.url} target="_blank" rel="noopener noreferrer" aria-label={`${copy.projectsHeading.replace(/<[^>]*>/g, "")}: ${title}`}>{label}</a>
        : <div className="project-visual-label" aria-label={title}>
          <span>{title}</span>
          <span className="project-open" aria-hidden="true">↗</span>
        </div>}
      {images.length > 1 && (
        <div className="project-gallery-controls" dir="ltr">
          <button
            type="button"
            aria-label={copy.previousImage}
            onClick={() => setActiveImage((imageIndex - 1 + images.length) % images.length)}
          >
            ‹
          </button>
          <span aria-live="polite">{imageIndex + 1} / {images.length}</span>
          <button
            type="button"
            aria-label={copy.nextImage}
            onClick={() => setActiveImage((imageIndex + 1) % images.length)}
          >
            ›
          </button>
        </div>
      )}
    </>
  );

  return (
    <article className="project-card">
      <div className={`${className}${image ? " has-project-image" : ""}`}>
        {visual}
        {project.featured && <span className="project-featured-badge">{copy.projectFeatureBadge}</span>}
      </div>
      <div className="project-info">
        <div>
          <h2>{localized(project.title, language)}</h2>
          <p>{localized(project.description, language)}</p>
        </div>
        {project.stack?.length > 0 && (
          <div className="project-tags">
            {project.stack.map((item) => <span key={item}>{item}</span>)}
          </div>
        )}
        <Link className="project-detail-link" to={`/projects/${project.id}`}>
          {copy.projectDetails}<span aria-hidden="true">↗</span>
        </Link>
      </div>
    </article>
  );
}
