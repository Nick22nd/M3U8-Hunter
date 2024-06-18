export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait = 1000,
  immediate = false,
): T {
  let timeout: ReturnType<typeof setTimeout> | null
  return function (this: any, ...args: any[]) {
    const later = () => {
      timeout = null
      if (!immediate)
        func.apply(this, args)
    }
    const callNow = immediate && !timeout
    if (timeout)
      clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow)
      func.apply(this, args)
  } as T
}
