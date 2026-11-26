import PageHeading from "../components/PageHeading.jsx";
import { usePortfolio } from "../portfolio-context.js";

export default function AdminPage() {
  const { copy } = usePortfolio();

  return (
    <section className="section page-section admin-page">
      <PageHeading
        eyebrow={copy.contentGuide}
        title={copy.staticContentTitle}
        description={copy.staticContentDescription}
      />
      <div className="container admin-panel static-content-guide">
        <ol>
          <li>{copy.staticContentStepOne}</li>
          <li>{copy.staticContentStepTwo}</li>
          <li>{copy.staticContentStepThree}</li>
        </ol>
      </div>
    </section>
  );
}
