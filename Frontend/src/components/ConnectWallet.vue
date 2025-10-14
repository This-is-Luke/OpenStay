<template>
  <div>
    <button v-if="!publicKey" @click="connect">Connect Wallet</button>
    <button v-else @click="disconnect">Disconnect</button>
    <p v-if="publicKey">Connected: {{ publicKey.toBase58() }}</p>
  </div>
</template>

<script setup lang="ts">
import { useWalletStore } from '@/stores/wallet';
import { storeToRefs } from 'pinia';

const walletStore = useWalletStore();
const { publicKey } = storeToRefs(walletStore);
const { connect, disconnect } = walletStore;
</script>
