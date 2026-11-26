import { useState } from "react";
import PageHeading from "../components/PageHeading.jsx";
import { usePortfolio } from "../portfolio-context.js";

export default function ContactPage() {
  const { content, copy } = usePortfolio();
  const [status, setStatus] = useState("");

  function prepareEmail(event) {
    event.preventDefault();
    if (!content.email) {
      setStatus(copy.emailMissing);
      return;
    }
    const fields = new FormData(event.currentTarget);
    const subject = `Portfolio inquiry from ${fields.get("name")}`;
    const body = `${fields.get("message")}\n\nFrom: ${fields.get("name")}\nEmail: ${fields.get("email")}`;
    window.location.href = `mailto:${content.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <section className="section page-section contact-page">
      <PageHeading eyebrow={copy.contactEyebrow} title={copy.contactHeading} description={copy.contactIntro} />
      <div className="container contact-grid">
        <div className="contact-copy">
          {content.email
            ? <a className="contact-email" href={`mailto:${content.email}`}>{content.email}<span aria-hidden="true">↗</span></a>
            : <p className="empty-state">{copy.emailMissing}</p>}
        </div>
        <form className="contact-form" onSubmit={prepareEmail}>
          <div className="form-row">
            <label htmlFor="contact-name">{copy.yourName}</label>
            <input id="contact-name" name="name" type="text" autoComplete="name" required placeholder={copy.namePlaceholder} />
          </div>
          <div className="form-row">
            <label htmlFor="contact-email">{copy.yourEmail}</label>
            <input id="contact-email" name="email" type="email" autoComplete="email" required placeholder={copy.emailPlaceholder} />
          </div>
          <div className="form-row">
            <label htmlFor="contact-message">{copy.yourMessage}</label>
            <textarea id="contact-message" name="message" rows="4" required placeholder={copy.messagePlaceholder}></textarea>
          </div>
          <button className="button button-primary form-submit" type="submit">{copy.prepareEmail}<span className="arrow" aria-hidden="true">↗</span></button>
          <p className="form-note" role="status">{status || copy.emailNote}</p>
        </form>
      </div>
    </section>
  );
}
