<script setup lang="ts">
import { ref } from 'vue'
import GenericConfigList from './GenericConfigList.vue'
import GenericConfigHistory from './GenericConfigHistory.vue'

const activeTab = ref<'list' | 'history'>('list')
</script>

<template>
  <div class="generic-config-page">
    <el-tabs v-model="activeTab" class="config-tabs">
      <el-tab-pane label="配置列表" name="list">
        <GenericConfigList v-if="activeTab === 'list'" />
      </el-tab-pane>
      <el-tab-pane label="变更历史" name="history">
        <GenericConfigHistory v-if="activeTab === 'history'" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.generic-config-page {
  padding: 16px 20px;
}

.config-tabs {
  --el-tabs-header-height: 48px;
}
</style>
