import { reactive } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastItem {
  id: number
  type: ToastType
  message: string
}

const state = reactive<{ items: ToastItem[] }>({ items: [] })
let _id = 0

function push(message: string, type: ToastType, duration = 3000) {
  const id = ++_id
  state.items.push({ id, message, type })
  setTimeout(() => {
    const idx = state.items.findIndex(t => t.id === id)
    if (idx >= 0)
      state.items.splice(idx, 1)
  }, duration)
}

export const toast = {
  items: state.items,
  success: (msg: string, d?: number) => push(msg, 'success', d),
  error: (msg: string, d?: number) => push(msg, 'error', d),
  warning: (msg: string, d?: number) => push(msg, 'warning', d),
  info: (msg: string, d?: number) => push(msg, 'info', d),
}
