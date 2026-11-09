import { useRef, useEffect, useState, type DependencyList } from 'react'

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
  reload: () => void
}

/**
 * Carga asíncrona con cancelación al desmontar o cambiar dependencias.
 * `reload` fuerza una nueva consulta (por ejemplo, después de guardar).
 */
export function useData<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    loaderRef.current()
      .then((result) => {
        if (!cancelled) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((reason: unknown) => {
        if (!cancelled) {
          setError(reason instanceof Error ? reason.message : 'No fue posible cargar los datos')
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [...deps, version])

  return { data, loading, error, reload: () => setVersion((current) => current + 1) }
}

/** Selección múltiple por ID para tablas con acciones masivas. */
export function useSelection() {
  const [ids, setIds] = useState<number[]>([])

  return {
    ids,
    has: (id: number) => ids.includes(id),
    toggle: (id: number) =>
      setIds((current) =>
        current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      ),
    toggleAll: (all: number[]) =>
      setIds((current) =>
        all.length > 0 && all.every((id) => current.includes(id)) ? [] : all
      ),
    clear: () => setIds([])
  }
}
