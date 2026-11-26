import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultContent,
  MAX_BLOG_CONTENT_BLOCKS,
  MAX_BLOG_MEDIA,
  MAX_PROJECT_IMAGES,
  MAX_RESUME_FILE_SIZE,
  isStoredResumePath,
  validatePortfolioContent
} from "../src/default-content.js";
import { messages, themeOptions } from "../src/i18n.js";
import { detectBlogMediaType, isStoredBlogMediaPath } from "./blog-media-validation.js";
import { detectProjectImageType } from "./image-validation.js";
import { detectResumeType } from "./resume-validation.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("the initial Anwar profile satisfies the portfolio content schema", () => {
  assert.equal(defaultContent.name.ar, "أنور شامة");
  assert.deepEqual(validatePortfolioContent(defaultContent), []);
});

test("the exported static content and its public uploads are valid", () => {
  const content = JSON.parse(readFileSync(path.join(projectRoot, "public", "content.json"), "utf8"));
  assert.equal(content.name.ar, "أنور شامة");
  assert.deepEqual(validatePortfolioContent(content), []);

  const uploadPaths = [
    content.profileImage,
    content.resume,
    ...content.skills.map((skill) => skill.icon),
    ...content.experience.map((item) => item.image),
    ...content.projects.flatMap((project) => project.images || []),
    ...content.blogPosts.flatMap((post) => (post.media || []).map((media) => media.src))
  ].filter(Boolean);
  for (const uploadPath of uploadPaths) {
    assert.ok(uploadPath.startsWith("/uploads/"), `Unexpected asset path: ${uploadPath}`);
    assert.ok(
      existsSync(path.join(projectRoot, "public", uploadPath.slice(1))),
      `Missing exported asset: ${uploadPath}`
    );
  }
});

test("content validation rejects malformed bilingual fields and unsafe project links", () => {
  const content = structuredClone(defaultContent);
  content.name = "Anwar";
  content.projects.push({
    id: "portfolio",
    title: { en: "Portfolio", ar: "الأعمال" },
    description: { en: "A project", ar: "مشروع" },
    stack: ["React"],
    url: "javascript:alert(1)"
  });

  const errors = validatePortfolioContent(content);
  assert.ok(errors.some((error) => error.startsWith("Name must")));
  assert.ok(errors.some((error) => error.includes("Project 1")));
});

test("content validation enforces list limits", () => {
  const content = structuredClone(defaultContent);
  content.skills = Array.from({ length: 51 }, (_, index) => ({
    id: `skill-${index}`,
    name: { en: "Skill", ar: "مهارة" }
  }));
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("no more than 50")));
});

test("the theme picker provides seven bilingual theme options", () => {
  assert.deepEqual(themeOptions.map((option) => option.value), [
    "light", "dark", "ocean", "forest", "sunset", "lavender", "slate"
  ]);
  for (const option of themeOptions) {
    assert.ok(messages.en[option.label]);
    assert.ok(messages.ar[option.label]);
  }
});

test("all interface strings are available in English and Arabic", () => {
  assert.deepEqual(Object.keys(messages.en).sort(), Object.keys(messages.ar).sort());
});

test("skills may include one securely stored icon image", () => {
  const content = structuredClone(defaultContent);
  content.skills.push({
    id: "javascript",
    name: { en: "JavaScript", ar: "جافاسكريبت" },
    icon: "/uploads/123e4567-e89b-12d3-a456-426614174000.webp"
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  content.skills[0].icon = "https://example.com/icon.png";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Skill 1")));
});

test("blog posts require bilingual text and a valid publication date", () => {
  const content = structuredClone(defaultContent);
  content.blogPosts.push({
    id: "first-post",
    title: { en: "A first post", ar: "مقال أول" },
    publishedAt: "2026-11-26",
    summary: { en: "A short intro", ar: "مقدمة قصيرة" },
    body: { en: "Full article", ar: "المقال كاملًا" }
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  content.blogPosts[0].publishedAt = "2026-02-31";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
});

test("blog posts accept stored photo, audio, and video attachments with safe limits", () => {
  const content = structuredClone(defaultContent);
  content.blogPosts.push({
    id: "media-post",
    title: { en: "A media post", ar: "مقال وسائط" },
    publishedAt: "2026-11-26",
    summary: { en: "A short intro", ar: "مقدمة قصيرة" },
    body: { en: "Full article", ar: "المقال كاملًا" },
    media: [
      { type: "image", src: "/uploads/123e4567-e89b-12d3-a456-426614174000.webp" },
      { type: "audio", src: "/uploads/123e4567-e89b-12d3-a456-426614174001.mp3" },
      { type: "video", src: "/uploads/123e4567-e89b-12d3-a456-426614174002.mp4" }
    ]
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  content.blogPosts[0].media[1].src = "https://example.com/audio.mp3";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));

  content.blogPosts[0].media = [
    { type: "audio", src: "/uploads/123e4567-e89b-12d3-a456-426614174000.webp" }
  ];
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));

  content.blogPosts[0].media = Array.from({ length: MAX_BLOG_MEDIA + 1 }, (_, index) => ({
    type: "image",
    src: `/uploads/123e4567-e89b-12d3-a456-${String(index).padStart(12, "0")}.png`
  }));
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
});

test("blog article blocks can order bilingual paragraphs and linked media", () => {
  const content = structuredClone(defaultContent);
  const image = { type: "image", src: "/uploads/123e4567-e89b-12d3-a456-426614174000.webp" };
  content.blogPosts.push({
    id: "ordered-post",
    title: { en: "Ordered post", ar: "مقال مرتب" },
    publishedAt: "2026-11-26",
    summary: { en: "Summary", ar: "ملخص" },
    body: { en: "First paragraph", ar: "الفقرة الأولى" },
    media: [image],
    blocks: [
      { id: "paragraph-1", type: "text", text: { en: "First paragraph", ar: "الفقرة الأولى" } },
      { id: "photo-1", type: "media", src: image.src, width: 47, align: "start" },
      { id: "paragraph-2", type: "text", text: { en: "Second paragraph", ar: "الفقرة الثانية" } }
    ]
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  content.blogPosts[0].blocks[1].src = "/uploads/123e4567-e89b-12d3-a456-426614174001.webp";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));

  content.blogPosts[0].blocks[1].src = image.src;
  content.blogPosts[0].blocks[1].width = 101;
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));

  content.blogPosts[0].blocks[1].width = 47;
  content.blogPosts[0].blocks[1].align = "middle";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));

  content.blogPosts[0].blocks[1].align = "start";
  content.blogPosts[0].blocks[1].id = "paragraph-1";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));

  content.blogPosts[0].blocks[1].id = "photo-1";
  content.blogPosts[0].media = [null];
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));

  content.blogPosts[0].media = [image];
  content.blogPosts[0].blocks = Array.from({ length: MAX_BLOG_CONTENT_BLOCKS + 1 }, (_, index) => ({
    id: `text-${index}`,
    type: "text",
    text: { en: "Paragraph", ar: "فقرة" }
  }));
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
});

test("blog rich-content blocks validate layouts, safe links, references, and related posts", () => {
  const content = structuredClone(defaultContent);
  const image = { type: "image", src: "/uploads/123e4567-e89b-12d3-a456-426614174000.webp" };
  const post = {
    id: "rich-article",
    title: { en: "Rich article", ar: "مقال غني" },
    publishedAt: "2026-11-26",
    summary: { en: "Summary", ar: "ملخص" },
    body: { en: "Paragraph", ar: "فقرة" },
    media: [image],
    blocks: [
      { id: "intro", type: "text", text: { en: "Paragraph", ar: "فقرة" }, expandable: true },
      { id: "section", type: "heading", text: { en: "Section", ar: "قسم" } },
      { id: "subtitle", type: "subtitle", text: { en: "Subtitle", ar: "عنوان فرعي" } },
      { id: "link", type: "link", label: { en: "Source", ar: "المصدر" }, url: "https://example.com" },
      {
        id: "references",
        type: "references",
        items: [{ id: "reference-1", label: { en: "Reference", ar: "مرجع" }, url: "#section" }]
      },
      { id: "code", type: "code", language: "javascript", code: "console.log('hello');" },
      {
        id: "photo",
        type: "media",
        src: image.src,
        width: 60,
        height: 900,
        columnWidth: 42,
        fit: "cover",
        layout: "side-start"
      }
    ],
    relatedPosts: ["related-article"]
  };
  content.blogPosts.push(post, {
    id: "related-article",
    title: { en: "Related article", ar: "مقال مرتبط" },
    publishedAt: "2026-11-25",
    summary: { en: "Summary", ar: "ملخص" },
    body: { en: "Paragraph", ar: "فقرة" }
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  post.blocks[3].url = "javascript:alert(1)";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
  post.blocks[3].url = "/\\\\evil.example";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
  post.blocks[3].url = "https://example.com";
  post.blocks[4].items[0].url = "data:text/html,unsafe";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
  post.blocks[4].items[0].url = "#section";
  post.blocks[6].height = 1201;
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
  post.blocks[6].height = 900;
  post.blocks[6].columnWidth = 81;
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
  post.blocks[6].columnWidth = 42;
  post.blocks[6].layout = "float";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
  post.blocks[6].layout = "side-start";
  post.relatedPosts = ["missing-article"];
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Blog post 1")));
});

test("experience entries may include one securely stored image", () => {
  const content = structuredClone(defaultContent);
  content.experience.push({
    id: "developer-role",
    role: { en: "Developer", ar: "مطور" },
    company: { en: "Studio", ar: "استوديو" },
    period: { en: "2024–2026", ar: "٢٠٢٤–٢٠٢٦" },
    description: { en: "Built software.", ar: "بنيت البرمجيات." },
    image: "/uploads/123e4567-e89b-12d3-a456-426614174000.webp"
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  content.experience[0].image = "https://example.com/image.png";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Experience entry 1")));
});

test("project image paths accept stored UUID filenames only", () => {
  const content = structuredClone(defaultContent);
  content.projects.push({
    id: "portfolio",
    title: { en: "Portfolio", ar: "الأعمال" },
    description: { en: "A project", ar: "مشروع" },
    stack: ["React"],
    url: "",
    image: "/uploads/123e4567-e89b-12d3-a456-426614174000.webp"
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  content.projects[0].image = "/uploads/../../private.png";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Project 1")));
});

test("projects accept multiple stored images and reject invalid or duplicate gallery entries", () => {
  const content = structuredClone(defaultContent);
  content.projects.push({
    id: "portfolio",
    title: { en: "Portfolio", ar: "الأعمال" },
    description: { en: "A project", ar: "مشروع" },
    stack: [],
    url: "https://example.com/project",
    images: [
      "/uploads/123e4567-e89b-12d3-a456-426614174000.webp",
      "/uploads/123e4567-e89b-12d3-a456-426614174001.png"
    ]
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  content.projects[0].images[1] = "https://example.com/photo.png";
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Project 1")));

  content.projects[0].images = [
    "/uploads/123e4567-e89b-12d3-a456-426614174000.webp",
    "/uploads/123e4567-e89b-12d3-a456-426614174000.webp"
  ];
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Project 1")));

  content.projects[0].images = Array.from({ length: MAX_PROJECT_IMAGES + 1 }, (_, index) =>
    `/uploads/123e4567-e89b-12d3-a456-${String(index).padStart(12, "0")}.png`);
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Project 1")));
});

test("portfolio enhancements validate case studies, captions, services, testimonials, and FAQs", () => {
  const content = structuredClone(defaultContent);
  const image = "/uploads/123e4567-e89b-12d3-a456-426614174000.webp";
  content.workFocus = { en: "Product engineering", ar: "هندسة المنتجات" };
  content.now = { en: "Learning accessible design", ar: "أتعلم التصميم الميسّر" };
  content.profileImage = image;
  content.resume = "/uploads/123e4567-e89b-12d3-a456-426614174001.pdf";
  content.projects.push({
    id: "case-study",
    title: { en: "Case study", ar: "دراسة حالة" },
    description: { en: "Project summary", ar: "ملخص المشروع" },
    stack: ["React"],
    categories: ["Web app"],
    url: "https://example.com/demo",
    repoUrl: "https://example.com/source",
    walkthroughUrl: "https://example.com/walkthrough",
    challenge: { en: "Challenge", ar: "التحدي" },
    roleInProject: { en: "Developer", ar: "مطور" },
    solution: { en: "Solution", ar: "الحل" },
    result: { en: "Result", ar: "النتيجة" },
    featured: true,
    images: [image],
    imageCaptions: [{ src: image, text: { en: "Dashboard", ar: "لوحة التحكم" } }]
  });
  content.services.push({
    id: "web-development",
    title: { en: "Web development", ar: "تطوير الويب" },
    description: { en: "Build useful websites.", ar: "إنشاء مواقع مفيدة." },
    idealFor: { en: "Small teams", ar: "الفرق الصغيرة" }
  });
  content.testimonials.push({
    id: "recommendation",
    name: { en: "Collaborator", ar: "زميل" },
    role: { en: "Designer", ar: "مصمم" },
    organization: { en: "Studio", ar: "استوديو" },
    quote: { en: "A thoughtful collaborator.", ar: "زميل متعاون ومدروس." },
    url: "https://example.com/recommendation"
  });
  content.faqs.push({
    id: "availability",
    question: { en: "Are you available?", ar: "هل أنت متاح؟" },
    answer: { en: "Contact me to discuss.", ar: "تواصل معي للمناقشة." }
  });
  assert.deepEqual(validatePortfolioContent(content), []);

  content.projects[0].images = 42;
  assert.doesNotThrow(() => validatePortfolioContent(content));
  assert.ok(validatePortfolioContent(content).some((error) => error.includes("Project 1")));
});

test("résumé uploads require a PDF signature and stored UUID path", () => {
  const validPdf = Buffer.from("%PDF-1.7\n");
  assert.equal(detectResumeType(validPdf)?.mimeType, "application/pdf");
  assert.equal(detectResumeType(Buffer.from("<html>not a PDF</html>")), null);
  assert.equal(detectResumeType(Buffer.from("%PDF")), null);
  assert.equal(isStoredResumePath("/uploads/123e4567-e89b-12d3-a456-426614174000.pdf"), true);
  assert.equal(isStoredResumePath("/uploads/../../resume.pdf"), false);
  assert.equal(MAX_RESUME_FILE_SIZE, 10 * 1024 * 1024);
});

test("project image uploads are identified from file signatures", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0x00]);
  const webp = Buffer.from("RIFF0000WEBP");

  assert.equal(detectProjectImageType(png)?.mimeType, "image/png");
  assert.equal(detectProjectImageType(jpeg)?.mimeType, "image/jpeg");
  assert.equal(detectProjectImageType(webp)?.mimeType, "image/webp");
  assert.equal(detectProjectImageType(Buffer.from("<svg></svg>")), null);
});

test("blog media uploads are identified from file signatures", () => {
  const wav = Buffer.alloc(12);
  wav.write("RIFF", 0, "ascii");
  wav.write("WAVE", 8, "ascii");
  const mp4 = Buffer.alloc(12);
  mp4.write("ftyp", 4, "ascii");

  assert.equal(detectBlogMediaType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.type, "image");
  assert.equal(detectBlogMediaType(Buffer.from("ID3"))?.mimeType, "audio/mpeg");
  assert.equal(detectBlogMediaType(wav)?.mimeType, "audio/wav");
  assert.equal(detectBlogMediaType(Buffer.from("OggS"))?.mimeType, "audio/ogg");
  assert.equal(detectBlogMediaType(mp4)?.mimeType, "video/mp4");
  assert.equal(detectBlogMediaType(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))?.mimeType, "video/webm");
  assert.equal(detectBlogMediaType(Buffer.from("<script></script>")), null);
  assert.equal(isStoredBlogMediaPath("/uploads/123e4567-e89b-12d3-a456-426614174000.mp4"), true);
  assert.equal(isStoredBlogMediaPath("/uploads/../../bad.mp4"), false);
});
