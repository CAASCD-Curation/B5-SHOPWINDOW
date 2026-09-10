<template>
  <main class="about">
    <h1>关于本演示</h1>
    <p>这是通过官方 create-vue 生成的脚手架，并在此基础上接入了 Vue Router 与 Pinia。</p>
    <ul>
      <li>路由：首页 / 关于（关于页为懒加载）</li>
      <li>状态管理：Pinia 计数器 store</li>
      <li>语言：Vue 3 + TypeScript</li>
    </ul>
  </main>
</template>

<style scoped>
.about {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

ul {
  line-height: 2;
}
</style>
