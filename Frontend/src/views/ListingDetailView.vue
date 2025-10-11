<template>
  <div class="listing-detail-container card" v-if="listing">
    <router-link to="/dashboard" class="back-link">&larr; Back to Listings</router-link>
    <div class="gallery">
      <img :src="listing.images[0]" :alt="listing.title" class="main-image">
    </div>
    <div class="details">
      <div class="header">
        <h1>{{ listing.title }}</h1>
        <div class="meta">
          <span class="price">S{{ listing.price }} / night</span>
          <span class="rating">★ {{ listing.rating }}</span>
        </div>
      </div>
      <p class="host">Hosted by: {{ listing.host.name }}</p>
      <p class="description">{{ listing.details }}</p>
      
      <div class="tabs">
        <button class="tab-button" :class="{ active: activeTab === 'reviews' }" @click="activeTab = 'reviews'">Reviews</button>
        <button class="tab-button" :class="{ active: activeTab === 'availability' }" @click="activeTab = 'availability'">Availability</button>
        <button class="tab-button" :class="{ active: activeTab === 'restrictions' }" @click="activeTab = 'restrictions'">Restrictions</button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'reviews'">
          <h2>Reviews</h2>
          <div v-for="(review, index) in listing.reviews" :key="index" class="review card">
            <p><strong>{{ review.author }}</strong></p>
            <p>{{ review.comment }}</p>
          </div>
        </div>
        <div v-if="activeTab === 'availability'">
          <h2>Availability</h2>
          <ul class="availability-list">
            <li v-for="(range, index) in listing.availability" :key="index">
              {{ new Date(range.start).toLocaleDateString() }} - {{ new Date(range.end).toLocaleDateString() }}
            </li>
          </ul>
        </div>
        <div v-if="activeTab === 'restrictions'">
          <h2>Restrictions</h2>
          <ul class="restrictions-list">
            <li v-for="(restriction, index) in listing.restrictions" :key="index">
              {{ restriction }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <p>Loading listing details...</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { listings, type Listing } from '@/data/listings'

const route = useRoute()
const listing = ref<Listing | undefined>(undefined)
const activeTab = ref('reviews')

onMounted(() => {
  const listingId = parseInt(route.params.id as string)
  listing.value = listings.value.find(l => l.id === listingId)
})
</script>

<style scoped>
.listing-detail-container {
  padding: 2rem;
  animation: fadeIn 0.5s var(--transition-ease);
  position: relative;
}

.back-link {
  position: absolute;
  top: 1rem;
  left: 1rem;
  font-family: var(--font-secondary);
}

.gallery {
  margin-bottom: 2rem;
}

.gallery .main-image {
  width: 100%;
  border-radius: 16px;
  box-shadow: 0 8px 24px var(--shadow-color);
}

.details .header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.details .meta {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 1.1rem;
  font-family: var(--font-secondary);
}

.price {
  font-weight: bold;
  color: var(--primary-color);
}

.rating {
  font-weight: bold;
  color: var(--secondary-color);
}

.host {
  font-style: italic;
  margin-bottom: 1.5rem;
}

.description {
  margin-bottom: 2rem;
}

.tabs {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
}

.tab-button {
  padding: 1rem;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 1rem;
  font-family: var(--font-primary);
  color: var(--text-color);
  opacity: 0.7;
  position: relative;
  transition: opacity var(--transition-speed) var(--transition-ease);
}

.tab-button::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 100%;
  height: 2px;
  background-color: var(--secondary-color);
  transform: scaleX(0);
  transition: transform var(--transition-speed) var(--transition-ease);
}

.tab-button:hover,
.tab-button.active {
  opacity: 1;
}

.tab-button.active::after {
  transform: scaleX(1);
}

.tab-content h2 {
    margin-bottom: 1.5rem;
}

.review {
  margin-bottom: 1rem;
  padding: 1rem;
}

.availability-list, .restrictions-list {
  list-style: none;
  padding-left: 0;
}

.availability-list li, .restrictions-list li {
  background: var(--surface-color);
  padding: 0.75rem 1.25rem;
  border-radius: 8px;
  margin-bottom: 0.5rem;
  border: 1px solid var(--border-color);
}

@media (min-width: 1024px) {
  .listing-detail-container {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
  }
}
</style>
