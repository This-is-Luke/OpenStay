<template>
  <Modal :show="show" @close="close">
    <h2>Confirm your Reservation</h2>
    <div v-if="listing">
      <p><strong>Property:</strong> {{ listing.title }}</p>
      <p><strong>Dates:</strong> {{ dates }}</p>
      <p><strong>Total Price:</strong> ${{ totalPrice }}</p>
    </div>
    <button @click="publicKey ? confirm() : connect()" :disabled="!publicKey">
      {{ publicKey ? 'Confirm and Pay' : 'Connect Wallet to Pay' }}
    </button>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { computed } from 'vue'
import type { Listing } from '@/stores/listings'
import { useWalletStore } from '@/stores/wallet'

const props = defineProps<{
  show: boolean,
  listing: Listing | null,
  dates: string
}>()

const emit = defineEmits(['close', 'confirm'])

const walletStore = useWalletStore()
const { publicKey, connect } = walletStore;

const totalPrice = computed(() => {
  if (!props.listing || !props.dates) return 0
  // Simplified price calculation
  const nights = 1 // Replace with actual night calculation
  return nights * props.listing.price_per_night
})

const close = () => emit('close')
const confirm = () => emit('confirm')
</script>
