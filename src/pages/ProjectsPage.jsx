import { useState } from "react";
import PageHeading from "../components/PageHeading.jsx";
import ProjectCard from "../components/ProjectCard.jsx";
import { usePortfolio } from "../portfolio-context.js";

export default function ProjectsPage() {
  const { content, copy } = usePortfolio();
  const [selectedType, setSelectedType] = useState("");
  const [selectedTechnology, setSelectedTechnology] = useState("");
  const projectTypes = [...new Set(content.projects.flatMap((project) => project.categories || []))].sort();
  const technologies = [...new Set(content.projects.flatMap((project) => project.stack || []))].sort();
  const filteredProjects = content.projects.filter((project) =>
    (!selectedType || project.categories?.includes(selectedType)) &&
    (!selectedTechnology || project.stack?.includes(selectedTechnology))
  );

  return (
    <section className="section page-section">
      <PageHeading eyebrow={copy.projectsEyebrow} title={<span dangerouslySetInnerHTML={{ __html: copy.projectsHeading }} />} description={copy.projectsIntro} />
      <div className="container projects-page-list">
        {content.projects.length > 0
          ? (
            <>
              <div className="project-filter-bar" role="group" aria-label={copy.projectFilters}>
                <label className="content-field">
                  <span>{copy.projectTypeFilter}</span>
                  <select value={selectedType} onChange={(event) => setSelectedType(event.target.value)}>
                    <option value="">{copy.projectAllTypes}</option>
                    {projectTypes.map((type) => <option value={type} key={type}>{type}</option>)}
                  </select>
                </label>
                <label className="content-field">
                  <span>{copy.projectTechnologyFilter}</span>
                  <select value={selectedTechnology} onChange={(event) => setSelectedTechnology(event.target.value)}>
                    <option value="">{copy.projectAllTechnologies}</option>
                    {technologies.map((technology) => <option value={technology} key={technology}>{technology}</option>)}
                  </select>
                </label>
              </div>
              {filteredProjects.length > 0
                ? <div className="project-grid">{filteredProjects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} />)}</div>
                : <p className="empty-state">{copy.projectNoFilterResults}</p>}
            </>
          )
          : <p className="empty-state">{copy.emptyProjects}</p>}
      </div>
    </section>
  );
}
