<template>
  <div>
    <button v-if="!publicKey" @click="connect">Connect Wallet</button>
    <button v-else @click="disconnect">Disconnect</button>
    <p v-if="publicKey">Connected: {{ publicKey.toBase58() }}</p>
  </div>
</template>

<script setup lang="ts">
import { useWalletStore } from '../stores/wallet';

const walletStore = useWalletStore();
const { publicKey } = walletStore; // Directly destructure, publicKey is already a ref
const connect = walletStore.connect;
const disconnect = walletStore.disconnect;
</script>
