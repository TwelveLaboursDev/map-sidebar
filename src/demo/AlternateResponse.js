/* eslint-disable no-alert, no-console */
const searchDataset = async (payload, callback) => {
  let data = {};
  let search = "";
  let allFilter = {};

  if (payload.query) {
    search = payload.query;
  }
  if (payload.filters !== undefined) {
    for (let i = 0; i < payload.filters.length; i++) {
      let filter = payload.filters[i];
      let node;
      let field;
      let element;
      let subFilter = {};
      let exist = false;
      if (filter.facet != "Show all") {
        let filterPayload = filter.facetPropPath.split(">");
        node = filterPayload[0];
        field = filterPayload[1];
        element = filter.facet;
        Object.entries(allFilter).forEach((entry) => {
          const [key, value] = entry;
          if (node == value.node) {
            Object.keys(value.filter).forEach((subkey) => {
              if (node == value.node && field == subkey) {
                exist = true;
                allFilter[key]["filter"][field].push(element);
              } else {
                exist = false;
              }
            });
          }
        });
        if (exist == false) {
          subFilter["node"] = node;
          subFilter["filter"] = {};
          subFilter["filter"][field] = [];
          subFilter["filter"][field].push(element);
          allFilter[i] = subFilter;
        }
      }
    }
  }
  let url = `${payload.queryUrl}/graphql/pagination/?search=${search}`;
  let postPayload = {
    filter: allFilter,
    limit: payload.numberPerPage,
    page: payload.page,
  };
  await fetch(url, {
    method: "POST", // *GET, POST, PUT, DELETE, etc.
    headers: {
      Accept: "application.json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(postPayload), // body data type must match "Content-Type" header
    Cache: "default",
  })
    .then((response) => response.json())
    .then((json) => (data = json));

  const searchData = data;
  callback(searchData);
};

const getFacets = async (payload, callback) => {
  let facet = {};
  let url = `${payload.queryUrl}/filter/?sidebar=true`;
  await fetch(url, {
    method: "GET", // *GET, POST, PUT, DELETE, etc.
    headers: {
      Accept: "application.json",
      "Content-Type": "application/json",
    },
    Cache: "default",
  })
    .then((response) => response.json())
    .then((json) => (facet = json));

  const facets = facet;
  const returnedPayload = {
    data: facets,
  };
  callback(returnedPayload);
};

export const mySearch = (payload, callback) => {
  if (payload && callback) {
    if (payload.requestType == "Search") {
      searchDataset(payload, callback);
      return;
    } else if (payload.requestType == "getFacets") {
      getFacets(payload, callback);
    }
  }
};
