import "dotenv/config";
import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { defaultContent, validatePortfolioContent } from "../src/default-content.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const databasePath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(projectRoot, "server", "data", "portfolio.sqlite");
const sourceUploads = path.join(path.dirname(databasePath), "uploads");
const publicDirectory = path.join(projectRoot, "public");
const publicUploads = path.join(publicDirectory, "uploads");

function readSavedContent() {
  if (!existsSync(databasePath)) return defaultContent;

  const database = new DatabaseSync(databasePath);
  try {
    const row = database.prepare("SELECT body FROM portfolio_content WHERE id = 1").get();
    if (!row) return defaultContent;

    const storedContent = JSON.parse(row.body);
    if (!storedContent || typeof storedContent !== "object" || Array.isArray(storedContent)) {
      throw new Error("Saved portfolio content must be a JSON object.");
    }
    const { images: _legacyImages, ...savedContent } = storedContent;
    return {
      ...defaultContent,
      ...savedContent,
      projects: (savedContent.projects || defaultContent.projects).map((project) => {
        const { image, ...savedProject } = project;
        return {
          ...savedProject,
          images: Array.isArray(project.images) && project.images.length
            ? project.images
            : image ? [image] : []
        };
      })
    };
  } finally {
    database.close();
  }
}

function referencedUploads(content) {
  return [
    content.profileImage,
    content.resume,
    ...(content.skills || []).map((skill) => skill.icon),
    ...(content.experience || []).map((item) => item.image),
    ...(content.projects || []).flatMap((project) => project.images || []),
    ...(content.blogPosts || []).flatMap((post) =>
      (post.media || []).map((media) => media.src)
    )
  ].filter(Boolean);
}

function resolveUpload(uploadPath) {
  if (typeof uploadPath !== "string" || !/^\/uploads\/[^/]+$/.test(uploadPath)) {
    throw new Error(`Unsupported uploaded file path: ${uploadPath}`);
  }

  const filename = path.basename(uploadPath);
  return {
    source: path.join(sourceUploads, filename),
    destination: path.join(publicUploads, filename)
  };
}

const content = readSavedContent();
if (content.name.ar === "أنور شما") content.name = { ...content.name, ar: defaultContent.name.ar };
if (typeof content.intro.ar === "string") {
  content.intro = { ...content.intro, ar: content.intro.ar.replaceAll("أنور شما", "أنور شامة") };
}
const uploadFiles = [...new Set(referencedUploads(content))].map(resolveUpload);
const missingUploadPaths = new Set(uploadFiles
  .filter(({ source }) => !existsSync(source))
  .map(({ source }) => `/uploads/${path.basename(source)}`));

if (missingUploadPaths.size > 0) {
  const isAvailable = (uploadPath) => !missingUploadPaths.has(uploadPath);
  if (!isAvailable(content.profileImage)) content.profileImage = "";
  if (!isAvailable(content.resume)) content.resume = "";
  content.skills = content.skills.map((skill) => (
    isAvailable(skill.icon) ? skill : { ...skill, icon: "" }
  ));
  content.experience = content.experience.map((item) => (
    isAvailable(item.image) ? item : { ...item, image: "" }
  ));
  content.projects = content.projects.map((project) => {
    const images = project.images.filter(isAvailable);
    return {
      ...project,
      images,
      ...(Array.isArray(project.imageCaptions)
        ? { imageCaptions: project.imageCaptions.filter((caption) => isAvailable(caption.src)) }
        : {})
    };
  });
  content.blogPosts = content.blogPosts.map((post) => {
    const media = (post.media || []).filter((item) => isAvailable(item.src));
    const retainedMedia = new Set(media.map((item) => item.src));
    return {
      ...post,
      media,
      ...(Array.isArray(post.blocks)
        ? { blocks: post.blocks.filter((block) => block.type !== "media" || retainedMedia.has(block.src)) }
        : {})
    };
  });
  console.warn(`Omitted references to ${missingUploadPaths.size} missing uploads: ${
    [...missingUploadPaths].map((uploadPath) => path.basename(uploadPath)).join(", ")
  }`);
}

const errors = validatePortfolioContent(content);
if (errors.length > 0) {
  throw new Error(`Saved portfolio content is invalid:\n- ${errors.join("\n- ")}`);
}

const availableUploadFiles = uploadFiles.filter(({ source }) => existsSync(source));
mkdirSync(publicDirectory, { recursive: true });
mkdirSync(publicUploads, { recursive: true });
for (const { source, destination } of availableUploadFiles) copyFileSync(source, destination);
writeFileSync(
  path.join(publicDirectory, "content.json"),
  `${JSON.stringify(content, null, 2)}\n`,
  "utf8"
);
console.log(`Exported static content and ${availableUploadFiles.length} referenced uploads.`);
