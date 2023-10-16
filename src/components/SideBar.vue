<template>
  <div ref="container">
    <div v-if="!drawerOpen" @click="toggleDrawer" class="open-tab">
      <i class="el-icon-arrow-left"></i>
    </div>
    <el-drawer
      custom-class="my-drawer"
      class="side-bar"
      :visible.sync="drawerOpen"
      :appendToBody="false"
      :modal-append-to-body="false"
      size=550
      :with-header="false"
      :wrapperClosable="false"
      :modal="false"
    >
      <div class="box-card">
        <div v-if="drawerOpen" @click="close" class="close-tab">
          <i class="el-icon-arrow-right"></i>
        </div>
        <div class="sidebar-container">
          <tabs v-if="tabs.length > 1" :tabTitles="tabs" :activeId="activeId"
            @titleClicked="tabClicked"/>
          <template v-for="tab in tabs">
            <sidebar-content class="sidebar-content-container"
            v-show="tab.id===activeId" :contextCardEntry="tab.contextCard"
            :envVars="envVars"
            v-bind:key="tab.id" :ref="tab.id"
            @search-changed="searchChanged(tab.id, $event)"/>
          </template>
        </div>
      </div>
    </el-drawer>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import Vue from "vue";
import {
  Drawer,
  Icon,
} from "element-ui";
import lang from "element-ui/lib/locale/lang/en";
import locale from "element-ui/lib/locale";
import SidebarContent from './SidebarContent.vue';
import EventBus from './EventBus';
import Tabs from './Tabs'

locale.use(lang);
Vue.use(Drawer);
Vue.use(Icon);

export default {
  components: {SidebarContent, Tabs },
  name: "SideBar",
  props: {
    visible: {
      type: Boolean,
      default: false
    },
    envVars: {
      type: Object,
      default: () => {}
    },
    tabs: {
      type: Array,
      default: () => [{title:'flatmap', id:1}]
    },
    activeId: {
      type: Number,
      default: 1
    },
    openAtStart: {
      type: Boolean,
      default: false
    },
    alternateSearch: {
      type: Function,
      default: undefined
    }
  },
  data: function () {
    return {
      drawerOpen: false,
    }
  },
  provide: function() {
    return {
      alternateSearch: this.alternateSearch
    }
  },
  methods: {
    searchChanged: function (id, data) {
      this.$emit("search-changed", {...data, id: id});
    },
    close: function () {
      this.drawerOpen = false;
    },
    toggleDrawer: function () {
      this.drawerOpen = !this.drawerOpen;
    },
    openSearch: function(facets, query){
      this.drawerOpen = true;
      // Because refs are in v-for, nextTick is needed here
      Vue.nextTick(()=>{this.$refs[this.activeId][0].openSearch(facets, query)})
    },
    addFilter: function(filter){
      this.drawerOpen = true;
      filter.AND = true // When we add a filter external, it is currently only with an AND boolean

      // Because refs are in v-for, nextTick is needed here
      Vue.nextTick(()=>{this.$refs[this.activeId][0].addFilter(filter)})
    },
    openNeuronSearch: function(neuron){
      this.drawerOpen = true;
      // Because refs are in v-for, nextTick is needed here
      Vue.nextTick(()=>{this.$refs[this.activeId][0].openSearch('', undefined, 'scicrunch-query-string/', {'field': '*organ.curie', 'curie':neuron})})
    },
    tabClicked: function(id) {
      this.$emit("tabClicked", id);
    },
  },
  created:function() {
    this.drawerOpen = this.openAtStart;
  },
  mounted: function(){
    EventBus.$on("PopoverActionClick", (payLoad) => {
      this.$emit("actionClick", payLoad);
    })
    EventBus.$on('anatomyFound', (payLoad)=> {
      this.$emit('search-changed', {
        type: 'keyword-update',
        value: payLoad
      })
    })
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@import "~element-ui/packages/theme-chalk/src/drawer";
@import "~element-ui/packages/theme-chalk/src/icon";

.box-card {
  flex: 3;
  height: 100%;
  overflow: hidden;
  pointer-events: auto;
}

.side-bar{
  position: relative;
  height: 100%;
  pointer-events: none;
}

.side-bar ::v-deep .el-drawer:focus{
  outline:none;
}

.sidebar-container {
  height: 100%;
  flex-flow: column;
  display: flex;
}

.open-tab{
  width: 20px;
  height: 40px;
  z-index: 8;
  position: absolute;
  top: calc(50vh - 80px);
  right: 0px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px $app-primary-color;
  background-color: #f9f2fc;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  pointer-events: auto;
}

.el-icon-arrow-left,
.el-icon-arrow-right
{
  font-weight: 600;
  margin-top: 12px;
  color: $app-primary-color;
  cursor: pointer;
  pointer-events: auto;
  transform: scaleY(2.0);
  text-align: center;
  vertical-align: middle;
}

.close-tab{
  float: left;
  flex: 1;
  width: 20px;
  height: 40px;
  z-index: 8;
  margin-top: calc(50vh - 80px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.06);
  border: solid 1px $app-primary-color; 
  background-color: #f9f2fc;
  text-align: center;
  vertical-align: middle;
  cursor: pointer;
  pointer-events: auto;
}

.box-card {
  flex: 3;
  height: 100%;
  overflow: hidden;
  pointer-events: auto;
}

::v-deep .my-drawer {
  background: rgba(0,0,0,0);
  box-shadow: none;
}

::v-deep .my-drawer .el-drawer__body {
  height: 100%;
}

.sidebar-content-container {
   flex: 1 1 auto;
}

</style>
