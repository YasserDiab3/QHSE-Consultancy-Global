'use client'

import { useLanguage } from '@/context'
import { useEffect, useState } from 'react'
import { Activity, Download, Loader2 } from 'lucide-react'
import { exportAuditLogsToCsv } from '@/lib/export-excel'
import toast from 'react-hot-toast'

type LogEntry = {
  id: string
  action: string
  entityType?: string
  entityId?: string
  details?: string
  createdAt: string
  user: {
    name: string
    email: string
    role: string
  }
}

export default function AdminActivityLog() {
  const { t, language } = useLanguage()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/activity-log')
      if (res.ok) setLogs(await res.json())
    } catch (error) {
      console.error('Failed to fetch logs:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">{t('admin.activityLog')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (logs.length === 0) {
                toast.error(language === 'ar' ? 'لا توجد سجلات لتصديرها' : 'No logs to export')
                return
              }
              exportAuditLogsToCsv(logs, language)
              toast.success(language === 'ar' ? 'تم تصدير سجل التدقيق إلى Excel' : 'Audit log exported to Excel')
            }}
            className="btn-secondary px-4 py-2 text-sm"
            title={language === 'ar' ? 'تصدير سجل التدقيق إلى ملف Excel' : 'Export audit log to Excel'}
          >
            <Download className="w-4 h-4 text-emerald-600" />
            {language === 'ar' ? 'تصدير السجل (Excel)' : 'Export Log (Excel)'}
          </button>
          <button onClick={fetchLogs} className="btn-secondary px-4 py-2 text-sm">
            <Activity className="w-4 h-4" />
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
        </div>
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('common.actions')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('admin.clients')}</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Details</th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">{t('reports.createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">{log.user.name}</p>
                        <p className="text-xs text-gray-500">{log.user.email}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">{log.details || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{formatDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {logs.length === 0 && (
            <div className="text-center py-8 text-gray-500">{t('common.noData')}</div>
          )}
        </div>
      )}
    </div>
  )
}
