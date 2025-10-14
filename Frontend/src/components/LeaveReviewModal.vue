<template>
  <Modal :show="show" @close="close">
    <h2>Leave a Review</h2>
    <form @submit.prevent="submitReview">
      <div class="form-group">
        <label for="rating">Rating</label>
        <select id="rating" v-model="rating">
          <option>5</option>
          <option>4</option>
          <option>3</option>
          <option>2</option>
          <option>1</option>
        </select>
      </div>
      <div class="form-group">
        <label for="comment">Comment</label>
        <textarea id="comment" v-model="comment"></textarea>
      </div>
      <button type="submit">Submit Review</button>
    </form>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/Modal.vue'
import { ref } from 'vue'

defineProps<{
  show: boolean
}>()

const emit = defineEmits(['close'])

const rating = ref(5)
const comment = ref('')

const submitReview = () => {
  // Logic to submit the review
  alert(`Review submitted: ${rating.value} stars, "${comment.value}"`)
  close()
}

const close = () => emit('close')
</script>
