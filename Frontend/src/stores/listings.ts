import { defineStore } from 'pinia'

export interface Listing {
  id: string;
  host_id: string;
  title: string;
  description?: string;
  property_type: string;
  address: string;
  city: string;
  state?: string;
  country: string;
  price_per_night: number;
  max_guests: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  images: string[];
  hostPublicKey: string;
  host?: {
    name: string;
  };
  details?: string;
  reviews?: any[];
  availability?: any[];
  restrictions?: any[];
}

export const useListingsStore = defineStore('listings', {
  state: () => ({
    listings: [] as Listing[],
    currentListing: null as Listing | null
  }),
  actions: {
    async fetchListings() {
      try {
        const response = await fetch('http://localhost:3001/api/properties/listings')
        const data = await response.json()
        if (data.success) {
          this.listings = data.data
        }
      } catch (error) {
        console.error('Failed to fetch listings:', error)
      }
    },
    async fetchListingById(id: string) {
      try {
        const response = await fetch(`http://localhost:3001/api/properties/listings/${id}`)
        const data = await response.json()
        if (data.success) {
          this.currentListing = data.data
        }
      } catch (error) {
        console.error(`Failed to fetch listing ${id}:`, error)
      }
    }
  }
})
