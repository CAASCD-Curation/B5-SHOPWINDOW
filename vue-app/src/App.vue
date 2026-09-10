<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header class="nav">
    <img alt="Vue logo" class="logo" src="./assets/logo.svg" width="40" height="40" />
    <nav>
      <RouterLink to="/">首页</RouterLink>
      <RouterLink to="/about">关于</RouterLink>
    </nav>
  </header>

  <RouterView />
</template>

<style scoped>
.nav {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1rem;
}

nav {
  display: flex;
  gap: 1.5rem;
  font-size: 1.05rem;
}

nav a {
  color: #2c3e50;
  text-decoration: none;
}

nav a.router-link-exact-active {
  color: #42b883;
  font-weight: 600;
}
</style>
