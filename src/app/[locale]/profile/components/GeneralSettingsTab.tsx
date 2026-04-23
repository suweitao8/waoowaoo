'use client'

import { useTranslations } from 'next-intl'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { AppIcon } from '@/components/ui/icons'

export default function GeneralSettingsTab() {
  const t = useTranslations('profile')

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[var(--glass-stroke-base)]">
        <h2 className="text-lg font-semibold text-[var(--glass-text-primary)]">
          {t('generalSettings')}
        </h2>
        <p className="text-sm text-[var(--glass-text-secondary)] mt-1">
          {t('generalSettingsDesc')}
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Language Setting */}
        <div className="glass-surface-soft rounded-xl border border-[var(--glass-stroke-base)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[var(--glass-text-primary)]">
                {t('languageSetting')}
              </h3>
              <p className="text-sm text-[var(--glass-text-secondary)] mt-1">
                {t('languageSettingDesc')}
              </p>
            </div>
            <LanguageSwitcher />
          </div>
        </div>

        {/* Download Logs */}
        <div className="glass-surface-soft rounded-xl border border-[var(--glass-stroke-base)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[var(--glass-text-primary)]">
                {t('downloadLogs')}
              </h3>
              <p className="text-sm text-[var(--glass-text-secondary)] mt-1">
                {t('downloadLogsDesc')}
              </p>
            </div>
            <a
              href="/api/admin/download-logs"
              download
              className="glass-btn-base glass-btn-secondary px-4 py-2 text-sm rounded-lg flex items-center gap-2"
            >
              <AppIcon name="download" className="w-4 h-4" />
              {t('download')}
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
