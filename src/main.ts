import { createApp } from 'vue';
import { createPinia } from 'pinia';
import Antd from 'ant-design-vue';
import { message } from 'ant-design-vue';
import 'ant-design-vue/dist/reset.css';
import App from './App.vue';
import router from './router';

// 检查 electronAPI 是否就绪
setTimeout(() => {
  if (!(window as any).electronAPI) {
    console.error('[Wiki Dashboard] electronAPI 未挂载！preload 可能加载失败。');
    message?.error('IPC 通信未就绪，请重启应用');
  } else {
    console.log('[Wiki Dashboard] electronAPI 就绪', Object.keys((window as any).electronAPI.vault));
  }
}, 500);

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.use(Antd);
app.mount('#app');
