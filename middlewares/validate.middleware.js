const ApiError = require("../utils/ApiError");

const REQUEST_PARTS = ["params", "query", "body"];

// Maps zod issues to the { field, message } list used by the frontend forms
const toFieldErrors = (issues) =>
  issues.map((issue) => ({ field: issue.path.join(".") || "root", message: issue.message }));

// validate({ body, params, query }) parses each part; controllers read req.validated (Express 5 req.query is read-only)
const validate = (schemas) => (req, res, next) => {
  const validated = {};
  const errors = [];

  for (const part of REQUEST_PARTS) {
    if (!schemas[part]) continue;
    const result = schemas[part].safeParse(req[part] ?? {});
    if (result.success) validated[part] = result.data;
    else errors.push(...toFieldErrors(result.error.issues));
  }

  if (errors.length) return next(ApiError.badRequest("Validation failed", errors));

  req.validated = validated;
  return next();
};

module.exports = { validate, toFieldErrors };
