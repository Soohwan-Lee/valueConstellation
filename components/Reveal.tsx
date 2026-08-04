'use client'

import { useEffect, useRef } from 'react'

/**
 * Reveals its children as they scroll into view.
 *
 * The pending state is set from JavaScript rather than in the markup, so a
 * reader with no JavaScript, or with reduced motion on, gets the content
 * immediately instead of a permanently invisible page. Once shown, the element
 * is left alone — content that fades out again when scrolled past is a
 * distraction on a page somebody is reading rather than watching.
 */
export function Reveal({
  delay = 0,
  className = '',
  children,
}: {
  delay?: number
  className?: string
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (
      typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }

    node.dataset.reveal = 'pending'
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          node.style.transitionDelay = `${delay}ms`
          node.dataset.reveal = 'shown'
          observer.disconnect()
        }
      },
      // Fires a little before the element reaches the viewport, so the motion
      // has finished by the time it is where the reader is looking.
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [delay])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
