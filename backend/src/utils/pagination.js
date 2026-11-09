const parsePagination = (query, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit || '20', 10) || 20));
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

module.exports = { parsePagination };
