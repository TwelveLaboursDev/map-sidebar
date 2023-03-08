const searchDataset = (payload, callback) => {
  const element = {

  };
  const searchData = {
    total: 5, //Total number of items
    items: [
      {
        numberSamples: 6,
        numberSubjects: 5,
        updated: 'the time in string format',
        url: 'uri to dataset page',
        datasetId: '1231',
        datasetRevision: '4',
        datasetVersion: '5',
        organs: ['heart', 'lungs'],
        species: ['human', 'rat'], // This processing only includes each gender once into 'sexes'
        scaffolds: element['abi-scaffold-metadata-file'],
        thumbnails: element['abi-thumbnail'] ? element['abi-thumbnail']: element['abi-scaffold-thumbnail'],
        scaffoldViews: element['abi-scaffold-view-file'],
        videos: element.video,
        plots: element['abi-plot'],
        images: element['common-images'],
        contextualInformation: undefined,
        simulation: element['abi-simulation-file'],
        detailsReady: true,
      }

    ] //actual returns information
  };
  callback(searchData);
}

const getFacets = (payload, callback) => {
  const facets = [
    {
      key: "anatomy.organ.name",
      label: "Anatomical Structure",
      value: "anatomy.organ.name",
      children: [
        {
          facetPropPath: "anatomy.organ.name", //Should be the same as the parent's key
          label: "Lung",
          value: "Anatomical Structure>Lung",
        }
      ]
    }
  ]
  const returnedPayload = {
    data: facets
  };
  callback(returnedPayload);
}


exports.mySearch = (payload, callback) => {
  if (payload && callback) {
    if (payload.requestType == 'Search') {
      searchDataset(payload, callback);
      return;
    } else if ((payload.requestType == 'getFacets')) {
      getFacets(payload, callback);
    }
  }
}
