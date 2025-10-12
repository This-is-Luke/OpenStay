import { ref } from 'vue'

export interface Listing {
  id: number
  title: string
  description: string
  price: number
  images: string[]
  rating: number
  reviews: { author: string; comment: string }[]
  details: string
  availability: { start: string; end: string }[]
  location: { lat: number; lng: number }
  host: { name: string; avatar: string }
  restrictions: string[]
}

export const listings = ref<Listing[]>([
  {
    id: 1,
    title: 'Cozy Beachfront Cottage',
    description: 'A beautiful cottage right on the beach.',
    price: 150,
    images: ['/assets/11.jpg'],
    rating: 4.5,
    reviews: [{ author: 'Jane Doe', comment: 'Absolutely wonderful stay!' }],
    details: '2 bedrooms, 1 bathroom, fully equipped kitchen.',
    availability: [{ start: '2025-11-01', end: '2025-11-15' }],
    location: { lat: 34.0522, lng: -118.2437 },
    host: { name: 'John Smith', avatar: 'https://via.placeholder.com/50' },
    restrictions: ['No pets', 'No smoking']
  },
  {
    id: 2,
    title: 'Modern Downtown Loft',
    description: 'Stylish loft in the heart of the city.',
    price: 200,
    images: ['/assets/22.jpg'],
    rating: 4.8,
    reviews: [{ author: 'Peter Pan', comment: 'Great location and very clean.' }],
    details: '1 bedroom studio, 1 bathroom, great city views.',
    availability: [{ start: '2025-12-01', end: '2025-12-20' }],
    location: { lat: 40.7128, lng: -74.0060 },
    host: { name: 'Mary Jane', avatar: 'https://via.placeholder.com/50' },
    restrictions: ['No loud parties']
  },
  {
    id: 3,
    title: 'Rustic Mountain Cabin',
    description: 'Escape to this peaceful cabin in the mountains.',
    price: 100,
    images: ['/assets/33.jpg'],
    rating: 4.2,
    reviews: [{ author: 'Happy Camper', comment: 'Perfect getaway!' }],
    details: '3 bedrooms, 2 bathrooms, fireplace and hot tub.',
    availability: [{ start: '2025-10-20', end: '2025-11-05' }],
    location: { lat: 39.5501, lng: -105.7821 },
    host: { name: 'Bob Ross', avatar: 'https://via.placeholder.com/50' },
    restrictions: ['4x4 vehicle recommended in winter']
  },
  {
    id: 4,
    title: 'Luxury Villa with Pool',
    description: 'A stunning villa with a private pool and ocean views.',
    price: 350,
    images: ['/assets/44.jpg'],
    rating: 4.9,
    reviews: [{ author: 'Richie Rich', comment: 'Absolutely breathtaking!' }],
    details: '4 bedrooms, 4 bathrooms, infinity pool, private chef.',
    availability: [{ start: '2026-01-10', end: '2026-01-25' }],
    location: { lat: 25.7617, lng: -80.1918 },
    host: { name: 'Gatsby', avatar: 'https://via.placeholder.com/50' },
    restrictions: ['No pets']
  },
  {
    id: 5,
    title: 'Charming Countryside Farmhouse',
    description: 'A peaceful retreat in the rolling hills of the countryside.',
    price: 120,
    images: ['/assets/55.jpg'],
    rating: 4.6,
    reviews: [{ author: 'Nature Lover', comment: 'So peaceful and beautiful.' }],
    details: '3 bedrooms, 2 bathrooms, large garden, fresh eggs from chickens.',
    availability: [{ start: '2025-11-10', end: '2025-11-25' }],
    location: { lat: 51.5074, lng: -0.1278 },
    host: { name: 'Old McDonald', avatar: 'https://via.placeholder.com/50' },
    restrictions: ['Respect the animals']
  }
])
