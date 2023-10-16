/* eslint-disable no-alert, no-console */

// Mapping between display categories and their Algolia index property path
// Used for populating the Dataset Search Results facet menu dynamically
export const facetPropPathMapping = {
  'anatomy.organ.name' : 'Anatomical Structure',
  'organisms.primary.species.name' : 'Species',
  'item.modalities.keyword' : 'Experimental Approach',
  'attributes.subject.sex.value' : 'Sex',
  'attributes.subject.ageCategory.value' : 'Age Categories',
  'item.types.name' : 'Data type',
}

// Same as above, but these show on the sidebar filters
export const shownFilters = {
  'anatomy.organ.name' : 'Anatomical Structure',
  'organisms.primary.species.name' : 'Species',
  'attributes.subject.sex.value' : 'Sex',
  'attributes.subject.ageCategory.value' : 'Age Categories',
  'item.types.name' : 'Data type',
}

/* Returns filter for searching algolia. All facets of the same category are joined with OR,
  * and each of those results is then joined with an AND.
  * i.e. (color:blue OR color:red) AND (shape:circle OR shape:red) */
export function getFilters(selectedFacetArray=undefined) {
  // return all datasets if no filter
  if (selectedFacetArray === undefined) {
    return 'NOT item.published.status:embargo'
  }

  // Switch the 'term' attribute to 'label' if 'label' does not exist 
  selectedFacetArray.forEach(f=>f.label=f.facet)
  

  let facets = removeShowAllFacets(selectedFacetArray)

  let filters = "NOT item.published.status:embargo";
  filters = `(${filters}) AND `;

  const facetPropPaths = Object.keys(facetPropPathMapping);
  facetPropPaths.map((facetPropPath) => {
    const facetsToBool = facets.filter(
      (facet) => facet.facetPropPath == facetPropPath
    );
    let orFilters = "";
    let andFilters = "";
    facetsToBool.map((facet) => {
      if (facet.AND){
        andFilters += `AND "${facetPropPath}":"${facet.label}"`;
      } else {
        orFilters += `"${facetPropPath}":"${facet.label}" OR `;
      }
    });
    if (orFilters == "" && andFilters =="") {
      return;
    }
    orFilters = `(${orFilters.substring(0, orFilters.lastIndexOf(" OR "))})` // remove last OR

    filters += `${orFilters + andFilters} AND `; // Put them together
    // (Note that we add an extra AND in case there are facets at a higher level)

    filters = filters.split('()AND ').join(''); // Handle case where there where no OR facets
  });
  return filters.substring(0, filters.lastIndexOf(" AND "));
}

function removeShowAllFacets(facetArray){
  return facetArray.filter( f => f.label !== 'Show all')
}