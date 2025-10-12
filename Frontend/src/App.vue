<script setup lang="ts">
import { RouterLink, RouterView, useRoute } from 'vue-router'
import { ref } from 'vue'
import Modal from '@/components/Modal.vue'

const route = useRoute()
const showBookingsModal = ref(false)
</script>

<template>
  <header>
    <div class="header-container">
      <RouterLink to="/dashboard" class="logo">
        <img alt="Open Stay logo" src="../public/assets/openstaylogo.jpg" width="auto" height="42px" />
      </RouterLink>
      <nav>
        <RouterLink v-if="route.path !== '/'" to="/dashboard">Explore</RouterLink>
        <button v-if="route.path === '/dashboard'" @click="showBookingsModal = true" class="button-link">View Bookings</button>
        <RouterLink to="/" class="button">Logout</RouterLink>
      </nav>
    </div>
  </header>
  <main>
    <RouterView />
  </main>

  <Modal :show="showBookingsModal" @close="showBookingsModal = false">
    <h2>Your Bookings</h2>
    <p>This is where your bookings information will be displayed.</p>
  </Modal>
</template>

<style scoped>
header {
  background: var(--background-color-soft);
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border-color);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  font-family: var(--font-secondary);
  font-size: 1.2rem;
  text-decoration: none;
  color: var(--text-color);
}

nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

nav a, .button-link {
  text-decoration: none;
  color: var(--text-color-soft);
  transition: color 0.2s;
  font-weight: 500;
  background: none;
  border: none;
  font-size: inherit;
  font-family: inherit;
  cursor: pointer;
}

nav a:hover,
nav a.router-link-exact-active,
.button-link:hover {
  color: var(--primary-color);
}

nav a.button {
  background-color: var(--primary-color);
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  transition: background-color 0.2s;
}

nav a.button:hover {
  background-color: var(--primary-color-dark);
  color: white;
}

main {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}
</style>
