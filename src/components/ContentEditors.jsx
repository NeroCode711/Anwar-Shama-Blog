import { useEffect, useState } from "react";
import {
  MAX_BLOG_CONTENT_BLOCKS,
  MAX_BLOG_MEDIA,
  MAX_PROJECT_IMAGES
} from "../default-content.js";
import { usePortfolio } from "../portfolio-context.js";

function entryId() {
  return globalThis.crypto?.randomUUID?.() || `entry-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newTextBlock(text = { en: "", ar: "" }) {
  return { id: entryId(), type: "text", text };
}

function newContentBlock(type) {
  if (type === "text") return newTextBlock();
  if (type === "heading" || type === "subtitle") return { id: entryId(), type, text: { en: "", ar: "" } };
  if (type === "link") return { id: entryId(), type, label: { en: "", ar: "" }, url: "" };
  if (type === "references") return { id: entryId(), type, items: [] };
  if (type === "code") return { id: entryId(), type, language: "javascript", code: "" };
  return null;
}

function prepareBlogPostForEditing(post) {
  if (Array.isArray(post.blocks)) return post;
  const englishParagraphs = (post.body?.en || "").split(/\n{2,}/).filter(Boolean);
  const arabicParagraphs = (post.body?.ar || "").split(/\n{2,}/).filter(Boolean);
  const paragraphCount = Math.max(englishParagraphs.length, arabicParagraphs.length, 1);
  const blocks = Array.from({ length: paragraphCount }, (_, index) => newTextBlock({
    en: englishParagraphs[index] || "",
    ar: arabicParagraphs[index] || ""
  }));
  for (const media of post.media || []) {
    blocks.push({ id: entryId(), type: "media", src: media.src });
  }
  return { ...post, blocks };
}

function prepareCollectionItems(items, kind) {
  return kind === "blogPosts" ? items.map(prepareBlogPostForEditing) : items;
}

function blogBodyFromBlocks(blocks, language) {
  return blocks
    .filter((block) => block.type === "text")
    .map((block) => block.text?.[language] || "")
    .filter(Boolean)
    .join("\n\n");
}

function BilingualField({ label, value, onChange, multiline = false, required = true }) {
  const { copy } = usePortfolio();
  const Input = multiline ? "textarea" : "input";

  return (
    <fieldset className="bilingual-field">
      <legend>{label}</legend>
      <label>
        <span>{copy.english}</span>
        <Input dir="auto" value={value.en || ""} onChange={(event) => onChange({ ...value, en: event.target.value })} required={required} />
      </label>
      <label>
        <span>{copy.arabic}</span>
        <Input dir="auto" lang="ar" value={value.ar || ""} onChange={(event) => onChange({ ...value, ar: event.target.value })} required={required} />
      </label>
    </fieldset>
  );
}

export function ProfileEditor({ fields }) {
  const { content, saveContent, copy } = usePortfolio();
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((field) => [field.key, content[field.key]])));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  useEffect(() => {
    setValues(Object.fromEntries(fields.map((field) => [field.key, content[field.key]])));
  }, [content]);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await saveContent(values);
      setStatus(copy.saved);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="content-editor profile-editor" onSubmit={submit}>
      <h2>{copy.editProfile}</h2>
      {fields.map((field) => {
        if (field.image) {
          return (
            <ImageUploadField
              key={field.key}
              images={values[field.key] ? [values[field.key]] : []}
              label={copy[field.label]}
              previewLabel={copy[field.previewLabel]}
              hintKey={field.hint}
              limitKey={field.limit}
              limitReachedKey={field.limitReached}
              maxImages={1}
              multiple={false}
              onUploading={setUploadingMedia}
              onChange={(updater) => setValues((current) => ({
                ...current,
                [field.key]: updater(current[field.key] ? [current[field.key]] : [])[0] || ""
              }))}
            />
          );
        }
        if (field.resume) {
          return (
            <ResumeUploadField
              key={field.key}
              value={values[field.key] || ""}
              label={copy[field.label]}
              onUploading={setUploadingMedia}
              onChange={(resume) => setValues((current) => ({ ...current, [field.key]: resume }))}
            />
          );
        }
        return (
          <BilingualField
            key={field.key}
            label={copy[field.label]}
            value={values[field.key] || { en: "", ar: "" }}
            multiline={field.multiline}
            required={field.required !== false}
            onChange={(value) => setValues((current) => ({ ...current, [field.key]: value }))}
          />
        );
      })}
      <div className="content-editor-actions">
        <button className="button button-primary" type="submit" disabled={saving || uploadingMedia}>{saving ? copy.saving : copy.save}</button>
        {status && <p role="status">{status}</p>}
      </div>
    </form>
  );
}

export function AboutEditor() {
  const { content, saveContent, copy } = usePortfolio();
  const [about, setAbout] = useState(content.about);
  const [now, setNow] = useState(content.now || { en: "", ar: "" });
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setStatus("");
    try {
      await saveContent({ about, now });
      setStatus(copy.saved);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="content-editor" onSubmit={submit}>
      <h2>{copy.editAbout}</h2>
      <BilingualField label={copy.aboutText} value={about} onChange={setAbout} multiline />
      <BilingualField label={copy.nowText} value={now} onChange={setNow} multiline required={false} />
      <div className="content-editor-actions">
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? copy.saving : copy.save}</button>
        {status && <p role="status">{status}</p>}
      </div>
    </form>
  );
}

function blankItem(kind) {
  if (kind === "skills") return { id: entryId(), name: { en: "", ar: "" }, icon: "" };
  if (kind === "projects") {
    return {
      id: entryId(),
      title: { en: "", ar: "" },
      description: { en: "", ar: "" },
      stack: [],
      categories: [],
      url: "",
      repoUrl: "",
      walkthroughUrl: "",
      challenge: { en: "", ar: "" },
      roleInProject: { en: "", ar: "" },
      solution: { en: "", ar: "" },
      result: { en: "", ar: "" },
      featured: false,
      images: []
    };
  }
  if (kind === "blogPosts") {
    return {
      id: entryId(),
      title: { en: "", ar: "" },
      publishedAt: new Date().toISOString().slice(0, 10),
      summary: { en: "", ar: "" },
      body: { en: "", ar: "" },
      categories: [],
      featured: false,
      media: [],
      relatedPosts: [],
      blocks: [newTextBlock()]
    };
  }
  if (kind === "services") {
    return { id: entryId(), title: { en: "", ar: "" }, description: { en: "", ar: "" }, idealFor: { en: "", ar: "" } };
  }
  if (kind === "testimonials") {
    return {
      id: entryId(),
      name: { en: "", ar: "" },
      role: { en: "", ar: "" },
      organization: { en: "", ar: "" },
      quote: { en: "", ar: "" },
      url: ""
    };
  }
  if (kind === "faqs") {
    return { id: entryId(), question: { en: "", ar: "" }, answer: { en: "", ar: "" } };
  }
  return {
    id: entryId(),
    role: { en: "", ar: "" },
    company: { en: "", ar: "" },
    period: { en: "", ar: "" },
    description: { en: "", ar: "" }
  };
}

const collectionFields = {
  skills: [
    { key: "name", label: "skillName", localized: true },
    {
      key: "icon",
      label: "skillIcon",
      image: true,
      singleImage: true,
      previewLabel: "skillIconPreview",
      hint: "skillIconHint",
      limit: "skillIconLimit",
      limitReached: "skillIconLimitReached"
    }
  ],
  projects: [
    { key: "title", label: "projectTitle", localized: true },
    { key: "description", label: "projectDescription", localized: true, multiline: true },
    { key: "stack", label: "projectStack", tags: true },
    { key: "categories", label: "projectCategories", tags: true, required: false },
    { key: "url", label: "projectUrl" },
    { key: "repoUrl", label: "projectRepoUrl", type: "url" },
    { key: "walkthroughUrl", label: "projectWalkthroughUrl", type: "url" },
    { key: "challenge", label: "projectChallenge", localized: true, multiline: true, required: false },
    { key: "roleInProject", label: "projectRole", localized: true, multiline: true, required: false },
    { key: "solution", label: "projectSolution", localized: true, multiline: true, required: false },
    { key: "result", label: "projectResult", localized: true, multiline: true, required: false },
    { key: "featured", label: "projectFeatured", boolean: true },
    { key: "images", label: "projectImages", image: true, withCaptions: true }
  ],
  blogPosts: [
    { key: "title", label: "blogTitle", localized: true },
    { key: "publishedAt", label: "blogDate", type: "date", required: true },
    { key: "summary", label: "blogSummary", localized: true, multiline: true },
    { key: "categories", label: "blogCategories", tags: true, required: false },
    { key: "featured", label: "blogFeatured", boolean: true },
    { key: "media", label: "blogMedia", media: true },
    { key: "blocks", label: "blogBody", blocks: true },
    { key: "relatedPosts", label: "relatedPosts", relatedPosts: true }
  ],
  services: [
    { key: "title", label: "serviceTitle", localized: true },
    { key: "description", label: "serviceDescription", localized: true, multiline: true },
    { key: "idealFor", label: "serviceIdealFor", localized: true, multiline: true, required: false }
  ],
  testimonials: [
    { key: "name", label: "testimonialName", localized: true },
    { key: "role", label: "testimonialRole", localized: true },
    { key: "organization", label: "testimonialOrganization", localized: true, required: false },
    { key: "quote", label: "testimonialQuote", localized: true, multiline: true },
    { key: "url", label: "testimonialUrl", type: "url" }
  ],
  faqs: [
    { key: "question", label: "faqQuestion", localized: true },
    { key: "answer", label: "faqAnswer", localized: true, multiline: true }
  ],
  experience: [
    { key: "role", label: "experienceRole", localized: true },
    { key: "company", label: "experienceCompany", localized: true },
    { key: "period", label: "experiencePeriod", localized: true },
    { key: "description", label: "experienceDescription", localized: true, multiline: true },
    {
      key: "image",
      label: "experienceImage",
      image: true,
      singleImage: true,
      previewLabel: "experienceImagePreview",
      hint: "experienceImageHint",
      limit: "experienceImageLimit",
      limitReached: "experienceImageLimitReached"
    }
  ]
};

export function CollectionEditor({ kind }) {
  const { content, saveContent, language, copy } = usePortfolio();
  const [editedItems, setEditedItems] = useState(() => prepareCollectionItems(content[kind] || [], kind));
  const [draft, setDraft] = useState(() => blankItem(kind));
  const [status, setStatus] = useState("");
  const [busyId, setBusyId] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const fieldConfig = collectionFields[kind];
  const titleKey = kind === "skills" ? "editSkills"
    : kind === "projects" ? "editProjects"
      : kind === "blogPosts" ? "editBlog"
        : kind === "services" ? "editServices"
          : kind === "testimonials" ? "editTestimonials"
            : kind === "faqs" ? "editFaqs"
        : "editExperience";
  const addKey = kind === "skills" ? "addSkill"
    : kind === "projects" ? "addProject"
      : kind === "blogPosts" ? "addBlogPost"
        : kind === "services" ? "addService"
          : kind === "testimonials" ? "addTestimonial"
            : kind === "faqs" ? "addFaq"
        : "addExperience";

  useEffect(() => setEditedItems(prepareCollectionItems(content[kind] || [], kind)), [content, kind]);

  async function persist(nextItems, id) {
    setBusyId(id);
    setStatus("");
    try {
      const itemsToSave = kind === "blogPosts"
        ? nextItems.map((item) => ({
          ...item,
          body: {
            en: blogBodyFromBlocks(item.blocks, "en"),
            ar: blogBodyFromBlocks(item.blocks, "ar")
          }
        }))
        : nextItems;
      await saveContent({ [kind]: itemsToSave });
      setStatus(copy.saved);
      return true;
    } catch (error) {
      setStatus(error.message);
      return false;
    } finally {
      setBusyId("");
    }
  }

  function updateField(item, field, value) {
    return { ...item, [field]: value };
  }

  function renderFields(item, onChange) {
    return fieldConfig.map((field) => {
      const changeField = (value) => onChange((current) => {
        const nextValue = typeof value === "function" ? value(current[field.key] || []) : value;
        const updated = updateField(current, field.key, nextValue);
        if (field.key === "media" && Array.isArray(current.blocks)) {
          const retainedSources = new Set(nextValue.map((media) => media.src));
          updated.blocks = current.blocks.filter((block) =>
            block.type !== "media" || retainedSources.has(block.src)
          );
        }
        if (field.key === "images" && Array.isArray(current.imageCaptions)) {
          updated.imageCaptions = current.imageCaptions.filter((caption) => nextValue.includes(caption.src));
        }
        return updated;
      });

      if (field.image) {
        const images = field.singleImage
          ? (item[field.key] ? [item[field.key]] : [])
          : item[field.key] || (item.image ? [item.image] : []);
        return (
          <ImageUploadField
            key={field.key}
            images={images}
            label={copy[field.label]}
            previewLabel={copy[field.previewLabel || "projectImagePreview"]}
            hintKey={field.hint}
            limitKey={field.limit}
            limitReachedKey={field.limitReached}
            captions={field.withCaptions ? item.imageCaptions || [] : undefined}
            onCaptionChange={field.withCaptions
              ? (src, text) => onChange((current) => current.map((entry) => entry.id === item.id
                ? {
                  ...entry,
                  imageCaptions: [
                    ...(entry.imageCaptions || []).filter((caption) => caption.src !== src),
                    { src, text }
                  ]
                }
                : entry))
              : undefined}
            maxImages={field.singleImage ? 1 : MAX_PROJECT_IMAGES}
            multiple={!field.singleImage}
            onUploading={setUploadingMedia}
            onChange={field.singleImage
              ? (updater) => changeField((currentImage) => {
                const currentImages = Array.isArray(currentImage) ? currentImage : currentImage ? [currentImage] : [];
                return updater(currentImages)[0] || "";
              })
              : changeField}
          />
        );
      }

      if (field.blocks) {
        return (
          <BlogContentBlocksField
            key={field.key}
            blocks={item[field.key] || []}
            media={item.media || []}
            label={copy[field.label]}
            onChange={changeField}
          />
        );
      }

      if (field.relatedPosts) {
        return (
          <RelatedPostsField
            key={field.key}
            posts={editedItems}
            currentPostId={item.id}
            selected={item[field.key] || []}
            label={copy[field.label]}
            onChange={changeField}
          />
        );
      }

      if (field.media) {
        return (
          <BlogMediaUploadField
            key={field.key}
            media={item[field.key] || []}
            label={copy[field.label]}
            onUploading={setUploadingMedia}
            onChange={changeField}
          />
        );
      }

      if (field.localized) {
        return (
          <BilingualField
            key={field.key}
            label={copy[field.label]}
            value={item[field.key] || { en: "", ar: "" }}
            multiline={field.multiline}
            required={field.required !== false}
            onChange={changeField}
          />
        );
      }

      if (field.boolean) {
        return (
          <label className="content-checkbox" key={field.key}>
            <input
              type="checkbox"
              checked={item[field.key] === true}
              onChange={(event) => changeField(event.target.checked)}
            />
            <span>{copy[field.label]}</span>
          </label>
        );
      }

      if (field.tags) {
        return (
          <label className="content-field" key={field.key}>
            <span>{copy[field.label]}</span>
            <input
              value={(item[field.key] || []).join(", ")}
              onChange={(event) => changeField(event.target.value.split(",").map((tag) => tag.trim()).filter(Boolean))}
            />
          </label>
        );
      }

      return (
        <label className="content-field" key={field.key}>
          <span>{copy[field.label]}</span>
          <input
            type={field.type || (field.key === "url" ? "url" : "text")}
            value={item[field.key] || ""}
            required={field.required}
            onChange={(event) => changeField(event.target.value)}
          />
        </label>
      );
    });
  }

  async function addItem(event) {
    event.preventDefault();
    if (kind === "projects" && draft.url && !/^https?:\/\//i.test(draft.url)) {
      setStatus(copy.urlInvalid);
      return;
    }
    const added = await persist([...editedItems, draft], draft.id);
    if (added) setDraft(blankItem(kind));
  }

  async function updateItem(event, item) {
    event.preventDefault();
    if (kind === "projects" && item.url && !/^https?:\/\//i.test(item.url)) {
      setStatus(copy.urlInvalid);
      return;
    }
    await persist(editedItems.map((entry) => entry.id === item.id ? item : entry), item.id);
  }

  async function deleteItem(id) {
    const remainingItems = editedItems.filter((entry) => entry.id !== id);
    const nextItems = kind === "blogPosts"
      ? remainingItems.map((post) => ({
        ...post,
        relatedPosts: (post.relatedPosts || []).filter((relatedId) => relatedId !== id)
      }))
      : remainingItems;
    await persist(nextItems, id);
  }

  return (
    <section className="content-editor collection-editor">
      <div className="collection-editor-heading">
        <h2>{copy[titleKey]}</h2>
        <span>{editedItems.length}</span>
      </div>
      {editedItems.length === 0 && <p className="editor-empty">{copy.noItemsYet}</p>}
      <div className="collection-items">
        {editedItems.map((item) => (
          <form className="collection-item-form" key={item.id} onSubmit={(event) => updateItem(event, item)}>
            <div className="collection-item-heading">
              <strong>{localizedItemTitle(item, kind, language)}</strong>
              <button className="text-button delete-button" type="button" disabled={busyId === item.id} onClick={() => deleteItem(item.id)}>
                {copy.delete}
              </button>
            </div>
            {renderFields(item, (updated) => {
              setEditedItems((current) => current.map((entry) => entry.id === item.id ? updated(entry) : entry));
            })}
            <button className="button button-quiet" type="submit" disabled={busyId === item.id || uploadingMedia}>
              {busyId === item.id ? copy.saving : copy.save}
            </button>
          </form>
        ))}
      </div>
      <form className="collection-item-form collection-add-form" onSubmit={addItem}>
        <h3>{copy.addEntry}</h3>
        {renderFields(draft, setDraft)}
        <button className="button button-primary" type="submit" disabled={Boolean(busyId) || uploadingMedia}>{copy[addKey]}</button>
      </form>
      {status && <p className="editor-status" role="status">{status}</p>}
    </section>
  );
}

function BlogContentBlocksField({ blocks, media, label, onChange }) {
  const { copy } = usePortfolio();
  const [selectedMediaSrc, setSelectedMediaSrc] = useState("");
  const [draggedBlockId, setDraggedBlockId] = useState("");
  const [dropTarget, setDropTarget] = useState(null);
  const placedMedia = new Set(blocks.filter((block) => block.type === "media").map((block) => block.src));
  const availableMedia = media.filter((item) => !placedMedia.has(item.src));
  const selectedSrc = availableMedia.some((item) => item.src === selectedMediaSrc)
    ? selectedMediaSrc
    : availableMedia[0]?.src || "";
  const canAddBlock = blocks.length < MAX_BLOG_CONTENT_BLOCKS;

  function updateBlock(id, updater) {
    onChange((current) => current.map((block) => block.id === id ? updater(block) : block));
  }

  function moveBlock(index, direction) {
    onChange((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function reorderBlocks(sourceId, targetId, position) {
    if (!sourceId || sourceId === targetId) return;
    onChange((current) => {
      const sourceIndex = current.findIndex((block) => block.id === sourceId);
      if (sourceIndex < 0) return current;
      const next = [...current];
      const [source] = next.splice(sourceIndex, 1);
      const targetIndex = next.findIndex((block) => block.id === targetId);
      if (targetIndex < 0) return current;
      next.splice(targetIndex + (position === "after" ? 1 : 0), 0, source);
      return next;
    });
  }

  function handleDragOver(event, targetId) {
    event.preventDefault();
    if (!draggedBlockId || draggedBlockId === targetId) return;
    event.dataTransfer.dropEffect = "move";
    const bounds = event.currentTarget.getBoundingClientRect();
    setDropTarget({
      id: targetId,
      position: event.clientY < bounds.top + bounds.height / 2 ? "before" : "after"
    });
  }

  function handleDrop(event, targetId) {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < bounds.top + bounds.height / 2 ? "before" : "after";
    reorderBlocks(event.dataTransfer.getData("text/plain") || draggedBlockId, targetId, position);
    setDraggedBlockId("");
    setDropTarget(null);
  }

  function addTextBlock() {
    addBlock("text");
  }

  function addBlock(type) {
    const block = newContentBlock(type);
    if (block) onChange((current) => [...current, block]);
  }

  function addMediaBlock() {
    if (!selectedSrc) return;
    const mediaItem = media.find((item) => item.src === selectedSrc);
    onChange((current) => current.some((block) => block.type === "media" && block.src === selectedSrc)
      ? current
      : [...current, {
        id: entryId(),
        type: "media",
        src: selectedSrc,
        layout: "full",
        ...(mediaItem?.type === "image" ? { width: 100, height: undefined, align: "center", fit: "contain" } : {})
      }]);
  }

  const addActions = [
    ["heading", copy.addSectionHeading],
    ["subtitle", copy.addSubtitle],
    ["link", copy.addLink],
    ["references", copy.addReferences],
    ["code", copy.addCodeSample]
  ];

  return (
    <div className="blog-content-block-editor">
      <div className="content-field">
        <span>{label}</span>
        <p className="image-upload-hint">{copy.blogBlocksHint}</p>
      </div>
      <div className="blog-content-blocks">
        {blocks.map((block, index) => {
          const mediaItem = block.type === "media" ? media.find((item) => item.src === block.src) : null;
          const dropClass = dropTarget?.id === block.id ? ` is-drop-${dropTarget.position}` : "";
          const blockTitle = block.type === "text" ? copy.blogTextBlock
            : block.type === "heading" ? copy.sectionHeading
              : block.type === "subtitle" ? copy.sectionSubtitle
                : block.type === "link" ? copy.linkBlock
                  : block.type === "references" ? copy.referencesBlock
                    : block.type === "code" ? copy.codeBlock
                      : copy.blogMediaBlock;
          return (
            <section
              className={`blog-content-block${dropClass}`}
              key={block.id}
              onDragOver={(event) => handleDragOver(event, block.id)}
              onDrop={(event) => handleDrop(event, block.id)}
            >
              <div className="blog-content-block-heading">
                <strong>{blockTitle}</strong>
                <div>
                  {(block.type === "heading" || block.type === "subtitle") && (
                    <code>{`#section-${block.id}`}</code>
                  )}
                  <button
                    className="text-button blog-block-drag-handle"
                    type="button"
                    draggable
                    aria-label={`${copy.dragBlock} ${index + 1}`}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = "move";
                      event.dataTransfer.setData("text/plain", block.id);
                      setDraggedBlockId(block.id);
                    }}
                    onDragEnd={() => {
                      setDraggedBlockId("");
                      setDropTarget(null);
                    }}
                  >
                    {copy.dragBlock}
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`${copy.moveBlockUp} ${index + 1}`}
                    disabled={index === 0}
                    onClick={() => moveBlock(index, -1)}
                  >
                    {copy.moveBlockUp}
                  </button>
                  <button
                    className="text-button"
                    type="button"
                    aria-label={`${copy.moveBlockDown} ${index + 1}`}
                    disabled={index === blocks.length - 1}
                    onClick={() => moveBlock(index, 1)}
                  >
                    {copy.moveBlockDown}
                  </button>
                  <button
                    className="text-button delete-button"
                    type="button"
                    aria-label={`${copy.removeBlock} ${index + 1}`}
                    onClick={() => onChange((current) => current.filter((entry) => entry.id !== block.id))}
                  >
                    {copy.removeBlock}
                  </button>
                </div>
              </div>
              <BlogBlockEditor
                block={block}
                mediaItem={mediaItem}
                media={media}
                copy={copy}
                onChange={(updater) => updateBlock(block.id, updater)}
              />
            </section>
          );
        })}
      </div>
      <div className="blog-content-block-actions">
        <button className="button button-quiet" type="button" disabled={!canAddBlock} onClick={addTextBlock}>
          {copy.addParagraphBlock}
        </button>
        {addActions.map(([type, title]) => (
          <button
            className="button button-quiet"
            type="button"
            key={type}
            disabled={!canAddBlock}
            onClick={() => addBlock(type)}
          >
            {title}
          </button>
        ))}
        <label className="content-field">
          <span>{copy.chooseBlogMedia}</span>
          <select
            value={selectedSrc}
            onChange={(event) => setSelectedMediaSrc(event.target.value)}
            disabled={!availableMedia.length || !canAddBlock}
          >
            {availableMedia.length
              ? availableMedia.map((item, index) => (
                <option key={item.src} value={item.src}>{copy[`${item.type}Media`]} {index + 1}</option>
              ))
              : <option value="">{copy.noBlogMediaAvailable}</option>}
          </select>
        </label>
        <button className="button button-quiet" type="button" disabled={!selectedSrc || !canAddBlock} onClick={addMediaBlock}>
          {copy.addMediaBlock}
        </button>
      </div>
    </div>
  );
}

function BlogBlockEditor({ block, mediaItem, media, copy, onChange }) {
  if (block.type === "text") {
    return (
      <>
        <BilingualField
          label={copy.blogTextBlock}
          value={block.text || { en: "", ar: "" }}
          onChange={(text) => onChange((current) => ({ ...current, text }))}
          multiline
        />
        <label className="blog-expand-toggle">
          <input
            type="checkbox"
            checked={block.expandable === true}
            onChange={(event) => onChange((current) => ({ ...current, expandable: event.target.checked }))}
          />
          <span>{copy.expandTextBlock}</span>
        </label>
      </>
    );
  }

  if (block.type === "heading" || block.type === "subtitle") {
    return (
      <BilingualField
        label={block.type === "heading" ? copy.sectionHeading : copy.sectionSubtitle}
        value={block.text || { en: "", ar: "" }}
        onChange={(text) => onChange((current) => ({ ...current, text }))}
      />
    );
  }

  if (block.type === "link") {
    return (
      <>
        <BilingualField
          label={copy.linkLabel}
          value={block.label || { en: "", ar: "" }}
          onChange={(label) => onChange((current) => ({ ...current, label }))}
        />
        <label className="content-field">
          <span>{copy.linkDestination}</span>
          <input
            type="text"
            dir="auto"
            value={block.url || ""}
            required
            onChange={(event) => onChange((current) => ({ ...current, url: event.target.value }))}
          />
        </label>
      </>
    );
  }

  if (block.type === "references") {
    return (
      <BlogReferencesEditor
        items={block.items || []}
        onChange={(items) => onChange((current) => ({ ...current, items }))}
      />
    );
  }

  if (block.type === "code") {
    const codeLanguages = [
      ["javascript", copy.codeLanguageJavascript],
      ["typescript", copy.codeLanguageTypescript],
      ["python", copy.codeLanguagePython],
      ["bash", copy.codeLanguageBash],
      ["json", copy.codeLanguageJson],
      ["html", copy.codeLanguageHtml],
      ["css", copy.codeLanguageCss],
      ["sql", copy.codeLanguageSql],
      ["text", copy.codeLanguageText]
    ];
    return (
      <div className="blog-code-editor">
        <label className="content-field">
          <span>{copy.codeLanguage}</span>
          <select
            value={block.language}
            onChange={(event) => onChange((current) => ({ ...current, language: event.target.value }))}
          >
            {codeLanguages.map(([value, title]) => <option key={value} value={value}>{title}</option>)}
          </select>
        </label>
        <label className="content-field">
          <span>{copy.codeSample}</span>
          <textarea
            className="code-sample-input"
            dir="ltr"
            value={block.code}
            spellCheck="false"
            onChange={(event) => onChange((current) => ({ ...current, code: event.target.value }))}
          />
        </label>
      </div>
    );
  }

  if (block.type !== "media") return null;

  return (
    <div className="blog-content-media-block">
      <label className="content-field">
        <span>{copy.chooseBlogMedia}</span>
        <select
          value={mediaItem ? block.src : ""}
          onChange={(event) => {
            const selectedItem = media.find((item) => item.src === event.target.value);
            onChange((current) => {
              const { width, height, columnWidth, align, fit, ...withoutImageLayout } = current;
              return selectedItem?.type === "image"
                ? {
                  ...current,
                  src: selectedItem.src,
                  width: width ?? 100,
                  align: align || "center",
                  fit: fit || "contain"
                }
                : { ...withoutImageLayout, src: event.target.value };
            });
          }}
        >
          <option value="" disabled>{copy.chooseBlogMedia}</option>
          {media.map((item, index) => (
            <option key={item.src} value={item.src}>
              {copy[`${item.type}Media`]} {index + 1}
            </option>
          ))}
        </select>
      </label>
      <label className="content-field">
        <span>{copy.mediaLayout}</span>
        <select
          value={block.layout || "full"}
          onChange={(event) => onChange((current) => {
            const layout = event.target.value;
            if (layout === "full") {
              const { columnWidth, ...withoutColumnWidth } = current;
              return { ...withoutColumnWidth, layout };
            }
            return { ...current, layout, ...(mediaItem?.type === "image" ? { columnWidth: current.columnWidth ?? 45 } : {}) };
          })}
        >
          <option value="full">{copy.mediaLayoutFull}</option>
          <option value="side-start">{copy.mediaLayoutStart}</option>
          <option value="side-end">{copy.mediaLayoutEnd}</option>
        </select>
      </label>
      {mediaItem?.type === "image" && (
        <BlogImageLayoutControls
          width={block.width ?? 100}
          height={block.height}
          columnWidth={block.columnWidth ?? 45}
          showColumnWidth={block.layout !== "full"}
          align={block.align || "center"}
          fit={block.fit || "contain"}
          onWidthChange={(width) => onChange((current) => ({ ...current, width }))}
          onHeightChange={(height) => onChange((current) => ({ ...current, height }))}
          onColumnWidthChange={(columnWidth) => onChange((current) => ({ ...current, columnWidth }))}
          onAlignChange={(align) => onChange((current) => ({ ...current, align }))}
          onFitChange={(fit) => onChange((current) => ({ ...current, fit }))}
        />
      )}
      {mediaItem
        ? (
          <BlogMediaPreview
            item={mediaItem}
            alt={copy.blogMediaPreview}
            width={block.width ?? 100}
            height={block.height}
            align={block.align || "center"}
            fit={block.fit || "contain"}
          />
        )
        : <p className="editor-status">{copy.blogMediaMissing}</p>}
    </div>
  );
}

function BlogReferencesEditor({ items, onChange }) {
  const { copy } = usePortfolio();

  function updateReference(id, updater) {
    onChange(items.map((item) => item.id === id ? updater(item) : item));
  }

  return (
    <div className="blog-reference-editor">
      {items.map((item, index) => (
        <div className="blog-reference-item" key={item.id}>
          <div className="blog-content-block-heading">
            <strong>{copy.referenceItem} {index + 1}</strong>
            <button
              className="text-button delete-button"
              type="button"
              onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
            >
              {copy.removeReference}
            </button>
          </div>
          <BilingualField
            label={copy.referenceTitle}
            value={item.label}
            onChange={(label) => updateReference(item.id, (current) => ({ ...current, label }))}
          />
          <label className="content-field">
            <span>{copy.linkDestination}</span>
            <input
              type="text"
              dir="auto"
              value={item.url}
              required
              onChange={(event) => updateReference(item.id, (current) => ({ ...current, url: event.target.value }))}
            />
          </label>
        </div>
      ))}
      <button
        className="button button-quiet"
        type="button"
        disabled={items.length >= 30}
        onClick={() => onChange([...items, { id: entryId(), label: { en: "", ar: "" }, url: "" }])}
      >
        {copy.addReference}
      </button>
    </div>
  );
}

function RelatedPostsField({ posts, currentPostId, selected, label, onChange }) {
  const { copy, language } = usePortfolio();
  const availablePosts = posts.filter((post) => post.id !== currentPostId);

  return (
    <fieldset className="related-posts-editor">
      <legend>{label}</legend>
      <p className="image-upload-hint">{copy.relatedPostsHint}</p>
      {availablePosts.length > 0
        ? availablePosts.map((post) => (
          <label className="related-post-option" key={post.id}>
            <input
              type="checkbox"
              checked={selected.includes(post.id)}
              disabled={!selected.includes(post.id) && selected.length >= 10}
              onChange={(event) => onChange((current) => event.target.checked
                ? [...current, post.id]
                : current.filter((id) => id !== post.id))}
            />
            <span>{localizedItemTitle(post, "blogPosts", language)}</span>
          </label>
        ))
        : <p className="image-upload-hint">{copy.noRelatedPosts}</p>}
    </fieldset>
  );
}

function BlogImageLayoutControls({
  width,
  height,
  columnWidth,
  showColumnWidth,
  align,
  fit,
  onWidthChange,
  onHeightChange,
  onColumnWidthChange,
  onAlignChange,
  onFitChange
}) {
  const { copy } = usePortfolio();
  const [widthInput, setWidthInput] = useState(String(width));
  const [heightInput, setHeightInput] = useState(height === undefined ? "" : String(height));
  const [columnWidthInput, setColumnWidthInput] = useState(String(columnWidth));

  useEffect(() => setWidthInput(String(width)), [width]);
  useEffect(() => setHeightInput(height === undefined ? "" : String(height)), [height]);
  useEffect(() => setColumnWidthInput(String(columnWidth)), [columnWidth]);

  function changeWidthInput(value) {
    setWidthInput(value);
    if (!/^\d+$/.test(value)) return;
    const parsedWidth = Number(value);
    if (parsedWidth >= 10 && parsedWidth <= 100) onWidthChange(parsedWidth);
  }

  function resetWidthInput() {
    const parsedWidth = Number(widthInput);
    if (!Number.isInteger(parsedWidth) || parsedWidth < 10 || parsedWidth > 100) {
      setWidthInput(String(width));
    }
  }

  function changeHeightInput(value) {
    setHeightInput(value);
    if (value === "") {
      onHeightChange(undefined);
      return;
    }
    if (!/^\d+$/.test(value)) return;
    const parsedHeight = Number(value);
    if (parsedHeight >= 80 && parsedHeight <= 1200) onHeightChange(parsedHeight);
  }

  function resetHeightInput() {
    const parsedHeight = Number(heightInput);
    if (heightInput !== "" &&
        (!Number.isInteger(parsedHeight) || parsedHeight < 80 || parsedHeight > 1200)) {
      setHeightInput(height === undefined ? "" : String(height));
    }
  }

  function changeColumnWidthInput(value) {
    setColumnWidthInput(value);
    if (!/^\d+$/.test(value)) return;
    const parsedWidth = Number(value);
    if (parsedWidth >= 20 && parsedWidth <= 80) onColumnWidthChange(parsedWidth);
  }

  function resetColumnWidthInput() {
    const parsedWidth = Number(columnWidthInput);
    if (!Number.isInteger(parsedWidth) || parsedWidth < 20 || parsedWidth > 80) {
      setColumnWidthInput(String(columnWidth));
    }
  }

  return (
    <div className="blog-image-layout-controls">
      <label className="content-field">
        <span>{copy.imageWidth}</span>
        <input
          type="range"
          min="10"
          max="100"
          step="1"
          value={width}
          aria-label={copy.imageWidth}
          onChange={(event) => onWidthChange(Number(event.target.value))}
        />
      </label>
      {showColumnWidth && (
        <>
          <label className="content-field">
            <span>{copy.mediaColumnWidth}</span>
            <input
              type="range"
              min="20"
              max="80"
              step="1"
              value={columnWidth}
              aria-label={copy.mediaColumnWidth}
              onChange={(event) => onColumnWidthChange(Number(event.target.value))}
            />
          </label>
          <label className="content-field">
            <span>{copy.mediaColumnWidthExact}</span>
            <input
              type="number"
              min="20"
              max="80"
              step="1"
              value={columnWidthInput}
              onChange={(event) => changeColumnWidthInput(event.target.value)}
              onBlur={resetColumnWidthInput}
            />
          </label>
        </>
      )}
      <label className="content-field">
        <span>{copy.imageWidthExact}</span>
        <input
          type="number"
          min="10"
          max="100"
          step="1"
          value={widthInput}
          onChange={(event) => changeWidthInput(event.target.value)}
          onBlur={resetWidthInput}
        />
      </label>
      <label className="content-field">
        <span>{copy.imageHeight}</span>
        <input
          type="number"
          min="80"
          max="1200"
          step="1"
          value={heightInput}
          placeholder={copy.imageHeightAuto}
          onChange={(event) => changeHeightInput(event.target.value)}
          onBlur={resetHeightInput}
        />
      </label>
      <label className="content-field">
        <span>{copy.imageAlignment}</span>
        <select value={align} onChange={(event) => onAlignChange(event.target.value)}>
          <option value="start">{copy.imageAlignStart}</option>
          <option value="center">{copy.imageAlignCenter}</option>
          <option value="end">{copy.imageAlignEnd}</option>
        </select>
      </label>
      <label className="content-field">
        <span>{copy.imageFit}</span>
        <select value={fit} onChange={(event) => onFitChange(event.target.value)}>
          <option value="contain">{copy.imageFitContain}</option>
          <option value="cover">{copy.imageFitCover}</option>
        </select>
      </label>
    </div>
  );
}

function BlogMediaPreview({ item, alt, width = 100, height, align = "center", fit = "contain" }) {
  const { copy } = usePortfolio();
  if (item.type === "image") {
    const justifyContent = align === "start" ? "flex-start" : align === "end" ? "flex-end" : "center";
    return (
      <div className="blog-image-preview-stage" style={{ justifyContent }}>
        <img
          src={item.src}
          alt={alt}
          loading="lazy"
          style={{ width: `${width}%`, height: height === undefined ? "auto" : `${height}px`, objectFit: fit }}
        />
      </div>
    );
  }
  if (item.type === "audio") {
    return <audio controls preload="metadata" src={item.src}>{copy.mediaUnsupported}</audio>;
  }
  if (item.type === "video") {
    return <video controls playsInline preload="metadata" src={item.src}>{copy.mediaUnsupported}</video>;
  }
  return null;
}

function BlogMediaUploadField({ media, label, onChange, onUploading }) {
  const { copy } = usePortfolio();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const remainingSlots = Math.max(0, MAX_BLOG_MEDIA - media.length);

  async function uploadMedia(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    if (files.length > remainingSlots) {
      setError(copy.blogMediaLimit);
      return;
    }

    setUploading(true);
    onUploading(true);
    setError("");
    try {
      for (const file of files) {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/admin/uploads/blog-media", {
          method: "POST",
          body
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || `Upload failed (${response.status}).`);
        if (!result.media?.type || !result.media?.src) throw new Error(copy.blogMediaUploadFailed);
        onChange((current) => [...current, result.media]);
      }
    } catch (uploadError) {
      setError(uploadError.message || copy.blogMediaUploadFailed);
    } finally {
      setUploading(false);
      onUploading(false);
    }
  }

  return (
    <div className="blog-media-editor">
      <label className="content-field">
        <span>{label}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,audio/mpeg,audio/wav,audio/ogg,video/mp4,video/webm"
          multiple
          onChange={uploadMedia}
          disabled={uploading || remainingSlots <= 0}
        />
      </label>
      <p className="image-upload-hint">
        {uploading ? copy.blogMediaUploading : remainingSlots === 0 ? copy.blogMediaLimitReached : copy.blogMediaHint}
      </p>
      {media.length > 0 && (
        <div className="blog-media-previews">
          {media.map((item, index) => (
            <div className="blog-media-preview" key={item.src}>
              <BlogMediaPreview item={item} alt={`${copy.blogMediaPreview} ${index + 1}`} />
              <button
                className="text-button delete-button"
                type="button"
                aria-label={`${copy.removeBlogMedia} ${index + 1}`}
                disabled={uploading}
                onClick={() => onChange((current) => current.filter((entry) => entry.src !== item.src))}
              >
                {copy.removeBlogMedia}
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="editor-status" role="alert">{error}</p>}
    </div>
  );
}

function ImageUploadField({
  images,
  label,
  previewLabel,
  maxImages = MAX_PROJECT_IMAGES,
  multiple = true,
  hintKey,
  limitKey,
  limitReachedKey,
  captions,
  onCaptionChange,
  onChange,
  onUploading
}) {
  const { copy } = usePortfolio();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const remainingSlots = Math.max(0, maxImages - images.length);

  async function uploadImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;
    if (files.length > remainingSlots) {
      setError(copy[limitKey] || copy.imageLimit);
      return;
    }

    setUploading(true);
    onUploading(true);
    setError("");
    try {
      const body = new FormData();
      files.forEach((file) => body.append("images", file));
      const response = await fetch("/api/admin/uploads/project-image", {
        method: "POST",
        body
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Upload failed (${response.status}).`);
      const uploadedImages = Array.isArray(result.images) ? result.images : result.image ? [result.image] : [];
      if (uploadedImages.length !== files.length) throw new Error(copy.imageUploadFailed);
      onChange((current) => [...current, ...uploadedImages]);
    } catch (uploadError) {
      setError(uploadError.message || copy.imageUploadFailed);
    } finally {
      setUploading(false);
      onUploading(false);
    }
  }

  return (
    <div className="project-image-editor">
      <label className="content-field">
        <span>{label}</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple={multiple}
          onChange={uploadImages}
          disabled={uploading || remainingSlots <= 0}
        />
      </label>
      <p className="image-upload-hint">
        {uploading
          ? copy.imageUploading
          : remainingSlots === 0
            ? copy[limitReachedKey] || copy.imageLimitReached
            : copy[hintKey] || copy.imageHint}
      </p>
      {images.length > 0 && (
        <div className="project-image-previews">
          {images.map((image, index) => (
            <div className="project-image-preview" key={image}>
              <img src={image} alt={`${previewLabel} ${index + 1}`} />
              {onCaptionChange && (
                <BilingualField
                  label={`${copy.screenshotCaption} ${index + 1}`}
                  value={captions.find((caption) => caption.src === image)?.text || { en: "", ar: "" }}
                  multiline
                  required={false}
                  onChange={(text) => onCaptionChange(image, text)}
                />
              )}
              <button
                className="text-button delete-button"
                type="button"
                aria-label={`${copy.removeImage} ${index + 1}`}
                disabled={uploading}
                onClick={() => onChange((current) => current.filter((_, imageIndex) => imageIndex !== index))}
              >
                {copy.removeImage}
              </button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="editor-status" role="alert">{error}</p>}
    </div>
  );
}

function localizedItemTitle(item, kind, language) {
  const key = kind === "skills" ? "name"
    : kind === "projects" || kind === "blogPosts" || kind === "services" ? "title"
      : kind === "testimonials" ? "name"
        : kind === "faqs" ? "question"
          : "role";
  const value = item[key];
  return value?.[language] || value?.en || "";
}

function ResumeUploadField({ value, label, onChange, onUploading }) {
  const { copy } = usePortfolio();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    onUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("resume", file);
      const response = await fetch("/api/admin/uploads/resume", { method: "POST", body });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || `Upload failed (${response.status}).`);
      if (typeof result.resume !== "string") throw new Error(copy.resumeUploadFailed);
      onChange(result.resume);
    } catch (uploadError) {
      setError(uploadError.message || copy.resumeUploadFailed);
    } finally {
      setUploading(false);
      onUploading(false);
    }
  }

  return (
    <div className="resume-upload-field">
      <label className="content-field">
        <span>{label}</span>
        <input type="file" accept="application/pdf,.pdf" onChange={uploadResume} disabled={uploading} />
      </label>
      <p className="image-upload-hint">
        {uploading ? copy.resumeUploading : value ? copy.resumeReady : copy.resumeHint}
      </p>
      {value && (
        <div className="resume-upload-actions">
          <a className="text-button" href={value} download>{copy.downloadResume}</a>
          <button className="text-button delete-button" type="button" onClick={() => onChange("")}>
            {copy.removeResume}
          </button>
        </div>
      )}
      {error && <p className="editor-status" role="alert">{error}</p>}
    </div>
  );
}

export function ContactEmailEditor() {
  const { content, saveContent, copy } = usePortfolio();
  const [email, setEmail] = useState(content.email || "");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setStatus(copy.emailInvalid);
      return;
    }
    setSaving(true);
    setStatus("");
    try {
      await saveContent({ email });
      setStatus(copy.saved);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="content-editor email-editor" onSubmit={submit}>
      <h2>{copy.editContact}</h2>
      <label className="content-field">
        <span>{copy.contactEmail}</span>
        <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
      </label>
      <div className="content-editor-actions">
        <button className="button button-primary" type="submit" disabled={saving}>{saving ? copy.saving : copy.save}</button>
        {status && <p role="status">{status}</p>}
      </div>
    </form>
  );
}
