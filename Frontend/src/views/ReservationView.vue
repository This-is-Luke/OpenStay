<template>
  <div class="reservation-container" v-if="listing">
    <h1>Reserve {{ listing.title }}</h1>
    <div class="reservation-grid">
      <div class="calendar-section">
        <h2>Select Dates</h2>
        <DatePicker v-model:value="selectedDates" range />
      </div>
      <div class="booking-form-section">
        <h2>Confirm Booking</h2>
        <!-- Booking form will go here -->
        <p>Booking form placeholder</p>
        <button @click="reserve">Reserve Now</button>
      </div>
    </div>
    <ConfirmationModal 
      :show="showConfirmationModal" 
      :listing="listing" 
      :dates="formattedDates"
      @close="showConfirmationModal = false"
      @confirm="handleConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useListingsStore } from '@/stores/listings'
import { storeToRefs } from 'pinia'
import DatePicker from 'vue-datepicker-next';
import 'vue-datepicker-next/index.css';
import ConfirmationModal from '@/components/ConfirmationModal.vue'
import { ref, computed } from 'vue';
import { useWalletStore } from '@/stores/wallet'
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';

const route = useRoute()
const listingsStore = useListingsStore()
const { currentListing: listing } = storeToRefs(listingsStore)
const showConfirmationModal = ref(false)
const selectedDates = ref<Date[]>([])

const formattedDates = computed(() => {
  if (selectedDates.value && selectedDates.value.length === 2) {
    const [start, end] = selectedDates.value;
    if (start && end) {
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
    }
  }
  return ''
})

const walletStore = useWalletStore()
const { publicKey } = storeToRefs(walletStore)

onMounted(() => {
  const listingId = route.params.id as string
  listingsStore.fetchListingById(listingId)
})

const reserve = () => {
  showConfirmationModal.value = true
}

const handleConfirm = async () => {
  if (!listing.value || !publicKey.value || selectedDates.value.length !== 2) {
    alert('Please select dates and connect your wallet.')
    return
  }

  showConfirmationModal.value = false
  
  try {
    // Connect to Solana devnet
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

    // For simplicity, let's assume the listing owner's public key is hardcoded or fetched
    // In a real application, this would come from the listing data
    const receiverPublicKey = new PublicKey(listing.value.hostPublicKey); 
    const amountInSol = 1; // 1 SOL as requested
    const amountInLamports = amountInSol * LAMPORTS_PER_SOL;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey.value,
        toPubkey: receiverPublicKey,
        lamports: amountInLamports,
      })
    );

    // Get the latest blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = publicKey.value;


    if (walletStore.phantomWallet && walletStore.phantomWallet.isConnected) {
        // Sign and send the transaction using Phantom
        const signedTransaction = await walletStore.phantomWallet.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTransaction.serialize());
        await connection.confirmTransaction(signature);
        alert(`Transaction successful with signature: ${signature}`);
    } else {
        alert('Phantom wallet is not connected.');
        return;
    }


    const response = await fetch(`http://localhost:3001/api/listings/${listing.value.id}/reserve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Include Authorization header if needed
        // 'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        guestPublicKey: publicKey.value.toBase58(),
        checkIn: selectedDates.value[0],
        checkOut: selectedDates.value[1]
      })
    });

    const data = await response.json();

    if (data.success) {
      // The backend returns transaction details. The next step would be to
      // use the Solana wallet adapter to sign and send the transaction.
      console.log('Transaction details:', data);
      alert('Reservation initiated! Please sign the transaction in your wallet.');
    } else {
      alert(`Reservation failed: ${data.message}`);
    }
  } catch (error) {
    console.error('Reservation error:', error);
    alert('An unexpected error occurred during reservation.');
  }
}
</script>

<style scoped>
.reservation-container {
  padding: 2rem;
}
.reservation-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 2rem;
}
</style>
