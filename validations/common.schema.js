const { z } = require("zod");
const { PAGINATION, SORT_ORDER } = require("../constants/common.constants");

// Shared list query params for server-side tables; modules extend it with their filters
const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(PAGINATION.DEFAULT_PAGE),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(PAGINATION.MAX_PAGE_SIZE)
    .default(PAGINATION.DEFAULT_PAGE_SIZE),
  sortBy: z.string().trim().optional(),
  sortOrder: z.enum([SORT_ORDER.ASC, SORT_ORDER.DESC]).optional(),
  search: z.string().trim().max(100).optional(),
});

const uuidParamSchema = (paramName) => z.object({ [paramName]: z.uuid() });

module.exports = { paginationQuerySchema, uuidParamSchema };
