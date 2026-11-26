import { Link, useParams } from "react-router-dom";
import { usePortfolio, localized, publicAssetUrl } from "../portfolio-context.js";

export default function ProjectDetailsPage() {
  const { projectId } = useParams();
  const { content, language, copy } = usePortfolio();
  const project = content.projects.find((item) => item.id === projectId);

  if (!project) {
    return (
      <section className="section page-section">
        <div className="container">
          <p className="empty-state">{copy.projectNotFound}</p>
          <Link className="inline-link" to="/projects">{copy.projectBack}<span aria-hidden="true">↗</span></Link>
        </div>
      </section>
    );
  }

  const title = localized(project.title, language);
  const images = Array.isArray(project.images) ? project.images : project.image ? [project.image] : [];
  const studySections = [
    ["challenge", "projectChallengeHeading"],
    ["roleInProject", "projectRoleHeading"],
    ["solution", "projectSolutionHeading"],
    ["result", "projectResultHeading"]
  ].filter(([field]) => localized(project[field], language));

  return (
    <section className="section page-section project-detail-page">
      <div className="container">
        <Link className="inline-link" to="/projects">{copy.projectBack}<span aria-hidden="true">↗</span></Link>
        <header className="project-detail-heading">
          <p className="section-kicker">{copy.projectDetailHeading}</p>
          <h1>{title}</h1>
          <p>{localized(project.description, language)}</p>
          {(project.categories?.length > 0 || project.stack?.length > 0) && (
            <div className="project-detail-tags">
              {[...(project.categories || []), ...(project.stack || [])].map((tag) => <span key={tag}>{tag}</span>)}
            </div>
          )}
          <div className="project-detail-actions">
            {project.url && <a className="button button-primary" href={project.url} target="_blank" rel="noopener noreferrer">{copy.projectDemo}<span aria-hidden="true">↗</span></a>}
            {project.repoUrl && <a className="button button-quiet" href={project.repoUrl} target="_blank" rel="noopener noreferrer">{copy.projectSource}<span aria-hidden="true">↗</span></a>}
            {project.walkthroughUrl && <a className="button button-quiet" href={project.walkthroughUrl} target="_blank" rel="noopener noreferrer">{copy.projectWalkthrough}<span aria-hidden="true">↗</span></a>}
          </div>
        </header>

        {studySections.length > 0 && (
          <div className="project-case-study">
            {studySections.map(([field, label]) => (
              <section key={field}>
                <h2>{copy[label]}</h2>
                <p>{localized(project[field], language)}</p>
              </section>
            ))}
          </div>
        )}

        {images.length > 0 && (
          <section className="project-detail-gallery">
            <h2>{copy.projectGalleryHeading}</h2>
            <div className="project-detail-images">
              {images.map((image, index) => {
                const caption = project.imageCaptions?.find((item) => item.src === image)?.text;
                const captionText = localized(caption, language);
                return (
                  <figure className="project-detail-image" key={image}>
                    <img src={publicAssetUrl(image)} alt={captionText || `${title} ${index + 1}`} loading="lazy" />
                    {captionText && <figcaption>{captionText}</figcaption>}
                  </figure>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
