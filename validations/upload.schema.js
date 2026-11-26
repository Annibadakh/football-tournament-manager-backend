const { z } = require("zod");
const { UPLOAD_PURPOSE } = require("../constants/upload.constants");

const createUploadSchema = z.object({
  purpose: z.enum(UPLOAD_PURPOSE, "Unknown upload purpose"),
  contentType: z.string().trim().min(1, "File type is required"),
  size: z.number().int().positive("File is empty"),
  // Owning record for entity uploads (e.g. tournament uuid for logos and banners)
  entityId: z.string().trim().min(1).max(200).optional(),
});

module.exports = { createUploadSchema };
