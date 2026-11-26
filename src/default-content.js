export const MAX_PROJECT_IMAGES = 10;
export const MAX_BLOG_MEDIA = 10;
export const MAX_BLOG_CONTENT_BLOCKS = 100;
export const MAX_BLOG_MEDIA_FILE_SIZE = 50 * 1024 * 1024;
export const MAX_RESUME_FILE_SIZE = 10 * 1024 * 1024;

export const defaultContent = {
  name: {
    en: "Anwar Shama",
    ar: "أنور شامة"
  },
  email: "",
  role: {
    en: "Software Developer",
    ar: "مطور برمجيات"
  },
  location: {
    en: "",
    ar: ""
  },
  workFocus: {
    en: "",
    ar: ""
  },
  now: {
    en: "",
    ar: ""
  },
  intro: {
    en: "I build thoughtful digital experiences, turning complex problems into clear, useful software.",
    ar: "أصمم تجارب رقمية مدروسة وأحوّل المشكلات المعقدة إلى برمجيات واضحة ومفيدة."
  },
  about: {
    en: "I enjoy working across the stack, learning how people use technology, and making software simpler to use and maintain.",
    ar: "أستمتع بالعمل على مختلف طبقات البرمجيات، وفهم احتياجات المستخدمين، وبناء منتجات أسهل استخدامًا وصيانة."
  },
  profileImage: "",
  resume: "",
  skills: [],
  projects: [],
  experience: [],
  blogPosts: [],
  services: [],
  testimonials: [],
  faqs: []
};

const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value, max = 5000) => typeof value === "string" && value.length <= max;
const isBilingual = (value, max = 5000) => (
  isRecord(value) &&
  isText(value.en, max) &&
  isText(value.ar, max)
);
const isId = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,60}$/.test(value);
const isWebUrlOrEmpty = (value) => {
  if (value === "") return true;
  if (!isText(value, 2048)) return false;
  try {
    return ["https:", "http:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};
const isOptionalWebUrl = (value) => value === undefined || isWebUrlOrEmpty(value);
const isStoredImagePath = (value) => (
  typeof value === "string" &&
  /^\/uploads\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.(?:png|jpe?g|webp)$/i.test(value)
);
const isStoredImage = (value) => (
  value === "" ||
  isStoredImagePath(value)
);
export const isStoredResumePath = (value) => (
  typeof value === "string" &&
  /^\/uploads\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\.pdf$/i.test(value)
);
const isOptionalBilingual = (value, max = 5000) => value === undefined || isBilingual(value, max);
const storedBlogMediaExtensions = {
  image: "png|jpe?g|webp",
  audio: "mp3|wav|ogg",
  video: "mp4|webm"
};
const blogCodeLanguages = new Set(["text", "javascript", "typescript", "python", "bash", "json", "html", "css", "sql"]);
const isSafeBlogLink = (value) => {
  if (!isText(value, 2048) || value.length === 0) return false;
  if (value.startsWith("#")) return /^#[a-zA-Z0-9_-]+$/.test(value);
  try {
    if (value.startsWith("/")) {
      return new URL(value, "https://portfolio.invalid").origin === "https://portfolio.invalid";
    }
    return ["http:", "https:", "mailto:", "tel:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
};
const isStoredBlogMedia = (value, type) => (
  typeof value === "string" &&
  storedBlogMediaExtensions[type] !== undefined &&
  new RegExp(`^/uploads/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\\.(?:${storedBlogMediaExtensions[type]})$`, "i").test(value)
);
const isValidBlogContentBlock = (block, mediaAssets) => {
  if (!isRecord(block) || !isId(block.id)) return false;
  if (block.type === "text") {
    return isBilingual(block.text, 12000) &&
      (block.expandable === undefined || typeof block.expandable === "boolean");
  }
  if (block.type === "heading" || block.type === "subtitle") {
    return isBilingual(block.text, 240);
  }
  if (block.type === "link") {
    return isBilingual(block.label, 240) && isSafeBlogLink(block.url);
  }
  if (block.type === "references") {
    return Array.isArray(block.items) &&
      block.items.length <= 30 &&
      block.items.every((item) => isRecord(item) && isId(item.id) &&
        isBilingual(item.label, 240) && isSafeBlogLink(item.url)) &&
      new Set(block.items.map((item) => item.id)).size === block.items.length;
  }
  if (block.type === "code") {
    return typeof block.code === "string" &&
      block.code.length <= 20000 &&
      blogCodeLanguages.has(block.language);
  }
  if (block.type !== "media") return false;

  const media = mediaAssets.find((item) => item.src === block.src);
  if (!media) return false;
  if (block.layout !== undefined && !["full", "side-start", "side-end"].includes(block.layout)) return false;
  if (media.type !== "image") {
    return block.width === undefined && block.height === undefined && block.columnWidth === undefined &&
      block.align === undefined && block.fit === undefined;
  }
  return (block.width === undefined ||
      Number.isInteger(block.width) && block.width >= 10 && block.width <= 100) &&
    (block.height === undefined ||
      Number.isInteger(block.height) && block.height >= 80 && block.height <= 1200) &&
    (block.columnWidth === undefined ||
      ["side-start", "side-end"].includes(block.layout) &&
        Number.isInteger(block.columnWidth) && block.columnWidth >= 20 && block.columnWidth <= 80) &&
    (block.align === undefined || ["start", "center", "end"].includes(block.align)) &&
    (block.fit === undefined || ["contain", "cover"].includes(block.fit));
};

export function validatePortfolioContent(value) {
  const errors = [];
  if (!isRecord(value)) return ["Content must be a JSON object."];
  if (!isBilingual(value.name, 80)) errors.push("Name must have English and Arabic text (80 characters max).");
  if (!isText(value.email, 254) || (value.email !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))) {
    errors.push("Email must be empty or a valid email address.");
  }
  for (const field of ["role", "location", "workFocus", "now", "intro", "about"]) {
    if (!isBilingual(value[field])) errors.push(`${field} must have English and Arabic text.`);
  }
  if (value.profileImage !== undefined && !isStoredImage(value.profileImage)) {
    errors.push("Profile image must be empty or a stored image path.");
  }
  if (value.resume !== undefined && value.resume !== "" && !isStoredResumePath(value.resume)) {
    errors.push("Resume must be empty or a stored PDF path.");
  }

  if (!Array.isArray(value.skills) || value.skills.length > 50) {
    errors.push("Skills must be an array with no more than 50 entries.");
  } else {
    value.skills.forEach((skill, index) => {
      if (!isRecord(skill) || !isId(skill.id) || !isBilingual(skill.name, 120) ||
          (skill.icon !== undefined && !isStoredImage(skill.icon))) {
        errors.push(`Skill ${index + 1} has invalid fields.`);
      }
    });
  }

  if (!Array.isArray(value.projects) || value.projects.length > 50) {
    errors.push("Projects must be an array with no more than 50 entries.");
  } else {
    value.projects.forEach((project, index) => {
      if (!isRecord(project) || !isId(project.id) || !isBilingual(project.title, 160) ||
          !isBilingual(project.description) || !Array.isArray(project.stack) ||
          project.stack.length > 20 || !project.stack.every((item) => isText(item, 80)) ||
          (project.categories !== undefined && (
            !Array.isArray(project.categories) ||
            project.categories.length > 10 ||
            !project.categories.every((category) => isText(category, 60))
          )) ||
          !isWebUrlOrEmpty(project.url) ||
          !isOptionalWebUrl(project.repoUrl) ||
          !isOptionalWebUrl(project.walkthroughUrl) ||
          (project.featured !== undefined && typeof project.featured !== "boolean") ||
          !isOptionalBilingual(project.challenge, 4000) ||
          !isOptionalBilingual(project.roleInProject, 2000) ||
          !isOptionalBilingual(project.solution, 4000) ||
          !isOptionalBilingual(project.result, 2000) ||
          (project.imageCaptions !== undefined && (
            !Array.isArray(project.imageCaptions) ||
            project.imageCaptions.length > MAX_PROJECT_IMAGES ||
            !project.imageCaptions.every((caption) => isRecord(caption) &&
              isStoredImagePath(caption.src) &&
              Array.isArray(project.images) && project.images.includes(caption.src) &&
              isBilingual(caption.text, 500)) ||
            new Set(project.imageCaptions.map((caption) => caption.src)).size !== project.imageCaptions.length
          )) ||
          (project.image !== undefined && !isStoredImage(project.image)) ||
          (project.images !== undefined && (
            !Array.isArray(project.images) ||
            project.images.length > MAX_PROJECT_IMAGES ||
            !project.images.every(isStoredImagePath) ||
            new Set(project.images).size !== project.images.length
          ))) {
        errors.push(`Project ${index + 1} has invalid fields.`);
      }
    });
  }


  if (!Array.isArray(value.experience) || value.experience.length > 50) {
    errors.push("Experience must be an array with no more than 50 entries.");
  } else {
    value.experience.forEach((item, index) => {
      if (!isRecord(item) || !isId(item.id) || !isBilingual(item.role, 160) ||
          !isBilingual(item.company, 160) || !isBilingual(item.period, 120) ||
          !isBilingual(item.description) ||
          (item.image !== undefined && !isStoredImage(item.image))) {
        errors.push(`Experience entry ${index + 1} has invalid fields.`);
      }
    });
  }

  if (value.blogPosts !== undefined) {
    if (!Array.isArray(value.blogPosts) || value.blogPosts.length > 50) {
      errors.push("Blog posts must be an array with no more than 50 entries.");
    } else {
      const blogPostIds = new Set(value.blogPosts
        .filter((post) => isRecord(post) && isId(post.id))
        .map((post) => post.id));
      value.blogPosts.forEach((post, index) => {
        const validDate = typeof post?.publishedAt === "string" &&
          /^\d{4}-\d{2}-\d{2}$/.test(post.publishedAt) &&
          !Number.isNaN(Date.parse(`${post.publishedAt}T00:00:00.000Z`)) &&
          new Date(`${post.publishedAt}T00:00:00.000Z`).toISOString().slice(0, 10) === post.publishedAt;
        if (!isRecord(post)) {
          errors.push(`Blog post ${index + 1} has invalid fields.`);
          return;
        }

        const validMedia = post.media === undefined || (
          Array.isArray(post.media) &&
          post.media.length <= MAX_BLOG_MEDIA &&
          post.media.every((media) => isRecord(media) &&
            ["image", "audio", "video"].includes(media.type) &&
            isStoredBlogMedia(media.src, media.type)) &&
          new Set(post.media.map((media) => media.src)).size === post.media.length
        );
        const mediaAssets = Array.isArray(post.media) ? post.media.filter(isRecord) : [];
        const validBlocks = post.blocks === undefined || (
          Array.isArray(post.blocks) &&
          post.blocks.length <= MAX_BLOG_CONTENT_BLOCKS &&
          post.blocks.every((block) => isValidBlogContentBlock(block, mediaAssets)) &&
          new Set(post.blocks.map((block) => block.id)).size === post.blocks.length
        );
        const validRelatedPosts = post.relatedPosts === undefined || (
          Array.isArray(post.relatedPosts) &&
          post.relatedPosts.length <= 10 &&
          post.relatedPosts.every((relatedId) =>
            isId(relatedId) && relatedId !== post.id && blogPostIds.has(relatedId)
          ) &&
          new Set(post.relatedPosts).size === post.relatedPosts.length
        );
        const validCategories = post.categories === undefined || (
          Array.isArray(post.categories) &&
          post.categories.length <= 10 &&
          post.categories.every((category) => isText(category, 60))
        );
        if (!isId(post.id) || !isBilingual(post.title, 160) ||
            !validDate || !isBilingual(post.summary, 1200) || !isBilingual(post.body, 12000) ||
            !validMedia || !validBlocks || !validRelatedPosts || !validCategories ||
            (post.featured !== undefined && typeof post.featured !== "boolean")) {
          errors.push(`Blog post ${index + 1} has invalid fields.`);
        }
      });
    }
  }

  if (!Array.isArray(value.services) || value.services.length > 20) {
    errors.push("Services must be an array with no more than 20 entries.");
  } else {
    value.services.forEach((service, index) => {
      if (!isRecord(service) || !isId(service.id) || !isBilingual(service.title, 160) ||
          !isBilingual(service.description, 2000) ||
          !isOptionalBilingual(service.idealFor, 500)) {
        errors.push(`Service ${index + 1} has invalid fields.`);
      }
    });
  }

  if (!Array.isArray(value.testimonials) || value.testimonials.length > 30) {
    errors.push("Testimonials must be an array with no more than 30 entries.");
  } else {
    value.testimonials.forEach((testimonial, index) => {
      if (!isRecord(testimonial) || !isId(testimonial.id) ||
          !isBilingual(testimonial.name, 160) || !isBilingual(testimonial.role, 160) ||
          !isBilingual(testimonial.quote, 2000) ||
          !isOptionalBilingual(testimonial.organization, 160) ||
          !isOptionalWebUrl(testimonial.url)) {
        errors.push(`Testimonial ${index + 1} has invalid fields.`);
      }
    });
  }

  if (!Array.isArray(value.faqs) || value.faqs.length > 40) {
    errors.push("FAQs must be an array with no more than 40 entries.");
  } else {
    value.faqs.forEach((faq, index) => {
      if (!isRecord(faq) || !isId(faq.id) ||
          !isBilingual(faq.question, 240) || !isBilingual(faq.answer, 4000)) {
        errors.push(`FAQ ${index + 1} has invalid fields.`);
      }
    });
  }

  try {
    if (JSON.stringify(value).length > 100_000) errors.push("Content exceeds the 100 KB limit.");
  } catch {
    errors.push("Content could not be serialized as JSON.");
  }
  return errors;
}
