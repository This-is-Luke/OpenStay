<template>
  <div class="registration-container">
    <form @submit.prevent="register">
      <h1>Create Account</h1>
      <p class="subtitle">Join Open Stay today!</p>
      <div class="form-grid">
        <div class="form-group">
          <label for="name">Name</label>
          <input id="name" type="text" placeholder="Name" v-model="name" />
        </div>
        <div class="form-group">
          <label for="surname">Surname</label>
          <input id="surname" type="text" placeholder="Surname" v-model="surname" />
        </div>
      </div>
      <div class="form-group">
        <label for="email">Email</label>
        <input id="email" type="email" placeholder="Email" v-model="email" />
      </div>
      <div class="form-group">
        <label for="password">Password</label>
        <input id="password" type="password" placeholder="Password" v-model="password" />
      </div>
      <button type="submit">Create Account</button>
      <p class="login-link">
        Already have an account? <router-link to="/login">Login</router-link>
      </p>
    </form>
    <Modal :show="showSuccessModal" @close="redirectToDashboard">
      <h2>Registration Successful!</h2>
      <p>Welcome to Open Stay. You will be redirected to the dashboard.</p>
      <button @click="redirectToDashboard">Go to Dashboard</button>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Modal from '@/components/Modal.vue'

const name = ref('')
const surname = ref('')
const email = ref('')
const password = ref('')
const showSuccessModal = ref(false)

const router = useRouter()

const register = async () => {
  // // Temporarily bypass registration for local development
  // console.log('Bypassing registration for development purposes.');
  // showSuccessModal.value = true;
  // Optionally, you can add a small delay to simulate network latency if needed
  // await new Promise(resolve => setTimeout(resolve, 500));
  // return; // Exit the function after bypass

  try {
    const response = await fetch('http://localhost:3001/api/auth/sign-up', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        firstName: name.value,
        lastName: surname.value,
        email: email.value,
        password: password.value
      })
    })

    const data = await response.json()

    if (data.success) {
      showSuccessModal.value = true
    } else {
      // implement more sophisticated error handling here
      alert(`Registration failed: ${data.message}`)
    }
  } catch (error) {
    console.error('An error occurred during registration:', error)
    alert('An unexpected error occurred. Please try again.')
  }
}

const redirectToDashboard = () => {
  showSuccessModal.value = false
  router.push('/dashboard')
}
</script>

<style scoped>
.registration-container {
  max-width: 500px;
  margin: 2rem auto;
}

h1 {
  text-align: center;
}

.subtitle {
  text-align: center;
  margin-bottom: 2rem;
  color: var(--text-color);
  opacity: 0.8;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  font-family: var(--font-secondary);
}

button {
    width: 100%;
    margin-top: 1rem;
}
</style>
