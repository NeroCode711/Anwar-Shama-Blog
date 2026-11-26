import { Link } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
import { localized, usePortfolio } from "../portfolio-context.js";

export default function ServicesPage() {
  const { content, language, copy } = usePortfolio();

  return (
    <section className="section page-section services-page">
      <PageHeading eyebrow={copy.servicesEyebrow} title={copy.servicesHeading} description={copy.servicesIntro} />
      <div className="container">
        {content.services.length > 0
          ? (
            <div className="services-grid">
              {content.services.map((service) => (
                <article className="service-card" key={service.id}>
                  <h2>{localized(service.title, language)}</h2>
                  <p>{localized(service.description, language)}</p>
                  {localized(service.idealFor, language) && (
                    <p className="service-ideal-for"><strong>{copy.serviceIdealFor}:</strong> {localized(service.idealFor, language)}</p>
                  )}
                </article>
              ))}
            </div>
          )
          : <p className="empty-state">{copy.servicesEmpty}</p>}

        <Link className="button button-primary services-contact" to="/contact">
          {copy.servicesContact}<span aria-hidden="true">↗</span>
        </Link>

        {content.faqs.length > 0 && (
          <section className="services-faq">
            <h2>{copy.faqHeading}</h2>
            <div className="faq-list">
              {content.faqs.map((faq) => (
                <details className="faq-item" key={faq.id}>
                  <summary>{localized(faq.question, language)}</summary>
                  <p>{localized(faq.answer, language)}</p>
                </details>
              ))}
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
