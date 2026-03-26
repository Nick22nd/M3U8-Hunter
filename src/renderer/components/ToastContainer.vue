<script setup lang="ts">
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-vue-next'
import { toast } from '../composables/toast'
</script>

<template>
  <teleport to="body">
    <div class="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none w-80">
      <transition-group name="toast">
        <div
          v-for="item in toast.items"
          :key="item.id"
          class="flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-auto"
          :class="{
            'bg-green-500 text-white': item.type === 'success',
            'bg-red-500 text-white': item.type === 'error',
            'bg-amber-500 text-white': item.type === 'warning',
            'bg-blue-500 text-white': item.type === 'info',
          }"
        >
          <CheckCircle v-if="item.type === 'success'" :size="15" class="shrink-0" />
          <XCircle v-else-if="item.type === 'error'" :size="15" class="shrink-0" />
          <AlertTriangle v-else-if="item.type === 'warning'" :size="15" class="shrink-0" />
          <Info v-else :size="15" class="shrink-0" />
          <span class="min-w-0 break-words">{{ item.message }}</span>
        </div>
      </transition-group>
    </div>
  </teleport>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from,
.toast-leave-to { opacity: 0; transform: translateX(0.75rem); }
</style>
