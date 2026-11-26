export default function PageHeading({ eyebrow, title, description }) {
  return (
    <header className="container page-heading">
      <p className="section-kicker">{eyebrow}</p>
      <h1>{title}</h1>
      {description && <p className="page-description">{description}</p>}
    </header>
  );
}
