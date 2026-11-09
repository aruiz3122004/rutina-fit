import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type ToastKind = 'success' | 'error' | 'info'
type Notify = (message: string, kind?: ToastKind) => void

interface Toast {
  id: number
  message: string
  kind: ToastKind
}

const ToastContext = createContext<Notify>(() => undefined)

export function useToast(): Notify {
  return useContext(ToastContext)
}

let sequence = 0

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback<Notify>((message, kind = 'info') => {
    const id = ++sequence
    setToasts((current) => [...current, { id, message, kind }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, 4_500)
  }, [])

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.kind}`}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
