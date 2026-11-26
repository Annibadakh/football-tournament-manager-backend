import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { buildPagination, buildPaginationMeta } = require("../utils/pagination");

describe("buildPagination", () => {
  it("uses whitelisted sort fields only", () => {
    const options = { sortableFields: ["name"], defaultSort: ["created_at", "desc"] };

    expect(
      buildPagination({ page: 3, pageSize: 20, sortBy: "name", sortOrder: "asc" }, options),
    ).toMatchObject({
      limit: 20,
      offset: 40,
      order: [["name", "ASC"]],
    });
    expect(buildPagination({ sortBy: "password" }, options).order).toEqual([
      ["created_at", "DESC"],
    ]);
  });

  it("caps page size at the maximum", () => {
    expect(buildPagination({ pageSize: 1000 }).limit).toBe(100);
  });
});

describe("buildPaginationMeta", () => {
  it("computes total pages", () => {
    expect(buildPaginationMeta({ page: 1, pageSize: 10, total: 42 })).toEqual({
      page: 1,
      pageSize: 10,
      total: 42,
      totalPages: 5,
    });
  });
});
