<template>
  <Modal :show="show" @close="close">
    <h2>My Bookings</h2>
    <ul>
      <li v-for="booking in bookings" :key="booking.id">
        <div>
          <p><strong>{{ booking.propertyName }}</strong></p>
          <p>{{ booking.dates }}</p>
        </div>
        <button @click="openReviewModal(booking.id)">Leave a Review</button>
      </li>
    </ul>
  </Modal>
  <LeaveReviewModal :show="showReviewModal" @close="showReviewModal = false" />
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { ref } from 'vue'
import LeaveReviewModal from './LeaveReviewModal.vue';

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])

const bookings = ref([
  { id: 1, propertyName: 'Cozy Beach House', dates: '10/15/2025 - 10/20/2025' },
  { id: 2, propertyName: 'Mountain Cabin', dates: '11/01/2025 - 11/05/2025' }
])

const close = () => emit('close')

const showReviewModal = ref(false)
const selectedBookingId = ref<number | null>(null)

const openReviewModal = (bookingId: number) => {
  selectedBookingId.value = bookingId
  showReviewModal.value = true
}
</script>

<style scoped>
ul {
  list-style: none;
  padding: 0;
}
li {
  border-bottom: 1px solid #eee;
  padding: 1rem 0;
}
</style>
