<template>
  <!-- 打组框虚拟入口节点（作为连接锚点，仅视觉标识用） | Group proxy anchor node -->
  <div class="group-proxy-node">
    <Handle type="target" :position="Position.Left" id="left" />
  </div>
</template>

<script setup>
import { Handle, Position } from '@vue-flow/core'
defineProps({ id: String, data: Object })
</script>

<style scoped>
.group-proxy-node {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(245, 158, 11, 0.55);
  border: 2px solid #f59e0b;
  box-shadow: 0 0 8px rgba(245, 158, 11, 0.4);
  cursor: default;
}
</style>
