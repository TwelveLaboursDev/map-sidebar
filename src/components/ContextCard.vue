<template>
  <div class="context-card-container"  ref="container">
    <div v-show="showContextCard">
      <div v-show="showDetails" class="hide" @click="showDetails = !showDetails">Hide information<i class="el-icon-arrow-up"></i></div>
      <div v-show="!showDetails" class="hide" @click="showDetails = !showDetails">Show information<i class="el-icon-arrow-down"></i></div>
      <el-card v-if="showDetails && Object.keys(contextData).length !== 0" v-loading="loading" class="context-card" >
        <div class="card-left">
          <img :src="banner" class="context-image">
        </div>
        <div class="card-right scrollbar">
          <div class="title">{{contextData.heading}}</div>
          <div v-html="parseMarkdown(contextData.description)"/>
          <br/>

          <!-- Show sampeles and views seperately if they do not match -->
          <template v-if="!samplesUnderViews">
            <div v-if="contextData.views && contextData.views.length > 0" class="subtitle">Scaffold Views</div>
            <template v-for="(view, i) in contextData.views">
              <div v-bind:key="i+'_1'" @click="openViewFile(view)" class="context-card-view">
                <img class="view-image" :src="getFileFromPath(view.thumbnail)"> 
                <div class="view-description">{{view.description}}</div>
              </div>
              <div v-bind:key="i" class="padding"/>
            </template>
            <div style="margin-bottom: 16px;"/>
            <div v-if="contextData.samples && contextData.samples.length > 0" class="subtitle">Samples on Scaffold</div>
            <template v-for="(sample, i) in contextData.samples">
                <span v-bind:key="i+'_3'" class="context-card-item cursor-pointer" @click="toggleSampleDetails(i)">
                  <div v-bind:key="i+'_6'" style="display: flex">
                    <div v-if="sample.color" class="color-box" :style="'background-color:'+ sample.color"></div>
                    <img class="key-image" v-else-if="sample.thumbnail" :src="getFileFromPath(sample.thumbnail)">
                    {{sample.heading}}
                    <i class="el-icon-warning-outline info"></i>
                  </div>
                </span>
                <div v-bind:key="i+'_4'" v-if="sampleDetails[i]" v-html="sample.description"/>
                <a v-bind:key="i+'_5'" v-if="sampleDetails[i] && sample.path" :href="generateFileLink(sample)" target="_blank">View Source</a>
                <div v-bind:key="i+'_2'" class="padding"/>
            </template>
          </template>

          <!-- Show samples under views if the ids match -->
          <template v-else>
            <div v-if="contextData.views && contextData.views.length > 0" class="subtitle">Scaffold Views</div>
            <template v-for="(view, i) in contextData.views">
              <span :key="i+'_1'" @click="viewClicked(view, i)" class="context-card-view">
                <img class="view-image" :src="getFileFromPath(view.thumbnail)"/> 
                <div class="view-description">{{view.description}}<i class="el-icon-warning-outline info"></i> </div>
              </span>
              <div v-if="sampleDetails[i]" v-html="samplesMatching(view.id).description" :key="i+'_2'"/>
              <a v-bind:key="i+'_5'" v-if="sampleDetails[i] && samplesMatching(view.id).path" :href="generateFileLink(samplesMatching(view.id))" target="_blank">View Source</a>
              <div :key="i" class="padding"/>

              <!-- Extra padding if sample details is open -->
              <div :key="i+'_6'" v-if="sampleDetails[i]" class="padding"/>
            </template>
          </template>
        </div>
      </el-card>
    </div>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import Vue from "vue";
import { Link, Icon, Card, Button, Select, Input } from "element-ui";
import lang from "element-ui/lib/locale/lang/en";
import locale from "element-ui/lib/locale";
import EventBus from "./EventBus"
import hardcoded_info from './hardcoded-context-info'

import { marked } from 'marked'
import xss from 'xss'

locale.use(lang);
Vue.use(Link);
Vue.use(Icon);
Vue.use(Card);
Vue.use(Button);
Vue.use(Select);
Vue.use(Input);

const addFilesToPathIfMissing = function(path){
  if (!path.includes('files')){
    return 'files/' + path
  } else {
    return path
  }
}

const convertBackslashToForwardSlash = function(path){
  path = path.replaceAll('\\','/')
  path = path.replaceAll('\\\\', '/')
  return path
}

// const switchPathToDirectory = function(path){
//   let newPath = path.split('/')
//   newPath.pop()
//   return newPath.join('/')
// }


export default {
  name: "contextCard",
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    entry: Object,
    envVars: Object,
  },
  data: function () {
    return {
      contextData: {},
      showDetails: true,
      showContextCard: true,
      sampleDetails: {},
      loading: false
    };
  },
  watch: {
    'entry.contextCardUrl': {
      handler(val){
        if (val) {
          // used for hardcoding data
          if (val === true){
            this.contextData = hardcoded_info[this.entry.discoverId]
          } else {
            this.getContextFile(val)
            this.showContextCard = true
          }
        } else {
          this.showContextCard = false
        }
      },
      immediate: true
    }
  },
  computed: {
    samplesUnderViews: function(){
      if (this.contextData){
        if (this.contextData.samplesUnderViews){
          return true
        } else {
          let viewId = this.contextData.views.map(v=>v.id)
          let samplesView = this.contextData.samples.map(s=>s.view)

          // get matching values
          let matching = viewId.filter(v=>samplesView.includes(v))

          // check all arrays have the same length (which means all values are in all three)
          if ( viewId.length === matching.length && matching.length === samplesView.length){
            return true
          }
          return false
        }
      }
      else return false
    },
    banner: function(){
      if (this.contextData.banner){
        return this.getFileFromPath(this.contextData.banner) 
      } else if (this.contextData && this.contextData.views && this.contextData.views.length > 0) {
        if(this.contextData.views[0].thumbnail){
          return this.getFileFromPath(this.contextData.views[0].thumbnail)
        }
      } 
      return this.entry.banner
    }
  },
  methods: {
    samplesMatching: function(viewId){
      if (this.contextData && this.contextData.samples){
        return this.contextData.samples.filter(s=>s.view == viewId)[0]
      }
      else return []
    },
    viewClicked: function(view, i){
      this.openViewFile(view) 
      this.toggleSampleDetails(i)
    },
    getContextFile: function (contextFileUrl) {
      this.loading = true
      fetch(contextFileUrl)
        .then((response) =>{
          if (!response.ok){
            throw Error(response.statusText)
          } else {
             return response.json()
          }
        })
        .then((data) => {
          this.contextData = data
          this.loading = false
          this.addDiscoverIdsToContextData() 
        })
        .catch((err) => {
          //set defaults if we hit an error
          console.error('caught error!', err)
          this.thumbnail = require('@/../assets/missing-image.svg')
          this.discoverId = undefined
          this.loading = false
        });
    },
    removeDoubleFilesPath: function(path){
      if (path.includes('files/')){
        return path.replace('files/', '')
      } else if (path.includes('files\\')) {
        return path.replace('files\\', '')
      } else {
        return path
      }
    },
    toggleSampleDetails: function(i){
      if (this.sampleDetails[i] === undefined){
        Vue.set(this.sampleDetails, i, true)
      } else {
        Vue.set(this.sampleDetails, i, !this.sampleDetails[i])
      }
    },
    getFileFromPath: function(path){
      // for hardcoded data
      if(this.entry.contextCardUrl === true){
        return path
      }
      path = this.removeDoubleFilesPath(path)
      return  `${this.envVars.API_LOCATION}s3-resource/${this.entry.discoverId}/${this.entry.version}/files/${path}`
    },
    //  This is used later when generateing links to the resource on sparc.science (see generateFileLink)
    addDiscoverIdsToContextData(){
      this.contextData.samples.forEach((sample, i)=>{
        if (sample && sample.doi && sample.doi !== ""){
          fetch(`${this.envVars.PENNSIEVE_API_LOCATION}/discover/datasets/doi/${this.splitDoiFromUrl(sample.doi)}`)
          .then((response) => response.json())
          .then((data) => {
            this.contextData.samples[i].discoverId = data.id
            this.contextData.samples[i].version = data.version
          })
        } else {
            this.contextData.samples[i].discoverId = this.entry.discoverId
            this.contextData.samples[i].version = this.entry.version
        }
      })
    },
    processPathForUrl(path){
      path = convertBackslashToForwardSlash(path)
      path = addFilesToPathIfMissing(path)
      return encodeURI(path)
    },
    splitDoiFromUrl(url){
      return url.split('https://doi.org/').pop()
    },
    generateFileLink(sample){
      return `${this.envVars.ROOT_URL}/file/${sample.discoverId}/${sample.version}?path=${this.processPathForUrl(sample.path)}`

    },
    parseMarkdown(markdown){
      return xss(marked.parse(markdown))
    },
    openViewFile: function(view){
      // note that we assume that the view file is in the same directory as the scaffold (viewUrls take relative paths)
      this.entry.viewUrl = `${this.envVars.API_LOCATION}s3-resource/${this.entry.discoverId}/${this.entry.version}/${view.path}`
      this.entry.type = 'Scaffold View'
      EventBus.$emit("PopoverActionClick", this.entry)
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

.hide{
  color: #e4e7ed;
  cursor: pointer;
}

.context-card{
  background-color: white;
  max-height: 10  50px;
  padding: 8px;
  font-size: 14px;
  margin-bottom: 18px;
  position: relative;
  border: solid 1px #e4e7ed;
  display: flex;
  width: 500px;
  max-height: 258px;
}

.context-card-view{
  cursor: pointer;
  padding-bottom: 8px;
  display: flex;
}

.view-image {
  width: 34px;
  height: 34px;
  flex: 1;
  margin-right: 4px;
}

.view-descriptions {
  flex: 8;
}

.context-card >>> .el-card__body {
  padding: 0px;
  display: flex;
  width: 516px;
}

.context-image{
  width: 250px;
  height: auto;
}

.color-box {
  width: 16px;
  height: 16px;
  border: solid 1px #8300bf;
  border-radius: 2px;
  margin-right: 8px;
}

.card-left{
  flex: 1
}

.card-right {
  flex: 1.3;
  padding-left: 6px;
  overflow-y: scroll;
  scrollbar-width: thin;
}

.cursor-pointer {
  cursor: pointer;
}

.info{
  transform: rotate(180deg);
  color: #8300bf;
  margin-left: 8px;
}

.padding {
  padding-bottom: 8px;
}

.title{
  font-weight: bold;
}

.subtitle{
  font-weight: bold;
}

.scrollbar::-webkit-scrollbar-track {
  border-radius: 10px;
  background-color: #f5f5f5;
}

.scrollbar::-webkit-scrollbar {
  width: 12px;
  right: -12px;
  background-color: #f5f5f5;
}

.scrollbar::-webkit-scrollbar-thumb {
  border-radius: 4px;
  box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.06);
  background-color: #979797;
}

</style>
