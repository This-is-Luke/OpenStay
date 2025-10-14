import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Connection, PublicKey } from '@solana/web3.js';

type PhantomProvider = {
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  isPhantom: boolean;
};

const getProvider = (): PhantomProvider | undefined => {
  if ('solana' in window) {
    const provider = window.solana as any;
    if (provider.isPhantom) {
      return provider;
    }
  }
};

export const useWalletStore = defineStore('wallet', () => {
  const provider = getProvider();
  const publicKey = ref<PublicKey | null>(null);

  const connect = async () => {
    if (!provider) {
      alert("Phantom wallet not found. Please install it.");
      return;
    }
    try {
      const resp = await provider.connect();
      publicKey.value = resp.publicKey;
    } catch (err) {
      console.error('Failed to connect to wallet:', err);
      alert('Failed to connect to wallet.');
    }
  };

  const disconnect = async () => {
    if (provider) {
      await provider.disconnect();
      publicKey.value = null;
    }
  };

  return {
    publicKey,
    connect,
    disconnect,
  };
});
