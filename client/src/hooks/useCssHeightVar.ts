import { useEffect, useRef } from 'react'

export function useCssHeightVar<T extends HTMLElement>(
  variableName: string,
  active = true,
) {
  const ref = useRef<T | null>(null)

  useEffect(() => {
    if (typeof document === 'undefined') {
      return
    }

    const root = document.documentElement

    if (!active) {
      root.style.setProperty(variableName, '0px')
      return
    }

    const element = ref.current
    if (!element) {
      root.style.setProperty(variableName, '0px')
      return
    }

    const updateHeight = () => {
      root.style.setProperty(
        variableName,
        `${Math.ceil(element.getBoundingClientRect().height)}px`,
      )
    }

    updateHeight()

    let resizeObserver: ResizeObserver | null = null

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(updateHeight)
      resizeObserver.observe(element)
    }

    window.addEventListener('resize', updateHeight)

    return () => {
      resizeObserver?.disconnect()
      window.removeEventListener('resize', updateHeight)
      root.style.setProperty(variableName, '0px')
    }
  }, [active, variableName])

  return ref
}
