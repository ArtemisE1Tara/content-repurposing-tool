"use client"

import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"
import { AnimatePresence, motion } from "framer-motion"

export function Toaster() {
  const { toasts, dismissToast } = useToast()

  return (
    <div className="fixed top-0 right-0 z-50 flex flex-col gap-2 w-full max-w-sm p-4">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="bg-card border rounded-lg shadow-lg p-4 relative"
          >
            <button
              onClick={() => dismissToast(toast.id)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex flex-col gap-1">
              <h3 className="font-medium">{toast.title}</h3>
              {toast.description && <p className="text-sm text-muted-foreground">{toast.description}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}

