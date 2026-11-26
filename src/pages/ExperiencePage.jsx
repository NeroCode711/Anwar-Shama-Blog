import PageHeading from "../components/PageHeading.jsx";
import { localized, publicAssetUrl, usePortfolio } from "../portfolio-context.js";

export default function ExperiencePage() {
  const { content, language, copy } = usePortfolio();

  return (
    <section className="section page-section">
      <PageHeading eyebrow={copy.experienceEyebrow} title={<span dangerouslySetInnerHTML={{ __html: copy.experienceHeading }} />} description={copy.experienceIntro} />
      <div className="container timeline experience-page-list">
        {content.experience.length > 0
          ? content.experience.map((item) => (
            <article className="timeline-item" key={item.id}>
              <span className="timeline-date">{localized(item.period, language)}</span>
              <div className="experience-position">
                <div>
                  <h2>{localized(item.role, language)}</h2>
                  <p className="timeline-company">{localized(item.company, language)}</p>
                </div>
                {item.image && (
                  <img
                    className="experience-image"
                    src={publicAssetUrl(item.image)}
                    alt={`${localized(item.role, language)} - ${localized(item.company, language)}`}
                    loading="lazy"
                  />
                )}
              </div>
              <p className="timeline-description">{localized(item.description, language)}</p>
            </article>
          ))
          : <p className="empty-state">{copy.emptyExperience}</p>}
      </div>
    </section>
  );
}
