const { PAGINATION, SORT_ORDER } = require("../constants/common.constants");

// Turns validated list query params into Sequelize options; sortBy must be whitelisted
const buildPagination = (
  query = {},
  { sortableFields = [], defaultSort = ["created_at", SORT_ORDER.DESC] } = {},
) => {
  const page = query.page ?? PAGINATION.DEFAULT_PAGE;
  const pageSize = Math.min(
    query.pageSize ?? PAGINATION.DEFAULT_PAGE_SIZE,
    PAGINATION.MAX_PAGE_SIZE,
  );
  const isSortable = sortableFields.includes(query.sortBy);
  const sortField = isSortable ? query.sortBy : defaultSort[0];
  const sortOrder = isSortable && query.sortOrder ? query.sortOrder : defaultSort[1];

  return {
    page,
    pageSize,
    limit: pageSize,
    offset: (page - 1) * pageSize,
    order: [[sortField, sortOrder.toUpperCase()]],
  };
};

const buildPaginationMeta = ({ page, pageSize, total }) => ({
  page,
  pageSize,
  total,
  totalPages: Math.ceil(total / pageSize),
});

module.exports = { buildPagination, buildPaginationMeta };
