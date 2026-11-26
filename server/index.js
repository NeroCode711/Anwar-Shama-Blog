import "dotenv/config";
import bcrypt from "bcryptjs";
import express from "express";
import { rateLimit } from "express-rate-limit";
import session from "express-session";
import helmet from "helmet";
import multer from "multer";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import {
  defaultContent,
  MAX_BLOG_MEDIA_FILE_SIZE,
  MAX_PROJECT_IMAGES,
  MAX_RESUME_FILE_SIZE,
  isStoredResumePath,
  validatePortfolioContent
} from "../src/default-content.js";
import { detectBlogMediaType, isStoredBlogMediaPath } from "./blog-media-validation.js";
import { detectProjectImageType, isStoredProjectImage } from "./image-validation.js";
import { detectResumeType } from "./resume-validation.js";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
const workspace = path.resolve(dirname, "..");
const port = Number(process.env.PORT || 3001);
const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD;
const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret || sessionSecret.length < 32 || sessionSecret.startsWith("replace-this")) {
  throw new Error("SESSION_SECRET must be set to a random value of at least 32 characters.");
}
if (!adminEmail || adminEmail === "admin@example.com" || !adminPassword ||
    adminPassword.length < 14 || adminPassword.startsWith("replace-this")) {
  throw new Error("Set ADMIN_EMAIL and a unique ADMIN_PASSWORD of at least 14 characters.");
}

const adminPasswordHash = bcrypt.hashSync(adminPassword, 12);
const databasePath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(dirname, "data", "portfolio.sqlite");
const databaseDirectory = path.dirname(databasePath);
const uploadDirectory = path.join(databaseDirectory, "uploads");
mkdirSync(databaseDirectory, { recursive: true });
mkdirSync(uploadDirectory, { recursive: true });

const database = new DatabaseSync(databasePath);
database.exec(`
  CREATE TABLE IF NOT EXISTS portfolio_content (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    body TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    data TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions (expires_at);
`);

class SQLiteSessionStore extends session.Store {
  get(sessionId, callback) {
    try {
      const row = database.prepare("SELECT data, expires_at FROM sessions WHERE sid = ?").get(sessionId);
      if (!row) return callback(null, null);
      if (row.expires_at <= Date.now()) {
        database.prepare("DELETE FROM sessions WHERE sid = ?").run(sessionId);
        return callback(null, null);
      }
      callback(null, JSON.parse(row.data));
    } catch (error) {
      callback(error);
    }
  }

  set(sessionId, value, callback = () => {}) {
    try {
      const expiresAt = value.cookie?.expires
        ? new Date(value.cookie.expires).getTime()
        : Date.now() + 8 * 60 * 60 * 1000;
      database.prepare(`
        INSERT INTO sessions (sid, data, expires_at) VALUES (?, ?, ?)
        ON CONFLICT(sid) DO UPDATE SET data = excluded.data, expires_at = excluded.expires_at
      `).run(sessionId, JSON.stringify(value), expiresAt);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  destroy(sessionId, callback = () => {}) {
    try {
      database.prepare("DELETE FROM sessions WHERE sid = ?").run(sessionId);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  touch(sessionId, value, callback = () => {}) {
    try {
      const expiresAt = value.cookie?.expires
        ? new Date(value.cookie.expires).getTime()
        : Date.now() + 8 * 60 * 60 * 1000;
      database.prepare("UPDATE sessions SET expires_at = ? WHERE sid = ?").run(expiresAt, sessionId);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }
}

const sessionStore = new SQLiteSessionStore();
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: MAX_PROJECT_IMAGES }
});
const blogMediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BLOG_MEDIA_FILE_SIZE, files: 1 }
});
const resumeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_RESUME_FILE_SIZE, files: 1 }
});
const cleanupTimer = setInterval(() => {
  try {
    database.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(Date.now());
  } catch (error) {
    console.error("Could not clean up expired sessions:", error);
  }
}, 60 * 60 * 1000);
cleanupTimer.unref();

const app = express();
const production = process.env.NODE_ENV === "production";
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      formAction: ["'self'"],
      baseUri: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false
}));
app.use(express.json({ limit: "128kb" }));
app.use(session({
  name: "anwar.portfolio.sid",
  secret: sessionSecret,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: production,
    sameSite: "strict",
    maxAge: 8 * 60 * 60 * 1000
  }
}));

app.use("/api", (request, response, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
  const origin = request.get("origin");
  if (!origin) return response.status(403).json({ error: "A same-origin request is required." });
  try {
    if (new URL(origin).hostname !== request.hostname) {
      return response.status(403).json({ error: "A same-origin request is required." });
    }
  } catch {
    return response.status(403).json({ error: "A valid request origin is required." });
  }
  next();
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Try again later." }
});

function requireAdmin(request, response, next) {
  if (request.session.isAdmin === true) return next();
  response.status(401).json({ error: "Sign in to manage portfolio content." });
}

app.get("/api/content", (_request, response) => {
  const row = database.prepare("SELECT body FROM portfolio_content WHERE id = 1").get();
  if (!row) return response.json(defaultContent);
  try {
    const { images: _sectionImages, ...savedContent } = JSON.parse(row.body);
    return response.json({
      ...defaultContent,
      ...savedContent,
      projects: (savedContent.projects || defaultContent.projects).map((project) => {
        const { image, ...savedProject } = project;
        return {
          ...savedProject,
          images: project.images?.length ? project.images : image ? [image] : []
        };
      })
    });
  } catch (error) {
    console.error("Could not read saved portfolio content:", error);
    return response.status(500).json({ error: "Saved portfolio content is invalid." });
  }
});

app.get("/api/auth/session", (request, response) => {
  response.json({
    authenticated: request.session.isAdmin === true,
    email: request.session.isAdmin === true ? adminEmail : null
  });
});

app.post("/api/auth/login", loginLimiter, (request, response, next) => {
  const email = typeof request.body?.email === "string" ? request.body.email.trim().toLowerCase() : "";
  const password = typeof request.body?.password === "string" ? request.body.password : "";
  const emailMatches = email === adminEmail;
  const passwordMatches = bcrypt.compareSync(password, adminPasswordHash);
  if (!emailMatches || !passwordMatches) {
    return response.status(401).json({ error: "Email or password is incorrect." });
  }

  request.session.regenerate((error) => {
    if (error) return next(error);
    request.session.isAdmin = true;
    request.session.save((saveError) => {
      if (saveError) return next(saveError);
      response.json({ authenticated: true, email: adminEmail });
    });
  });
});

app.post("/api/auth/logout", requireAdmin, (request, response, next) => {
  request.session.destroy((error) => {
    if (error) return next(error);
    response.clearCookie("anwar.portfolio.sid", {
      httpOnly: true,
      secure: production,
      sameSite: "strict"
    });
    response.json({ authenticated: false });
  });
});

app.post(
  "/api/admin/uploads/project-image",
  requireAdmin,
  imageUpload.fields([
    { name: "images", maxCount: MAX_PROJECT_IMAGES },
    { name: "image", maxCount: 1 }
  ]),
  (request, response) => {
    const files = [...(request.files?.images || []), ...(request.files?.image || [])];
    if (files.length === 0) return response.status(400).json({ error: "Select at least one image to upload." });

    const imageTypes = files.map((file) => detectProjectImageType(file.buffer));
    if (imageTypes.some((imageType) => !imageType)) {
      return response.status(415).json({ error: "Only JPEG, PNG, and WebP image files are supported." });
    }

    const uploadedImages = [];
    try {
      files.forEach((file, index) => {
        const filename = `${randomUUID()}.${imageTypes[index].extension}`;
        writeFileSync(path.join(uploadDirectory, filename), file.buffer, { flag: "wx" });
        uploadedImages.push(`/uploads/${filename}`);
      });
      response.status(201).json({ images: uploadedImages, image: uploadedImages[0] });
    } catch (error) {
      for (const image of uploadedImages) {
        try {
          unlinkSync(path.join(uploadDirectory, path.basename(image)));
        } catch (cleanupError) {
          if (cleanupError.code !== "ENOENT") console.error("Could not remove partial project image upload:", cleanupError);
        }
      }
      console.error("Could not save uploaded project image:", error);
      response.status(500).json({ error: "The project image could not be saved." });
    }
  }
);

app.post(
  "/api/admin/uploads/blog-media",
  requireAdmin,
  blogMediaUpload.single("file"),
  (request, response) => {
    if (!request.file) return response.status(400).json({ error: "Select a photo, audio recording, or video to upload." });

    const detectedMedia = detectBlogMediaType(request.file.buffer);
    if (!detectedMedia) {
      return response.status(415).json({ error: "Use JPEG, PNG, WebP, MP3, WAV, OGG, MP4, or WebM files." });
    }

    const storedName = `${randomUUID()}.${detectedMedia.extension}`;
    const mediaPath = `/uploads/${storedName}`;
    try {
      writeFileSync(path.join(uploadDirectory, storedName), request.file.buffer, { flag: "wx" });
      response.status(201).json({
        media: { type: detectedMedia.type, src: mediaPath }
      });
    } catch (error) {
      try {
        unlinkSync(path.join(uploadDirectory, storedName));
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") console.error("Could not remove partial blog media upload:", cleanupError);
      }
      console.error("Could not save uploaded blog media:", error);
      response.status(500).json({ error: "The blog media could not be saved." });
    }
  }
);

app.post(
  "/api/admin/uploads/resume",
  requireAdmin,
  resumeUpload.single("resume"),
  (request, response) => {
    if (!request.file) return response.status(400).json({ error: "Select a PDF résumé to upload." });
    if (!detectResumeType(request.file.buffer)) {
      return response.status(415).json({ error: "Only PDF résumés are supported." });
    }

    const storedName = `${randomUUID()}.pdf`;
    const resumePath = `/uploads/${storedName}`;
    try {
      writeFileSync(path.join(uploadDirectory, storedName), request.file.buffer, { flag: "wx" });
      response.status(201).json({ resume: resumePath });
    } catch (error) {
      try {
        unlinkSync(path.join(uploadDirectory, storedName));
      } catch (cleanupError) {
        if (cleanupError.code !== "ENOENT") console.error("Could not remove partial résumé upload:", cleanupError);
      }
      console.error("Could not save uploaded résumé:", error);
      response.status(500).json({ error: "The résumé could not be saved." });
    }
  }
);

app.put("/api/admin/content", requireAdmin, (request, response) => {
  const errors = validatePortfolioContent(request.body);
  if (errors.length) return response.status(400).json({ error: "Portfolio content is invalid.", details: errors });

  try {
    const previousRow = database.prepare("SELECT body FROM portfolio_content WHERE id = 1").get();
    const previousContent = previousRow ? JSON.parse(previousRow.body) : defaultContent;
    const { images: _sectionImages, ...contentWithoutSectionImages } = request.body;
    const savedContent = {
      ...contentWithoutSectionImages,
      blogPosts: contentWithoutSectionImages.blogPosts || previousContent.blogPosts || [],
      projects: contentWithoutSectionImages.projects.map((project) => {
        const { image, ...savedProject } = project;
        return {
          ...savedProject,
          images: project.images?.length ? project.images : image ? [image] : []
        };
      })
    };
    database.prepare(`
      INSERT INTO portfolio_content (id, body, updated_at) VALUES (1, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET body = excluded.body, updated_at = CURRENT_TIMESTAMP
    `).run(JSON.stringify(savedContent));

    const collectUploads = (content) => [
      content.profileImage,
      content.resume,
      ...(content.skills || []).map((skill) => skill.icon),
      ...(content.experience || []).map((item) => item.image),
      ...(content.projects || []).flatMap((project) => [
        ...(Array.isArray(project.images) ? project.images : []),
        project.image
      ]),
      ...(content.blogPosts || []).flatMap((post) =>
        Array.isArray(post.media) ? post.media.map((media) => media.src) : []
      ),
      ...Object.values(content.images || {})
    ].filter(Boolean);
    const activeUploads = new Set(collectUploads(savedContent));
    const oldUploads = new Set(collectUploads(previousContent));
    for (const mediaPath of oldUploads) {
      if (activeUploads.has(mediaPath) ||
          (!isStoredProjectImage(mediaPath) &&
            !isStoredBlogMediaPath(mediaPath) &&
            !isStoredResumePath(mediaPath))) continue;
      try {
        unlinkSync(path.join(uploadDirectory, path.basename(mediaPath)));
      } catch (error) {
        if (error.code !== "ENOENT") console.error("Could not remove unused portfolio upload:", error);
      }
    }

    response.json({ content: savedContent, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error("Could not save portfolio content:", error);
    response.status(500).json({ error: "Portfolio content could not be saved." });
  }
});

const buildDirectory = path.join(workspace, "dist");
app.use("/uploads", express.static(uploadDirectory, {
  index: false,
  maxAge: "1y",
  immutable: true,
  setHeaders(response) {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  }
}));
app.use("/uploads", (_request, response) => {
  response.status(404).json({ error: "Image not found." });
});
app.use(express.static(buildDirectory, { index: false, maxAge: production ? "1h" : 0 }));
app.use((request, response, next) => {
  if (request.path.startsWith("/api/")) return next();
  response.sendFile(path.join(buildDirectory, "index.html"), (error) => {
    if (error) next();
  });
});

app.use((request, response) => {
  response.status(404).json({ error: "Not found." });
});

app.use((error, _request, response, _next) => {
  if (response.headersSent) return;
  const status = error instanceof multer.MulterError
    ? error.code === "LIMIT_FILE_SIZE" ? 413 : 400
    : Number.isInteger(error.status) && error.status >= 400 && error.status < 500 ? error.status : 500;
  if (status >= 500) console.error("Request failed:", error);
  response.status(status).json({
    error: status === 413
      ? error instanceof multer.MulterError && error.field === "resume"
        ? "Résumé PDF files must be 10 MB or smaller."
        : error instanceof multer.MulterError && error.field === "file"
          ? "Blog media files must be 50 MB or smaller."
          : "Image files must be 5 MB or smaller."
      : status === 400
        ? "The request body or image upload is invalid."
        : "The request could not be completed."
  });
});

const host = process.env.HOST || (production ? "0.0.0.0" : "127.0.0.1");
app.listen(port, host, () => {
  console.log(`Portfolio server listening on ${host}:${port}`);
});
