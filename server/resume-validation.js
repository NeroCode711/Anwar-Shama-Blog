export function detectResumeType(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 5) return null;
  return buffer.subarray(0, 5).toString("ascii") === "%PDF-"
    ? { mimeType: "application/pdf", extension: "pdf" }
    : null;
}
