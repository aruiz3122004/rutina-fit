import { useEffect, useState } from 'react'
import { formatDateTime } from '../../shared/format'
import type { RangeQuery, WhatsAppConfig } from '../../shared/types'
import { api } from '../api'
import { useToast } from '../components/Toast'
import { Badge, ErrorBanner, Field } from '../components/ui'
import { useData } from '../hooks'

const TODAY: RangeQuery = { preset: 'today' }

function fileSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

export default function SettingsPage() {
  const notify = useToast()
  const info = useData(() => api.backups.info(), [])
  const backups = useData(() => api.backups.list(), [])
  const config = useData(() => api.whatsapp.getConfig(), [])
  const preview = useData(() => api.whatsapp.preview(TODAY), [])

  const [form, setForm] = useState<WhatsAppConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [reason, setReason] = useState<string | null>(null)

  useEffect(() => {
    if (config.data) setForm(config.data)
  }, [config.data])

  const fail = (error: unknown) =>
    notify(error instanceof Error ? error.message : 'Ocurrió un error inesperado', 'error')

  const createBackup = async () => {
    try {
      const backup = await api.backups.create()
      backups.reload()
      notify(`Copia creada: ${backup.filename}`, 'success')
    } catch (error) {
      fail(error)
    }
  }

  const exportDatabase = async () => {
    try {
      const path = await api.backups.exportDatabase()
      if (path) notify(`Base exportada en ${path}`, 'success')
    } catch (error) {
      fail(error)
    }
  }

  const saveConfig = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form) return
    setSaving(true)
    try {
      const saved = await api.whatsapp.saveConfig(form)
      setForm(saved)
      config.reload()
      preview.reload()
      notify('Configuración de WhatsApp guardada', 'success')
    } catch (error) {
      fail(error)
    } finally {
      setSaving(false)
    }
  }

  const sendTest = async () => {
    setSending(true)
    setReason(null)
    try {
      const result = await api.whatsapp.send(TODAY)
      if (result.sent) {
        notify('Resumen enviado por WhatsApp', 'success')
      } else {
        setReason(result.reason ?? 'No fue posible enviar el mensaje')
        notify(result.reason ?? 'Usa el enlace de WhatsApp Web', 'info')
      }
    } catch (error) {
      fail(error)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="stack">
      <div className="page-intro">
        <div>
          <h2>Respaldos y WhatsApp</h2>
          <p>Los datos viven en SQLite local. Aquí se administran las copias y el envío diario.</p>
        </div>
        <div className="actions">
          <button type="button" className="btn btn-ghost btn-sm" onClick={createBackup}>
            Crear copia ahora
          </button>
          <button type="button" className="btn btn-primary btn-sm" onClick={exportDatabase}>
            Exportar base de datos
          </button>
        </div>
      </div>

      {info.error && <ErrorBanner message={info.error} />}

      <div className="grid-2">
        <section className="card">
          <header className="card-head">
            <h3>Ubicación de datos</h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => void api.backups.openFolder()}>
              Abrir carpeta
            </button>
          </header>
          {info.data ? (
            <dl className="info-list">
              <div>
                <dt>Base de datos</dt>
                <dd>
                  <code>{info.data.databasePath}</code>
                </dd>
              </div>
              <div>
                <dt>Respaldos</dt>
                <dd>
                  <code>{info.data.backupsDir}</code>
                </dd>
              </div>
              <div>
                <dt>Versión</dt>
                <dd>{info.data.version}</dd>
              </div>
            </dl>
          ) : (
            <p className="empty-state">Cargando información…</p>
          )}
        </section>

        <section className="card">
          <header className="card-head">
            <h3>Copias recientes</h3>
            <Badge tone="neutral">{backups.data?.length ?? 0}</Badge>
          </header>
          {backups.data && backups.data.length > 0 ? (
            <div className="table-wrap">
              <table className="table table-compact">
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Fecha</th>
                    <th className="num">Tamaño</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.data.map((backup) => (
                    <tr key={backup.path}>
                      <td title={backup.path}>{backup.filename}</td>
                      <td>{formatDateTime(backup.createdAt)}</td>
                      <td className="num">{fileSize(backup.size)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="empty-state">Aún no hay copias. Se crea una automáticamente cada mes.</p>
          )}
        </section>
      </div>

      <section className="card">
        <header className="card-head card-head-wrap">
          <div>
            <h3>WhatsApp del dueño</h3>
            <p className="card-subtitle">
              Con Cloud API el botón envía solo. Sin credenciales se usa el enlace wa.me.
            </p>
          </div>
          <Badge tone={preview.data?.configured ? 'ok' : 'warn'}>
            {preview.data?.configured ? 'Configurado' : 'Enlace manual'}
          </Badge>
        </header>

        {config.error && <ErrorBanner message={config.error} />}

        {form ? (
          <form className="form-grid" onSubmit={saveConfig}>
            <Field label="Nombre del negocio">
              <input
                value={form.businessName}
                maxLength={60}
                onChange={(event) => setForm({ ...form, businessName: event.target.value })}
              />
            </Field>
            <Field label="WhatsApp del dueño" hint="Celular colombiano de 10 dígitos o formato internacional.">
              <input
                value={form.ownerPhone}
                placeholder="3001234567"
                onChange={(event) => setForm({ ...form, ownerPhone: event.target.value })}
              />
            </Field>
            <Field label="Phone Number ID" hint="Meta Cloud API.">
              <input
                value={form.phoneNumberId}
                onChange={(event) => setForm({ ...form, phoneNumberId: event.target.value })}
              />
            </Field>
            <Field label="Token de acceso" hint="También puede definirse con la variable WHATSAPP_TOKEN.">
              <input
                type="password"
                value={form.token}
                onChange={(event) => setForm({ ...form, token: event.target.value })}
              />
            </Field>
            <div className="form-actions span-2">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar configuración'}
              </button>
            </div>
          </form>
        ) : (
          <p className="empty-state">Cargando configuración…</p>
        )}
      </section>

      <section className="card">
        <header className="card-head card-head-wrap">
          <div>
            <h3>Vista previa del resumen de hoy</h3>
            <p className="card-subtitle">Exactamente el texto que recibirá el dueño.</p>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-ghost btn-sm" onClick={sendTest} disabled={sending}>
              {sending ? 'Enviando…' : 'Enviar prueba'}
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={!preview.data?.waLink}
              onClick={() => {
                const text = preview.data?.text
                if (text) void api.whatsapp.openChat(text).catch(fail)
              }}
            >
              Abrir WhatsApp Web
            </button>
          </div>
        </header>
        {preview.error && <ErrorBanner message={preview.error} />}
        <textarea className="summary-preview" readOnly rows={10} value={preview.data?.text ?? 'Cargando…'} />
        {reason && <p className="inline-note">{reason}</p>}
      </section>
    </div>
  )
}
