import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue')
    },
    {
      path: '/',
      name: 'register',
      component: () => import('../views/RegistrationView.vue')
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: () => import('../views/DashboardView.vue')
    },
    {
      path: '/listing/:id',
      name: 'listing-detail',
      component: () => import('../views/ListingDetailView.vue')
    },
    {
      path: '/reservation/:id',
      name: 'reservation',
      component: () => import('../views/ReservationView.vue')
    }
  ]
})

export default router
