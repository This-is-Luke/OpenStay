<template>
  <div class="dashboard-container">
    <header class="dashboard-header">
      <h1>Explore Places</h1>
    </header>
    
    <p class="subtitle">Find your next adventure with OpenStay.</p>

    <div v-if="listings.length" class="listings-grid">
      <div v-for="(listing, index) in listings" 
           :key="listing.id" 
           class="listing-card-wrapper"
           :style="{ animationDelay: (index * 0.1) + 's' }">
        <div class="listing-card card">
          <router-link :to="{ name: 'listing-detail', params: { id: listing.id } }">
            <img :src="listing.images[0]" alt="Listing image" class="listing-image">
            <div class="listing-info">
              <h3>{{ listing.title }}</h3>
              <div class="listing-details">
                <span class="price">${{ listing.price_per_night }} / night</span>
              </div>
            </div>
          </router-link>
          <router-link :to="{ name: 'reservation', params: { id: listing.id } }" class="reserve-button">Reserve</router-link>
        </div>
      </div>
    </div>
    <div v-else>
      <p>No listings available.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useListingsStore } from '@/stores/listings'
import { storeToRefs } from 'pinia'

const listingsStore = useListingsStore()
const { listings } = storeToRefs(listingsStore)

onMounted(() => {
  listingsStore.fetchListings()
})
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

.listing-card-wrapper {
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
  padding: 0; /* Remove padding to let image and info fill */
  border-radius: 16px; /* Rounded corners for the whole card */
  box-shadow: 0 4px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s, box-shadow 0.2s;
  overflow: hidden; /* Ensures child elements conform to border-radius */
}

.listing-card a {
  text-decoration: none;
  color: inherit;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.listing-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
}

.listing-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 6px 12px rgba(0,0,0,0.15);
}

.listing-info {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
}

.listing-info h3 {
  margin-bottom: 0.5rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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

.reserve-button {
  margin: 1rem;
  padding: 0.75rem 1rem;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.reserve-button:hover {
  background-color: var(--primary-color-dark);
}
</style>
