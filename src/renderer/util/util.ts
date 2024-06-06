export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false,
): T {
  let timeout: NodeJS.Timeout | null
  return function (this: any, ...args: any[]) {
    // eslint-disable-next-line ts/no-this-alias
    const context = this
    const later = function () {
      timeout = null
      if (!immediate)
        func.apply(context, args)
    }
    const callNow = immediate && !timeout
    if (timeout)
      clearTimeout(timeout)

    timeout = setTimeout(later, wait)
    if (callNow)
      func.apply(context, args)
  } as T
}
