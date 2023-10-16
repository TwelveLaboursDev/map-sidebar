<template>
  <div class="filters">
    <map-svg-sprite-color />
    <transition name="el-zoom-in-top">
      <span v-show="showFilters" class="search-filters transition-box">
        <custom-cascader
          class="cascader"
          ref="cascader"
          v-model="cascadeSelected"
          placeholder
          :collapse-tags="true"
          :options="options"
          :props="props"
          @change="cascadeEvent($event)"
          @expand-change="cascadeExpandChange"
          :show-all-levels="false"
          :append-to-body="false"
          @tags-changed="tagsChangedCallback"
        ></custom-cascader>
        <div v-if="showFiltersText" class="filter-default-value">
          Filters
        </div>
        <el-popover
          title="How do filters work?"
          width="250"
          trigger="hover"
          :append-to-body=false
          popper-class="popover"
          >
          <map-svg-icon slot="reference" icon="help" class="help"/>
          <div >
            <strong>Within categories:</strong> OR 
            <br/>
            example: 'heart' OR 'colon'
            <br/>
            <br/>
            <strong>Between categories:</strong> AND
            <br/>
            example: 'rat' AND 'lung'
          </div>
        </el-popover>
        
      </span>
    </transition>

    <el-select
      class="number-shown-select"
      v-model="numberShown"
      placeholder="10"
      @change="numberShownChanged($event)"
    >
      <el-option
        v-for="item in numberDatasetsShown"
        :key="item"
        :label="item"
        :value="item"
      ></el-option>
    </el-select>
    <span class="dataset-results-feedback">{{ this.numberOfResultsText }}</span>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import Vue from "vue";
import { Option, Select, Popover } from "element-ui";
import CustomCascader from "./Cascader";
import lang from "element-ui/lib/locale/lang/en";
import locale from "element-ui/lib/locale";
import speciesMap from "./species-map";
import { MapSvgIcon, MapSvgSpriteColor } from "@abi-software/svg-sprite";

import {AlgoliaClient} from "../algolia/algolia.js";
import {facetPropPathMapping} from "../algolia/utils.js";

locale.use(lang);
Vue.use(Option);
Vue.use(Select);
Vue.use(Popover)

const capitalise = function (txt) {
  return txt.charAt(0).toUpperCase() + txt.slice(1);
};

const convertReadableLabel = function (original) {
  const name = original.toLowerCase();
  if (speciesMap[name]) {
    return capitalise(speciesMap[name]);
  } else {
    return capitalise(name);
  }
};



export default {
  name: "SearchFilters",
  components: {
    CustomCascader,
    MapSvgIcon,
    MapSvgSpriteColor,
  },
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: Object,
    envVars: {
      type: Object,
      default: ()=>{}
    },
  },
  inject: {
    'alternateSearch' : {
      default: undefined,
    },
  },
  data: function () {
    return {
      cascaderIsReady: false,
      previousShowAllChecked: {
        species: false,
        gender: false,
        organ: false,
        datasets: false,
      },
      showFilters: true,
      showFiltersText: true,
      cascadeSelected: [],
      cascadeSelectedWithBoolean: [], 
      numberShown: 10,
      filters: [],
      numberDatasetsShown: ["10", "20", "50"],
      props: { multiple: true },
      options: [
        {
          value: "Species",
          label: "Species",
          children: [{}],
        },
      ],
    };
  },
  computed: {
    numberOfResultsText: function () {
      return `${this.entry.numberOfHits} results | Showing`;
    },
  },
  methods: {
    createCascaderItemValue: function (term, facet) {
      if (facet) return term + ">" + facet;
      else return term;
    },
    populateCascaderOptions: function(data) {
      this.options = data;
      // create top level of options in cascader
      this.options.forEach((facet, i) => {
        this.options[i].label = convertReadableLabel(facet.label);
        this.options[i].value = this.createCascaderItemValue(
          facet.key,
          undefined
        );

        // put "Show all" as first option
        this.options[i].children.unshift({
          value: this.createCascaderItemValue("Show all"),
          label: "Show all",
        });

        // populate second level of options 
        this.options[i].children.forEach((facetItem, j) => {
          this.options[i].children[j].label = convertReadableLabel(
            facetItem.label
          );
          this.options[i].children[j].value =
            this.createCascaderItemValue(facet.label, facetItem.label);
        });
      });
    },
    populateDefaultCascader: function() {
      return new Promise((resolve) => {
        // Algolia facet serach
        this.algoliaClient.getAlgoliaFacets(facetPropPathMapping)
          .then((data) => {
            this.populateCascaderOptions(data);
          })
          .finally(() => {
            resolve();
          });
      });
    },
    setCascaderReady:function() {
      this.cascaderIsReady = true;
      this.checkShowAllBoxes();
      this.setCascader(this.entry.filterFacets);
      this.makeCascadeLabelsClickable();
      this.$emit("cascaderReady");
    },
    alternateSearchCB: function(payload) {
      this.populateCascaderOptions(payload.data);
      this.setCascaderReady();
    },
    populateCascader: function () {
      if (this.alternateSearch) {
        const payload = {
          requestType: "getFacets",
          queryUrl: this.envVars.QUERY_URL,
        };
        this.alternateSearch(payload, this.alternateSearchCB);
      } else {
        this.populateDefaultCascader().then(() => {
          this.setCascaderReady();
        });
      }
    },
    tagsChangedCallback: function (presentTags) {
      if (presentTags.length > 0) {
        this.showFiltersText = false;
      } else {
        this.showFiltersText = true;
      }
    },
    // cascadeEvent: initiate searches based off cascader changes
    cascadeEvent: function (event) {
      if (event) {
        // Check for show all in selected cascade options
        event = this.showAllEventModifier(event);

        // Create results for the filter update 
        let filterKeys = event.filter( selection => selection !== undefined).map( fs => ({
          facetPropPath: fs[0], 
          facet: fs[1].split(">")[1],
          term: fs[1].split(">")[0], 
          AND: fs[2] // for setting the boolean
        }))

        // Move results from arrays to object for use on scicrunch (note that we remove 'duplicate' as that is only needed for filter keys)
        let filters = event.filter( selection => selection !== undefined).map( fs => {
          let propPath = fs[0].includes('duplicate') ? fs[0].split('duplicate')[0] : fs[0]
          return {
            facetPropPath: propPath, 
            facet: fs[1].split(">")[1],
            term: fs[1].split(">")[0], 
            AND: fs[2] // for setting the boolean
          }
        })

        this.$emit('loading', true) // let sidebarcontent wait for the requests

        this.$emit("filterResults", filters); // emit filters for apps above sidebar
        this.setCascader(filterKeys); //update our cascader v-model if we modified the event
        this.makeCascadeLabelsClickable();
      }
    },
    // showAllEventModifier:  Modifies a cascade event to unclick all selections in category if "show all" is clicked. Also unchecks "Show all" if any secection is clicked
    // *NOTE* Does NOT remove 'Show all' selections from showing in 'cascadeSelected'
    showAllEventModifier: function (event) {
      // check if show all is in the cascader checked option list
      let hasShowAll = event
        .map((ev) => (ev ? ev[1].toLowerCase().includes("show all") : false))
        .includes(true);
      // remove all selected options below the show all if checked
      if (hasShowAll) {
        let modifiedEvent = [];
        let facetMaps = {};
        //catagorised different facet items
        for (const i in event) {
          if (facetMaps[event[i][0]] === undefined) facetMaps[event[i][0]] = [];
          facetMaps[event[i][0]].push(event[i]);
        }
        // go through each facets
        for (const facet in facetMaps) {
          let showAll = undefined;
          // Find the show all item if any
          for (let i = facetMaps[facet].length - 1; i >= 0; i--) {
            if (facetMaps[facet][i][1].toLowerCase().includes("show all")) {
              //seperate the showAll item and the rest
              showAll = facetMaps[facet].splice(i, 1)[0];
              break;
            }
          }
          if (showAll) {
            if (this.previousShowAllChecked[facet]) {
              //Unset the show all if it was present previously
              //and there are other items
              if (facetMaps[facet].length > 0)
                modifiedEvent.push(...facetMaps[facet]);
              else modifiedEvent.push(showAll);
            } else {
              //showAll is turned on
              modifiedEvent.push(showAll);
            }
          } else {
            modifiedEvent.push(...facetMaps[facet]);
          }
        }
        //Make sure the expanded item are sorted first.
        return modifiedEvent.sort((a, b) => {
          if (this.__expandItem__) {
            if (a[0] == this.__expandItem__) {
              if (b[0] == this.__expandItem__) {
                return 0;
              } else {
                return -1;
              }
            } else if (b[0] == this.__expandItem__) {
              if (a[0] == this.__expandItem__) {
                return 0;
              } else {
                return 1;
              }
            } else {
              return 0;
            }
          } else return 0;
        });
      }
      return event;
    },
    cascadeExpandChange: function (event) {
      //work around as the expand item may change on modifying the cascade props
      this.__expandItem__ = event;
      this.makeCascadeLabelsClickable();
    },
    numberShownChanged: function (event) {
      this.$emit("numberPerPage", parseInt(event));
    },
    updatePreviousShowAllChecked: function (options) {
      //Reset the states
      for (const facet in this.previousShowAllChecked) {
        this.previousShowAllChecked[facet] = false;
      }
      options.forEach((element) => {
        if (element[1].toLowerCase().includes("show all"))
          this.previousShowAllChecked[element[0]] = true;
      });
    },
    // setCascader: Clears previous selections and takes in an array of facets to select: filterFacets
    // facets are in the form:
    //    {
    //      facetPropPath: 'anatomy.organ.name',
    //      term: 'Sex',
    //      facet: 'Male'
    //      AND: true  // Optional value for setting the boolean within a facet
    //    }
    setCascader: function (filterFacets) {
      //Do not set the value unless it is ready
      if (this.cascaderIsReady && filterFacets && filterFacets.length != 0) {
        this.cascadeSelected = filterFacets.map(e => {
          return [
            e.facetPropPath,
            this.createCascaderItemValue(capitalise(e.term), e.facet),
          ]
        });

        // Unforttunately the cascader is very particular about it's v-model
        //   to get around this we create a clone of it and use this clone for adding our boolean information
        this.cascadeSelectedWithBoolean= filterFacets.map(e => {
          return [
            e.facetPropPath,
            this.createCascaderItemValue(capitalise(e.term), e.facet),
            e.AND
          ]
        });
        this.updatePreviousShowAllChecked(this.cascadeSelected);
      }
    },
    addFilter: function (filter) {
      //Do not set the value unless it is ready
      if (this.cascaderIsReady && filter) {
        if (this.validateFilter(filter)) {
          this.cascadeSelected.filter(f=>f.term != filter.term)
          this.cascadeSelected.push([filter.facetPropPath, this.createCascaderItemValue(filter.term, filter.facet), filter.AND])
          this.cascadeSelectedWithBoolean.push([filter.facetPropPath, this.createCascaderItemValue(filter.term, filter.facet), filter.AND])
          // The 'AND' her is to set the boolean value when we search on the filters. It can be undefined without breaking anything
          return true;
        }
      }
    },
    initiateSearch: function() {
      this.cascadeEvent(this.cascadeSelectedWithBoolean)
    },
    // checkShowAllBoxes: Checks each 'Show all' cascade option by using the setCascader function
    checkShowAllBoxes: function(){
      this.setCascader(
        this.options.map(option => {
          return {
            facetPropPath: option.value,
            term: option.label,
            facet: 'Show all'
          }
        })
      )
    },
    makeCascadeLabelsClickable: function () {
      // Next tick allows the cascader menu to change
      this.$nextTick(() => {
        this.$refs.cascader.$el
          .querySelectorAll(".el-cascader-node__label")
          .forEach((el) => {
            // step through each cascade label
            el.onclick = function () {
              const checkbox = this.previousElementSibling;
              if (checkbox) {
                if (!checkbox.parentElement.attributes["aria-owns"]) {
                  // check if we are at the lowest level of cascader
                  this.previousElementSibling.click(); // Click the checkbox
                }
              }
            };
          });
      });
    },
    /**
     * Validate ther filter term to make sure the term is correct
     */
    validateFilter: function(filter) {
      if (filter && filter.facet && filter.term) {
        const item = this.createCascaderItemValue(filter.term, filter.facet);
        const facet = this.options.find(element => element.value === filter.facetPropPath);
        if (facet) {
          const filter = facet.children.find(element => element.value === item);
          if (filter)
            return true;
        }
      }
      return false;
    },
    /**
     * Return a list of valid filers given a list of filters, 
     */
    getValidatedFilters: function (filters) {
      if (filters) {
        if (this.cascaderIsReady) {
          const result = [];
          filters.forEach(filter => {
            if (this.validateFilter(filter)) {
              result.push(filter);
            }
          });
          return result;
        } else return filters;
      }
      return [];
    },
  },
  mounted: function () {
    if (!this.alternateSearch) {
      this.algoliaClient = new AlgoliaClient(this.envVars.ALGOLIA_ID, this.envVars.ALGOLIA_KEY, this.envVars.PENNSIEVE_API_LOCATION);
      this.algoliaClient.initIndex(this.envVars.ALGOLIA_INDEX);
    }
    this.populateCascader();
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@import "~element-ui/packages/theme-chalk/src/option";
@import "~element-ui/packages/theme-chalk/src/popover";
@import "~element-ui/packages/theme-chalk/src/select";

.filter-default-value {
  pointer-events: none;
  position: absolute;
  top: 0;
  left: 0;
  padding-top: 10px;
  padding-left: 16px;
}

.help {
  width: 24px !important;
  height: 24px;
  transform: scale(1.1);
  cursor: pointer;
}

.popover {
  color: rgb(48, 49, 51);
  font-family: Asap;
  margin: 12px;
}

.filter-icon-inside {
  width: 12px !important;
  height: 12px !important;
  color: #292b66;
  transform: scale(2) !important;
  margin-bottom: 0px !important;
}

.cascader {
  font-family: Asap;
  font-size: 14px;
  font-weight: 500;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  color: #292b66;
  text-align: center;
  padding-bottom: 6px;
}

.cascader ::v-deep .el-cascder-panel {
  max-height: 500px;
}

.cascader::v-deep .el-scrollbar__wrap {
  overflow-x: hidden;
  margin-bottom: 2px !important;
}

.cascader ::v-deep li[aria-owns*="cascader"] > .el-checkbox {
  display: none;
}

.dataset-results-feedback {
  float: right;
  text-align: right;
  color: rgb(48, 49, 51);
  font-family: Asap;
  font-size: 18px;
  font-weight: 500;
  padding-top: 8px;
}

.search-filters {
  position: relative;
  float: left;
  padding-right: 15px;
  padding-bottom: 12px;
}

.number-shown-select {
  float: right;
}

.number-shown-select ::v-deep .el-input__inner {
  width: 68px;
  height: 40px;
  color: rgb(48, 49, 51);
}

.search-filters ::v-deep .el-cascader-node.is-active {
  color: $app-primary-color;
}

.search-filters ::v-deep .el-cascader-node.in-active-path {
  color: $app-primary-color;
}

.search-filters ::v-deep .el-checkbox__input.is-checked > .el-checkbox__inner {
  background-color: $app-primary-color;
  border-color: $app-primary-color;
}

.cascader ::v-deep .el-cascader-menu:nth-child(2) .el-cascader-node:first-child {
  border-bottom: 1px solid #e4e7ed;
}

.cascader ::v-deep .el-cascader-node__label {
  text-align: left;
}

.filters ::v-deep .el-popover {
    background: #f3ecf6 !important;
    border: 1px solid $app-primary-color;
    border-radius: 4px;
    color: #303133 !important;
    font-size: 12px;
    line-height: 18px;
}

.filters ::v-deep .el-popover[x-placement^="top"] .popper__arrow {
  border-top-color: $app-primary-color;
  border-bottom-width: 0;
}
.filters ::v-deep .el-popover[x-placement^="top"] .popper__arrow::after {
  border-top-color: #f3ecf6;
  border-bottom-width: 0;
}

.filters ::v-deep .el-popover[x-placement^="bottom"] .popper__arrow {
  border-top-width: 0;
  border-bottom-color: $app-primary-color;
}
.filters ::v-deep .el-popover[x-placement^="bottom"] .popper__arrow::after {
  border-top-width: 0;
  border-bottom-color: #f3ecf6;
}

.filters ::v-deep .el-popover[x-placement^="right"] .popper__arrow {
  border-right-color: $app-primary-color;
  border-left-width: 0;
}
.filters ::v-deep .el-popover[x-placement^="right"] .popper__arrow::after {
  border-right-color: #f3ecf6;
  border-left-width: 0;
}

.filters ::v-deep .el-popover[x-placement^="left"] .popper__arrow {
  border-right-width: 0;
  border-left-color: $app-primary-color;
}
.filters ::v-deep .el-popover[x-placement^="left"] .popper__arrow::after {
  border-right-width: 0;
  border-left-color: #f3ecf6;
}
</style>
