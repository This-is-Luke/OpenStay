<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1>Explore Places</h1>
      <button @click="showBookingsModal = true">View Bookings</button>
    </header>
    
    <p class="subtitle">Find your next adventure with Sol-BnB.</p>

    <div v-if="listings.length" class="listings-grid">
      <router-link v-for="(listing, index) in listings" 
                   :key="listing.id" 
                   :to="{ name: 'listing-detail', params: { id: listing.id } }" 
                   class="listing-link"
                   :style="{ animationDelay: (index * 0.1) + 's' }">
        <div class="listing-card card">
          <img :src="listing.images[0]" alt="Listing image" class="listing-image">
          <div class="listing-info">
            <h3>{{ listing.title }}</h3>
            <p>{{ listing.description }}</p>
            <div class="listing-details">
              <span class="price">S{{ listing.price }} / night</span> 
              <span class="rating">★ {{ listing.rating }}</span>
            </div>
          </div>
        </div>
      </router-link>
    </div>
    <div v-else>
      <p>No listings available.</p>
    </div>

    <Modal :show="showBookingsModal" @close="showBookingsModal = false">
      <h2>Your Bookings</h2>
      <p>This is where your bookings information will be displayed.</p>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import Modal from '@/components/Modal.vue'
import { listings } from '@/data/listings'

const showBookingsModal = ref(false)
</script>

<style scoped>
.dashboard-container {
  padding: 2rem;
  animation: fadeIn 0.5s var(--transition-ease);
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.subtitle {
  margin-bottom: 2rem;
  color: var(--text-color);
  opacity: 0.8;
}

.listing-link {
  text-decoration: none;
  color: inherit;
  display: block;
  animation: fadeIn 0.5s var(--transition-ease) forwards;
  opacity: 0;
}

.listings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 2rem;
}

.listing-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-white);
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: transform 0.2s;
}

.listing-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  border-radius: 16px 16px 0 0;
}

.listing-card:hover {
  transform: translateY(-5px);
}

.listing-info {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.listing-info h3 {
  margin-bottom: 0.5rem;
}

.listing-details {
  margin-top: auto;
  padding-top: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-family: var(--font-secondary);
}

.price {
  font-weight: bold;
  color: var(--primary-color);
  font-size: 1.1rem;
}

.rating {
  font-weight: bold;
  color: var(--secondary-color);
}
</style>
