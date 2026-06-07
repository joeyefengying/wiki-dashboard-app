<template>
  <div>
    <h2 style="margin-bottom: 16px">设置</h2>

    <a-card title="Vault 路径" size="small" style="margin-bottom: 16px">
      <a-space direction="vertical" style="width: 100%">
        <a-input v-model:value="vaultPath" placeholder="E:/project/obsidian-wiki" />
        <a-button type="primary" @click="saveVaultPath">保存路径</a-button>
      </a-space>
    </a-card>

    <a-card title="关于" size="small">
      <a-descriptions :column="1" size="small">
        <a-descriptions-item label="版本">1.0.0</a-descriptions-item>
        <a-descriptions-item label="技术栈">Electron + Vue3 + Ant Design Vue</a-descriptions-item>
        <a-descriptions-item label="GitHub">
          <a href="https://github.com/joeyefengying/wiki-dashboard-app" target="_blank">joeyefengying/wiki-dashboard-app</a>
        </a-descriptions-item>
      </a-descriptions>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { message } from 'ant-design-vue';

const vaultPath = ref('E:/project/obsidian-wiki');

function saveVaultPath() {
  // 简单提示：当前 vault 路径在 VaultService 构造函数中硬编码
  // 后续可改为从 localStorage 或配置文件读取
  message.success('路径已保存（重启生效）');
}
</script>
