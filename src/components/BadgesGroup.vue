<template>
  <div v-if="categories['All'].size > 1" class="container"  ref="container">
    <div>
      View data types:
    </div>
    <template v-for="(item, key) in categories" >
      <el-button
        v-if="item.size > 0"
        :class="[{ 'active': key == active},'tag-button']"
        @click="categoryClicked(key)"
        size="small" :key="key">{{ key + " (" + item.size + ")" }}
      </el-button>
    </template>
  </div>
</template>


<script>
/* eslint-disable no-alert, no-console */
import Vue from "vue";
import { Button } from "element-ui";
import lang from "element-ui/lib/locale/lang/en";
import locale from "element-ui/lib/locale";

locale.use(lang);
Vue.use(Button);

export default {
  name: "BadgesGroup",
  props: {
    /**
     * Object containing information for
     * the required viewing.
     */
    additionalLinks: {
      type: Array,
      default: () => {
        return [];
      },
    },
    datasetBiolucida: {
      type: Object,
      default: () => {
        return {};
      },
    },
    entry:  {
      type: Object,
      default: () => {
        return {};
      },
    },
  },
  data: function () {
    return {
      //Always start with 1 image - the dataset thumbnail itself
      categories: { "All": {size: 1}, "Dataset": {size: 1} },
      active: "All"
    };
  },
  methods: {
    addToCategories: function (array, name) {
      if (array && array.length > 0) {
        this.categories[name] = { size: array.length };
        this.categories["All"].size += array.length;
      }
    },
    addSimulationsToCategories: function (array) {
      if (array && array.length > 0) {
        const size = 1;
        this.categories["Simulations"] = { size };
        this.categories["All"].size += size;
      }
    },
    categoryClicked: function(name) {
      this.active = name;
      this.$emit("categoryChanged", name);
    },
    resetCategory: function() {
      this.categories = { All: { size: 1 }, Dataset: { size: 1 } };
    },
  },
  watch: {
    datasetBiolucida: {
      deep: true,
      immediate: true,
      handler: function (biolucidaData) {
        if ("dataset_images" in biolucidaData) {
          this.addToCategories(biolucidaData["dataset_images"], "Images");
        }
      }
    },
    entry: {
      deep: true,
      immediate: true,
      handler: function () {
        this.resetCategory();
        this.addToCategories(this.entry.scaffolds, 'Scaffolds');
        this.addToCategories(this.entry.segmentation, 'Segmentations');
        this.addToCategories(this.entry.plots, 'Plots');
        this.addSimulationsToCategories(this.entry.simulation);
        /** disable the following
        this.addToCategories(this.entry.images, 'Images');
        this.addToCategories(this.entry.videos, 'Videos');
        **/
      }
    }
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped lang="scss">
@import "~element-ui/packages/theme-chalk/src/button";

.tag-button,
.tag-button:hover,
.tag-button:focus,
.tag-button.active
{
  border-radius: 4px;
  font-size: 0.75rem;
  padding: 0.2rem 0.2rem;
  margin: 0.5rem 0 0 0;
  margin-right: 0.75rem!important;
}

.tag-button,
.tag-button:hover,
.tag-button:focus
{
  background: #f9f2fc;
  border: 1px solid $app-primary-color;
  color: $app-primary-color;
}

.tag-button.active
{
  background: $app-primary-color;
  border: 1px solid $app-primary-color;
  color: #fff;
}

.tag-button+.tag-button
{
  margin-left:0;
}
</style>
