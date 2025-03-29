"use client"

// Adapted from shadcn/ui toast
import { useState, useEffect, useCallback } from "react"

type ToastProps = {
  title: string
  description?: string
  duration?: number
}

export function toast(props: ToastProps) {
  const event = new CustomEvent("toast", {
    detail: props,
  })

  window.dispatchEvent(event)
}

export function useToast() {
  const [toasts, setToasts] = useState<(ToastProps & { id: string })[]>([])

  const addToast = useCallback((props: ToastProps) => {
    const id = Math.random().toString(36).substring(2, 9)
    setToasts((prev) => [...prev, { ...props, id }])

    if (props.duration !== Number.POSITIVE_INFINITY) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id))
      }, props.duration || 5000)
    }
  }, [])

  useEffect(() => {
    const handleToast = (e: Event) => {
      const { detail } = e as CustomEvent<ToastProps>
      addToast(detail)
    }

    window.addEventListener("toast", handleToast)
    return () => window.removeEventListener("toast", handleToast)
  }, [addToast])

  return {
    toasts,
    addToast,
    dismissToast: (id: string) => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
  }
}

