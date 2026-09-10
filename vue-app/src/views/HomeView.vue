<script setup lang="ts">
import { useCounterStore } from '../stores/counter'

const counter = useCounterStore()
</script>

<template>
  <main class="home">
    <h1>Vue 3 脚手架演示</h1>
    <p class="desc">Vue 3 + Vite + TypeScript + Vue Router + Pinia</p>

    <div class="card">
      <h2>Pinia 计数器</h2>
      <p>当前计数：<strong>{{ counter.count }}</strong></p>
      <p>两倍值：<strong>{{ counter.doubleCount }}</strong></p>
      <button @click="counter.increment()">点我 +1</button>
    </div>
  </main>
</template>

<style scoped>
.home {
  max-width: 640px;
  margin: 0 auto;
  padding: 2rem 1rem;
  text-align: center;
}

.desc {
  color: #888;
  margin-bottom: 2rem;
}

.card {
  border: 1px solid #ddd;
  border-radius: 12px;
  padding: 2rem;
}

.card strong {
  color: #42b883;
  font-size: 1.25rem;
}

button {
  margin-top: 1rem;
  padding: 0.6rem 1.6rem;
  font-size: 1rem;
  color: #fff;
  background: #42b883;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

button:hover {
  background: #369f6e;
}
</style>
