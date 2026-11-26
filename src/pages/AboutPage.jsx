import PageHeading from "../components/PageHeading.jsx";
import { localized, publicAssetUrl, usePortfolio } from "../portfolio-context.js";

export default function AboutPage() {
  const { content, language, copy } = usePortfolio();

  return (
    <section className="section page-section">
      <PageHeading eyebrow={copy.aboutEyebrow} title={copy.aboutHeading} description={copy.aboutLead} />
      <div className="container about-page-grid">
        <div className="about-copy">
          {content.profileImage && (
            <img className="about-profile-image" src={publicAssetUrl(content.profileImage)} alt={copy.aboutPhotoAlt} />
          )}
          <p className="section-kicker">{localized(content.role, language)}</p>
          <h2>{content.name[language] || content.name.en}</h2>
          <p>{localized(content.about, language)}</p>
          {localized(content.workFocus, language) && (
            <p className="about-work-focus"><strong>{copy.workFocusLabel}:</strong> {localized(content.workFocus, language)}</p>
          )}
          {content.resume && (
            <a className="button button-quiet about-resume" href={publicAssetUrl(content.resume)} download>
              {copy.downloadResume}<span aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        <div className="about-skills">
          <h2>{copy.skillsHeading}</h2>
          {content.skills.length > 0
            ? (
              <ul className="skill-pills">
                {content.skills.map((skill) => (
                  <li key={skill.id}>
                    {skill.icon && <img className="skill-icon" src={publicAssetUrl(skill.icon)} alt="" aria-hidden="true" loading="lazy" />}
                    <span>{localized(skill.name, language)}</span>
                  </li>
                ))}
              </ul>
            )
            : <p className="empty-state">{copy.emptySkills}</p>}
        </div>
      </div>
    </section>
  );
}
