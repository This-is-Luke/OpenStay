<template>
  <div class="login-container">
    <form @submit.prevent="login">
      <h1>Login</h1>
      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" type="email" placeholder="Email" v-model="email" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" type="password" placeholder="Password" v-model="password" />
      </div>
      <button type="submit">Login</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const email = ref('')
const password = ref('')
const router = useRouter()
const authStore = useAuthStore()

const login = async () => {
  const success = await authStore.login(email.value, password.value)
  if (success) {
    router.push('/dashboard')
  } else {
    alert('Login failed')
  }
}
</script>

<style scoped>
.login-container {
  max-width: 400px;
  margin: 2rem auto;
  padding: 2rem;
  border: 1px solid #ccc;
  border-radius: 8px;
}
</style>
