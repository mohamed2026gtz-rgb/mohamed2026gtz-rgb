function paginate(page = 1, pageSize = 20) {
  const p = Math.max(1, Number(page) || 1);
  const size = Math.min(100, Math.max(1, Number(pageSize) || 20));
  return { page: p, pageSize: size, offset: (p - 1) * size };
}

function pagedResult(items, totalCount, page, pageSize) {
  return {
    items,
    totalCount,
    page,
    pageSize,
    totalPages: pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0,
  };
}

module.exports = { paginate, pagedResult };
