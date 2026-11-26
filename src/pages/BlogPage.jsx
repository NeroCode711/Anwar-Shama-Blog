import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import PageHeading from "../components/PageHeading.jsx";
import { localized, publicAssetUrl, usePortfolio } from "../portfolio-context.js";

function formatDate(value, language) {
  return new Intl.DateTimeFormat(language === "ar" ? "ar" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(new Date(`${value}T12:00:00`));
}

function articleBlocks(post) {
  if (Array.isArray(post.blocks)) return post.blocks;
  return [
    { id: `${post.id}-body`, type: "text", text: post.body },
    ...(post.media || []).map((item, index) => ({
      id: `${post.id}-media-${index}`,
      type: "media",
      src: item.src
    }))
  ];
}

function articleText(block, language, copy) {
  const paragraphs = localized(block.text, language).split(/\n{2,}/).filter(Boolean);
  const content = (
    <div className="blog-post-body">
      {paragraphs.map((paragraph, index) => <p key={`${block.id}-${index}`}>{paragraph}</p>)}
    </div>
  );
  return block.expandable
    ? <details className="blog-expandable-text" key={block.id}>
      <summary>{copy.expandText}</summary>
      {content}
    </details>
    : <div key={block.id}>{content}</div>;
}

function mediaContent(item, block, title, copy, index) {
  const justifyContent = block.align === "start" ? "flex-start" : block.align === "end" ? "flex-end" : "center";
  return (
    <div
      className="blog-post-media-item"
      key={block.id || block.src}
      style={item.type === "image" ? { justifyContent } : undefined}
    >
      {item.type === "image" && (
        <img
          src={publicAssetUrl(item.src)}
          alt={`${title} ${index + 1}`}
          loading="lazy"
          style={{
            width: `${block.width ?? 100}%`,
            height: block.height === undefined ? "auto" : `${block.height}px`,
            objectFit: block.fit || "contain"
          }}
        />
      )}
      {item.type === "audio" && (
        <audio controls preload="metadata" src={publicAssetUrl(item.src)}>{copy.mediaUnsupported}</audio>
      )}
      {item.type === "video" && (
        <video controls playsInline preload="metadata" src={publicAssetUrl(item.src)}>{copy.mediaUnsupported}</video>
      )}
    </div>
  );
}

function linkTargetProps(url) {
  return /^https?:\/\//i.test(url) ? { target: "_blank", rel: "noopener noreferrer" } : {};
}

function articleLink(url, label) {
  if (url.startsWith("/")) return <Link to={url}>{label}</Link>;
  const onClick = url.startsWith("#")
    ? (event) => {
      event.preventDefault();
      document.getElementById(url.slice(1))?.scrollIntoView();
    }
    : undefined;
  return <a href={url} {...linkTargetProps(url)} onClick={onClick}>{label}</a>;
}

function BlogCodeSample({ block, copy }) {
  const [status, setStatus] = useState("");

  async function copyCode() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard access is unavailable.");
      await navigator.clipboard.writeText(block.code);
      setStatus(copy.codeCopied);
    } catch {
      setStatus(copy.codeCopyFailed);
    }
  }

  return (
    <div className="blog-code-sample">
      <details>
        <summary>{copy.codeSample}: {copy[`codeLanguage${block.language[0].toUpperCase()}${block.language.slice(1)}`] || block.language}</summary>
        <pre><code className={`language-${block.language}`}>{block.code}</code></pre>
      </details>
      <button className="text-button" type="button" onClick={copyCode}>{copy.copyCode}</button>
      {status && <span className="blog-code-copy-status" role="status">{status}</span>}
    </div>
  );
}

function renderArticleBlocks(post, blocks, language, copy) {
  const title = localized(post.title, language);
  const rendered = [];
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (block.type === "text") {
      rendered.push(articleText(block, language, copy));
      continue;
    }
    if (block.type === "media") {
      const item = post.media?.find((mediaItem) => mediaItem.src === block.src);
      if (!item) continue;
      const followingBlock = blocks[index + 1];
      if (block.layout !== "full" && followingBlock?.type === "text") {
        const media = mediaContent(item, block, title, copy, index);
        const text = articleText(followingBlock, language, copy);
        rendered.push(
          <div
            className={`blog-media-text-layout ${block.layout}`}
            key={block.id || block.src}
            style={{ "--media-column-width": `${block.columnWidth ?? 45}%` }}
          >
            {block.layout === "side-end" ? [text, media] : [media, text]}
          </div>
        );
        index += 1;
      } else {
        rendered.push(mediaContent(item, block, title, copy, index));
      }
      continue;
    }
    if (block.type === "heading") {
      rendered.push(<h3 className="blog-section-heading" id={`section-${block.id}`} key={block.id}>{localized(block.text, language)}</h3>);
      continue;
    }
    if (block.type === "subtitle") {
      rendered.push(<h4 className="blog-section-subtitle" id={`section-${block.id}`} key={block.id}>{localized(block.text, language)}</h4>);
      continue;
    }
    if (block.type === "link") {
      rendered.push(
        <p className="blog-link-block" key={block.id}>
          {articleLink(block.url, localized(block.label, language))}
        </p>
      );
      continue;
    }
    if (block.type === "references") {
      rendered.push(
        <section className="blog-references" key={block.id}>
          <h3>{copy.referencesHeading}</h3>
          <ol>
            {block.items.map((reference) => (
              <li key={reference.id}>
                {articleLink(reference.url, localized(reference.label, language))}
              </li>
            ))}
          </ol>
        </section>
      );
      continue;
    }
    if (block.type === "code") rendered.push(<BlogCodeSample block={block} copy={copy} key={block.id} />);
  }
  return rendered;
}

export default function BlogPage() {
  const { content, language, copy } = usePortfolio();
  const location = useLocation();
  const posts = [...(content.blogPosts || [])].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  const [query, setQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const categories = [...new Set(posts.flatMap((post) => post.categories || []))].sort();
  const normalizedQuery = query.trim().toLocaleLowerCase(language);
  const filteredPosts = posts.filter((post) => {
    const searchableText = [
      localized(post.title, language),
      localized(post.summary, language),
      localized(post.body, language),
      ...(post.categories || [])
    ].join(" ").toLocaleLowerCase(language);
    return (!selectedCategory || post.categories?.includes(selectedCategory)) &&
      (!normalizedQuery || searchableText.includes(normalizedQuery));
  });

  useEffect(() => {
    if (location.pathname !== "/blog" || !location.hash) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView();
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, location.pathname, posts.length]);

  return (
    <section className="section page-section blog-page">
      <PageHeading
        eyebrow={copy.blogEyebrow}
        title={<span dangerouslySetInnerHTML={{ __html: copy.blogHeading }} />}
        description={copy.blogIntro}
      />
      {posts.length > 0 && (
        <div className="container blog-filter-bar" role="group" aria-label={copy.blogSearch}>
          <label className="content-field">
            <span>{copy.blogSearch}</span>
            <input
              type="search"
              value={query}
              placeholder={copy.blogSearchPlaceholder}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="content-field">
            <span>{copy.blogCategoryFilter}</span>
            <select value={selectedCategory} onChange={(event) => setSelectedCategory(event.target.value)}>
              <option value="">{copy.blogAllCategories}</option>
              {categories.map((category) => <option value={category} key={category}>{category}</option>)}
            </select>
          </label>
        </div>
      )}
      <div className="container blog-list">
        {posts.length > 0
          ? filteredPosts.length > 0
            ? filteredPosts.map((post) => {
            const blocks = articleBlocks(post);
            const relatedPosts = (post.relatedPosts || [])
              .filter((relatedId) => relatedId !== post.id)
              .map((relatedId) => posts.find((relatedPost) => relatedPost.id === relatedId))
              .filter(Boolean);
            return (
              <article className="blog-post" id={`blog-${post.id}`} key={post.id}>
                <time className="blog-post-date" dateTime={post.publishedAt}>
                  {formatDate(post.publishedAt, language)}
                </time>
                <h2>{localized(post.title, language)}</h2>
                <p className="blog-post-summary">{localized(post.summary, language)}</p>
                <details className="blog-post-details" open={location.hash === `#blog-${post.id}`}>
                  <summary>{copy.readArticle}</summary>
                  <div className="blog-post-content">
                    {renderArticleBlocks(post, blocks, language, copy)}
                  </div>
                  {relatedPosts.length > 0 && (
                    <section className="blog-related-posts">
                      <h3>{copy.relatedPosts}</h3>
                      <div className="blog-related-post-list">
                        {relatedPosts.map((relatedPost) => (
                          <Link
                            className="blog-related-post"
                            to={`/blog#blog-${relatedPost.id}`}
                            key={relatedPost.id}
                          >
                            <strong>{localized(relatedPost.title, language)}</strong>
                            <span>{localized(relatedPost.summary, language)}</span>
                          </Link>
                        ))}
                      </div>
                    </section>
                  )}
                </details>
              </article>
            );
            })
            : <p className="empty-state">{copy.blogNoSearchResults}</p>
          : <p className="empty-state">{copy.emptyBlog}</p>}
      </div>
    </section>
  );
}
