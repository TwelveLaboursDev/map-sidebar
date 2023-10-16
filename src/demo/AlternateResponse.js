/* eslint-disable no-alert, no-console */
import axios from "axios";
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
      if (filter.facet != "Show all") {
        if (filter.facetPropPath in allFilter) {
          allFilter[filter.facetPropPath].push(filter.facet);
        } else {
          allFilter[filter.facetPropPath] = [filter.facet];
        }
      }
    }
  }
  let url = `${payload.queryUrl}/graphql/pagination?search=${search}`;
  let postPayload = {
    filter: allFilter,
    limit: payload.numberPerPage,
    page: payload.page,
  };

  await axios
    .post(url, postPayload, {
      headers: {
        Authorization: "Bearer undefined",
      },
    })
    .then((res) => {
      data = res.data;
      localStorage.setItem("one_off_token", res.headers["x-one-off"]);
    })
    .catch((err) => {
      console.log(err);
    });

  const searchData = data;
  callback(searchData);
};

const getFacets = async (payload, callback) => {
  let facet = {};
  let url = `${payload.queryUrl}/filter?sidebar=true`;

  await axios
    .get(url, {
      headers: {
        Authorization: "Bearer undefined",
      },
    })
    .then((res) => {
      facet = res.data;
    })
    .catch((err) => {
      console.log(err);
    });

  const facets = facet;
  const returnedPayload = {
    data: facets,
  };
  callback(returnedPayload);
};

const getOneOffToken = async (payload, callback) => {
  let url = `${payload.queryUrl}/access/oneoff`;

  await axios
    .get(url, {
      headers: {
        Authorization: "Bearer undefined",
      },
    })
    .then((res) => {
      localStorage.setItem("one_off_token", res.data.one_off_token);
    })
    .catch((err) => {
      console.log(err);
    });
  callback();
};

export const mySearch = (payload, callback) => {
  if (payload && callback) {
    if (payload.requestType == "Search") {
      searchDataset(payload, callback);
      return;
    } else if (payload.requestType == "getFacets") {
      getFacets(payload, callback);
    } else if (payload.requestType == "getToken") {
      getOneOffToken(payload, callback);
    }
  }
};
