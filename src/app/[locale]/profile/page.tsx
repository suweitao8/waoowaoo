'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import Navbar from '@/components/Navbar'
import ApiConfigTab from './components/ApiConfigTab'
import GeneralSettingsTab from './components/GeneralSettingsTab'
import PromptTemplatesTab from './components/PromptTemplatesTab'
import { AppIcon } from '@/components/ui/icons'
import { useRouter } from '@/i18n/navigation'
import { isSingleUserMode } from '@/lib/single-user-mode'

type ActiveSection = 'apiConfig' | 'generalSettings' | 'promptTemplates'

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const t = useTranslations('profile')
  const tc = useTranslations('common')
  const [activeSection, setActiveSection] = useState<ActiveSection>('apiConfig')

  useEffect(() => {
    // 单用户模式下不需要检查登录状态
    if (isSingleUserMode()) return
    if (status === 'loading') return
    if (!session) { router.push({ pathname: '/auth/signin' }); return }
  }, [router, session, status])

  // 单用户模式下直接显示内容
  if (!isSingleUserMode() && (status === 'loading' || !session)) {
    return (
      <div className="glass-page flex min-h-screen items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">{tc('loading')}</div>
      </div>
    )
  }

  return (
    <div className="glass-page min-h-screen">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 py-8">
        <div className="flex gap-6 h-[calc(100vh-140px)]">

          {/* 左侧侧边栏 */}
          <div className="w-64 flex-shrink-0">
            <div className="glass-surface-elevated h-full flex flex-col p-5">

              {/* 导航菜单 */}
              <nav className="flex-1 space-y-2">
                <button
                  onClick={() => setActiveSection('apiConfig')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeSection === 'apiConfig'
                    ? 'glass-btn-base glass-btn-tone-info'
                    : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]'
                    }`}
                >
                  <AppIcon name="settingsHexAlt" className="w-5 h-5" />
                  <span className="font-medium">{t('apiConfig')}</span>
                </button>
                <button
                  onClick={() => setActiveSection('promptTemplates')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeSection === 'promptTemplates'
                    ? 'glass-btn-base glass-btn-tone-info'
                    : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]'
                    }`}
                >
                  <AppIcon name="fileText" className="w-5 h-5" />
                  <span className="font-medium">{t('promptTemplates')}</span>
                </button>
                <button
                  onClick={() => setActiveSection('generalSettings')}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all cursor-pointer ${activeSection === 'generalSettings'
                    ? 'glass-btn-base glass-btn-tone-info'
                    : 'text-[var(--glass-text-secondary)] hover:bg-[var(--glass-bg-muted)]'
                    }`}
                >
                  <AppIcon name="settingsHex" className="w-5 h-5" />
                  <span className="font-medium">{t('generalSettings')}</span>
                </button>
              </nav>

              {/* 单用户模式下隐藏退出按钮 */}
            </div>
          </div>

          {/* 右侧内容区 */}
          <div className="flex-1 min-w-0">
            <div className="glass-surface-elevated h-full flex flex-col">
              {activeSection === 'apiConfig' ? (
                <ApiConfigTab />
              ) : activeSection === 'promptTemplates' ? (
                <PromptTemplatesTab />
              ) : (
                <GeneralSettingsTab />
              )}
            </div>
          </div>
        </div>
      </main >
    </div >
  )
}
