<template>
  <div class="example">
    <header>
      <h3>Getting started</h3>
    </header>
    <p>smart-tagz has some great defaults for starters. Following is a very basic variant that takes a custom placeholder message.</p>
    <pre>
      <code class="lang-html">{{ code }}</code>
    </pre>
    <div class="sample-view">
      <smart-tagz v-model="content" input-placeholder="Select Countries ..." />
      {{content}}
    </div>
  </div>
</template>


<script lang="ts">
import SmartTagz from "../components/Main.vue";

import { defineComponent } from "vue";

export default defineComponent({
  name: "Basic",
  components: {
    SmartTagz,
  },
  data() {
    return {
      content: [],
      code: '<smart-tagz input-placeholder="Select Countries ..." />',
    };
  },
});
</script>
