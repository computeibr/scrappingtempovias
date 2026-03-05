const defaultPage = 1;
const defaultPerPage = 50;
const maxPaginationPerPage = 250;

function getPaginationParams(
  page = defaultPage,
  perPage = defaultPerPage,
) {
  if (perPage > maxPaginationPerPage) {
    throw new Error('MAX_PER_PAGE_REACHED');
  }

  const offset = (page - 1) * perPage;
  const limit = perPage;

  return {
    offset,
    limit,
  };
}

function paginateResponse(
  result,
  total,
  page = defaultPage,
  perPage = defaultPerPage,
) {
  const totalPerPage = +perPage;
  const lastPage = Math.ceil(+total / +perPage);
  const previousPage = +page - 1 < 1 ? null : +page - 1;
  const nextPage = +page + 1 > +lastPage ? null : +page + 1;

  return {
    result,
    lastPage,
    previousPage,
    nextPage,
    totalElements: +total,
    totalPerPage,
    currentPage: +page,
  };
}

module.exports = {
  getPaginationParams,
  paginateResponse,
};
