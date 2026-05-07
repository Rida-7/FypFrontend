import { useEffect, useRef } from 'react'

const INACTIVITY_MS = 5 * 60 * 1000

export default function useActivityLogout(onLogout) {
  const timer = useRef(null)

  function resetTimer() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      onLogout()
    }, INACTIVITY_MS)
  }

  useEffect(() => {
    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer))
    resetTimer()
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer))
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])
}
