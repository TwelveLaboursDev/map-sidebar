<template>
  <div class="dataset-card-container"  ref="container">
    <div class="dataset-card"  ref="card">
      <div class="seperator-path"></div>
      <div v-loading="loading" class="card" >
        <span class="card-left">
          <image-gallery v-if="!loading && datasetId" 
            :datasetId="datasetId"
            :datasetVersion="version"
            :dataLocation="dataLocation"
            :entry="entry"
            :envVars="envVars"
            :label="label"
            :datasetThumbnail="thumbnail"
            :dataset-biolucida="biolucidaData"
            :category="currentCategory"
            @card-clicked="galleryClicked"
            :key="datasetId"
          />
        </span>
        <div class="card-right" >
          <div class="title" @click="cardClicked">{{entry.name}}</div>
          <div class="details">{{contributors}} {{entry.publishDate ? `(${publishYear})` : ''}}</div>
          <div class="details">{{samples}}</div>
          <div v-if="!entry.detailsReady" class="details loading-icon" v-loading="!entry.detailsReady"></div>
          <div>
            <el-button v-if="entry.simulation"  @click="openRepository" size="mini" class="button" icon="el-icon-view">View repository</el-button>
          </div>
          <div class="badges-container">
            <badges-group
              :entry="entry"
              :dataset-biolucida="biolucidaData"
              @categoryChanged="categoryChanged"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import Vue from "vue";
import BadgesGroup from "./BadgesGroup.vue";
import { Button, Icon } from "element-ui";
import lang from "element-ui/lib/locale/lang/en";
import locale from "element-ui/lib/locale";
import EventBus from "./EventBus"
import speciesMap from "./species-map";
import ImageGallery from "./ImageGallery.vue";

locale.use(lang);
Vue.use(Button);
Vue.use(Icon);

export default {
  name: "DatasetCard",
  components: { BadgesGroup, ImageGallery },
  inject: {
    'alternateSearch' : {
      default: undefined,
    },
  },
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: {
      type: Object,
      default: () => {}
    },
    envVars: {
      type: Object,
      default: () => {}
    },
  },
  data: function () {
    return {
      thumbnail: require('@/../assets/missing-image.svg'),
      dataLocation: this.entry.doi,
      datasetId: undefined,
      loading: true,
      version: 1,
      lastDoi: undefined,
      biolucidaData: undefined,
      currentCategory: "All"
    };
  },
  computed: {
    contributors: function() {
      let text = "";
      if (this.entry.contributors) {
        if (this.entry.contributors.length === 1) {
          text = this.lastName(this.entry.contributors[0].name);
        } else if (this.entry.contributors.length === 2) {
          text = this.lastName(this.entry.contributors[0].name) + " & " + this.lastName(this.entry.contributors[1].name);
        } else if (this.entry.contributors.length > 2) {
          text = this.lastName(this.entry.contributors[0].name) + " et al.";
        }
      }
      return text;
    },
    samples: function() {
      let text = "";
      if (this.entry.species) {
        if (this.entry.species.length > 0 &&
          speciesMap[this.entry.species[0].toLowerCase()]) {
          text = `${speciesMap[this.entry.species[0].toLowerCase()]}`;
        } else {
          text = `${this.entry.species}`;
        }
      }
      if (this.entry.numberSamples > 0) {
        text += " (";
        if (this.entry.numberSamples === 1) {
          text += `${this.entry.numberSamples} sample`;
        } else if (this.entry.numberSamples > 1) {
          text += `${this.entry.numberSamples} samples`;
        }
        if (this.entry.numberSubjects === 1) {
          text += ` from ${this.entry.numberSubjects} subject`;
        } else if (this.entry.numberSamples > 1) {
          text += ` from ${this.entry.numberSubjects} subjects`;
        }
        text += ")";
      }

      return text;
    },
    label: function(){
      return this.entry.organs ? this.entry.organs[0] : this.entry.name
    },
    publishYear: function() {
      return this.entry.publishDate.split('-')[0]
    }
  },
  methods: {
    cardClicked: function(){
      this.openDataset()
    },
    categoryChanged: function(name) {
      this.currentCategory = name;
    },
    galleryClicked: function(payload) {
      this.propogateCardAction(payload)
    },
    openDataset: function(){
      window.open(this.dataLocation,'_blank');
    },
    openRepository: function() {
      let apiLocation = this.envVars.API_LOCATION;
      this.entry.additionalLinks.forEach(function(el) {
        if (el.description == "Repository") {
          let xmlhttp = new XMLHttpRequest();
          xmlhttp.open("POST", apiLocation + "/pmr_latest_exposure", true);
          xmlhttp.setRequestHeader("Content-type", "application/json");
          xmlhttp.onreadystatechange = () => {
            if (xmlhttp.readyState === 4) {
              let url = "";
              if (xmlhttp.status === 200) {
                url = JSON.parse(xmlhttp.responseText)["url"];
              }
              if (url === "") {
                url = el.uri;
              }
              window.open(url,'_blank');
            }
          };
          xmlhttp.send(JSON.stringify({workspace_url: el.uri}));
        }
      });
    },
    propogateCardAction: function(action){
      EventBus.$emit("PopoverActionClick", action)
      this.$emit('contextUpdate', action)
    },
    splitDOI: function(doi){
      return [doi.split('/')[doi.split('/').length-2], doi.split('/')[doi.split('/').length-1]]
    },
    getBanner: function () {
      // Only load banner if card has changed
      if (this.lastDoi !== this.entry.doi) {
        this.lastDoi = this.entry.doi
        this.loading = true
        let doi = this.splitDOI(this.entry.doi)
        fetch(`${this.envVars.PENNSIEVE_API_LOCATION}/discover/datasets/doi/${doi[0]}/${doi[1]}`)
          .then((response) =>{
            if (!response.ok){
              throw Error(response.statusText)
            } else {
              return response.json()
            }
          })
          .then((data) => {
            this.thumbnail = data.banner
            this.datasetId = data.id
            this.version = data.version
            this.dataLocation = `${this.envVars.ROOT_URL}/datasets/${data.id}?type=dataset`
            this.getBiolucidaInfo(this.datasetId)
            this.loading = false
          })
          .catch(() => {
            //set defaults if we hit an error
            this.thumbnail = require('@/../assets/missing-image.svg')
            this.datasetId = Number(this.entry.datasetId)
            this.loading = false
          });
      }

    },
    initialise: function() {
      if (!this.alternateSearch) {
        this.getBanner();
      } else {
        this.dataLocation = this.envVars.ROOT_URL + this.entry.data_url_suffix;
        this.datasetId = this.entry.datasetId;
        const token = localStorage.getItem("one_off_token");
        if (this.entry.scaffoldViews.length > 0) {
          this.thumbnail = this.envVars.QUERY_URL + this.entry.scaffoldViews[0].image_url + `?token=${token}`;
        } else if (this.entry.thumbnails.length > 0) {
          this.thumbnail = this.envVars.QUERY_URL + this.entry.thumbnails[0].image_url + `?token=${token}`;
        } else {
          this.thumbnail = require("@/../assets/missing-image.svg");
        }
        this.loading = false;
      }
    },
    lastName: function(fullName){
      return fullName.split(',')[0]
    },
    getBiolucidaInfo: function(id) {
      let apiLocation = this.envVars.API_LOCATION;
      let endpoint = apiLocation + "image_search/" + id;
      // Add parameters if we are sent them
      fetch(endpoint)
        .then(response => response.json())
        .then(data => {
          if (data.status == "success")
            this.biolucidaData = data;
        });
    }
  },
  created: function() {
    this.initialise();
  },
  watch: {
    // currently not using card overflow
    'entry.datasetId': function() { // watch it
      this.initialise();
    }
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@import "~element-ui/packages/theme-chalk/src/col";
@import "~element-ui/packages/theme-chalk/src/loading";

.dataset-card {
  padding-left: 16px;
  position: relative;
  min-height:17rem;
}

.title {
  padding-bottom: 0.75rem;
  font-family: Asap;
  font-size: 14px;
  font-weight: bold;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 1.05px;
  color: #484848;
  cursor: pointer;
}
.card {
  padding-top: 18px;
  position: relative;
  display: flex;
}

.card-left{
  flex: 1;
}

.card-right {
  flex: 1.3;
  padding-left: 6px;
}

.button{
  z-index: 10;
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: normal;
  letter-spacing: normal;
  background-color: $app-primary-color;
  border: $app-primary-color;
  color: white;
  cursor: pointer;
  margin-top: 8px;
}

.button:hover {
  background-color: $app-primary-color;
  color: white;
}

.banner-img {
  width: 128px;
  height: 128px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.25);
  background-color: #ffffff;
  cursor: pointer;
}
.details{
  font-family: Asap;
  font-size: 14px;
  font-weight: normal;
  font-stretch: normal;
  font-style: normal;
  line-height: 1.5;
  letter-spacing: 1.05px;
  color: #484848;
}

.badges-container {
  margin-top:0.75rem;
}

.loading-icon {
  z-index: 20;
  width: 40px;
  height: 40px;
  left: 80px;
}

.loading-icon ::v-deep .el-loading-mask {
  background-color: rgba(117, 190, 218, 0.0) !important;
}

.loading-icon ::v-deep .el-loading-spinner .path {
  stroke: $app-primary-color;
}
</style>
