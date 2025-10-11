<template>
  <Transition name="modal">
    <div v-if="show" class="modal-overlay" @click.self="close">
      <div class="modal-content card">
        <button class="close-button" @click="close">&times;</button>
        <slot></slot>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
interface Props {
  show: boolean
}

const props = defineProps<Props>()
const emit = defineEmits(['close'])

const close = () => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(5px);
}

.modal-content {
  background-color: var(--surface-color);
  padding: 2rem;
  border-radius: 16px;
  position: relative;
  min-width: 300px;
  max-width: 500px;
  width: 90%;
}

.close-button {
  position: absolute;
  top: 15px;
  right: 15px;
  border: none;
  background: none;
  font-size: 2rem;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.7;
  transition: opacity var(--transition-speed) var(--transition-ease), transform var(--transition-speed) var(--transition-ease);
}

.close-button:hover {
  opacity: 1;
  transform: rotate(90deg);
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity var(--transition-speed) var(--transition-ease);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform var(--transition-speed) var(--transition-ease);
}

.modal-enter-from .modal-content {
  transform: translateY(-20px);
}

.modal-leave-to .modal-content {
  transform: translateY(-20px);
}
</style>
