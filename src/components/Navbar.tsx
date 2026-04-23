'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useSession } from 'next-auth/react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import UpdateNoticeModal from './UpdateNoticeModal'
import { useGithubReleaseUpdate } from '@/hooks/common/useGithubReleaseUpdate'
import { Link } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'
import { isSingleUserMode } from '@/lib/single-user-mode'


export default function Navbar() {
  const { data: session, status } = useSession()
  const t = useTranslations('nav')
  const tc = useTranslations('common')
  const { currentVersion, update, shouldPulse, showModal, openModal, dismissCurrentUpdate, checkNow } = useGithubReleaseUpdate()

  // 手动检查更新相关状态
  const [manualChecking, setManualChecking] = useState(false)
  const [checkMsg, setCheckMsg] = useState<'upToDate' | null>(null)
  const [checkMsgFading, setCheckMsgFading] = useState(false)

  // 单用户模式下，显示已登录用户的导航
  const showAuthenticatedNav = session || isSingleUserMode()

  const handleCheckUpdate = async () => {
    setCheckMsg(null)
    setCheckMsgFading(false)
    setManualChecking(true)
    const minSpin = new Promise(r => setTimeout(r, 1000))
    await Promise.all([checkNow(), minSpin])
    setManualChecking(false)
    setTimeout(() => {
      setCheckMsg('upToDate')
      setTimeout(() => setCheckMsgFading(true), 2000)
      setTimeout(() => { setCheckMsg(null); setCheckMsgFading(false) }, 3000)
    }, 100)
  }

  return (
    <>
      <nav className="pin-nav sticky top-0 z-50">
        <div className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* 左侧：Logo + 版本信息 */}
            <div className="flex items-center gap-2">
              <Link href={session ? buildAuthenticatedHomeTarget() : { pathname: '/' }} className="group">
                <Image
                  src="/logo-small.png?v=1"
                  alt={tc('appName')}
                  width={80}
                  height={80}
                  className="object-contain transition-transform group-hover:scale-110"
                />
              </Link>
              <button
                type="button"
                onClick={openModal}
                disabled={!update}
                className={`relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.02em] transition-all ${update
                  ? 'border-[var(--pin-tone-warning-fg)]/40 bg-[linear-gradient(135deg,var(--pin-tone-warning-bg),var(--pin-bg-surface-strong))] text-[var(--pin-tone-warning-fg)] shadow-[0_8px_24px_-16px_rgba(245,158,11,0.9)] hover:brightness-105'
                  : 'border-[var(--pin-stroke-base)] bg-[var(--pin-bg-surface)] text-[var(--pin-text-secondary)] hover:border-[var(--pin-stroke-focus)] hover:text-[var(--pin-text-primary)] disabled:cursor-default'
                  }`}
                aria-label={tc('updateNotice.openDialog')}
              >
                <span className="inline-flex items-center gap-1.5">
                  <AppIcon name="sparkles" className="h-3.5 w-3.5" />
                  {tc('betaVersion', { version: currentVersion })}
                  {update ? (
                    <span className="relative inline-flex items-center">
                      {shouldPulse ? <span className="absolute -inset-1.5 animate-ping rounded-full bg-[var(--pin-tone-warning-fg)] opacity-20" /> : null}
                      <span className="relative inline-flex items-center gap-1 rounded-full bg-[var(--pin-tone-warning-fg)]/16 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em]">
                        <AppIcon name="upload" className="h-3 w-3" />
                        {tc('updateNotice.updateTag')}
                      </span>
                    </span>
                  ) : null}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void handleCheckUpdate()}
                disabled={manualChecking}
                className="rounded-full p-1.5 text-[var(--pin-text-tertiary)] hover:bg-[var(--pin-bg-muted)] hover:text-[var(--pin-text-secondary)] transition-colors disabled:opacity-40"
                title={tc('updateNotice.checkUpdate')}
              >
                <AppIcon name="refresh" className={`h-3.5 w-3.5 ${manualChecking ? 'animate-spin' : ''}`} />
              </button>
              {checkMsg === 'upToDate' && !update && (
                <span
                  className="text-[11px] text-[var(--pin-tone-success-fg)] font-medium transition-opacity duration-1000"
                  style={{ opacity: checkMsgFading ? 0 : 1 }}
                >
                  ✓ {tc('updateNotice.upToDate')}
                </span>
              )}
            </div>

            {/* 右侧：导航链接 */}
            <div className="flex items-center space-x-6">
              {status === 'loading' ? (
                /* Session 加载中骨架屏 */
                <div className="flex items-center space-x-4">
                  <div className="h-4 w-16 rounded-full bg-[var(--pin-bg-muted)] animate-pulse" />
                  <div className="h-4 w-16 rounded-full bg-[var(--pin-bg-muted)] animate-pulse" />
                  <div className="h-8 w-20 rounded-lg bg-[var(--pin-bg-muted)] animate-pulse" />
                </div>
              ) : showAuthenticatedNav ? (
                <>
                  <Link
                    href={{ pathname: '/novel' }}
                    className="text-sm text-[var(--pin-text-secondary)] hover:text-[var(--pin-text-primary)] font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="edit" className="w-4 h-4" />
                    {t('novelWriting')}
                  </Link>
                  <Link
                    href={{ pathname: '/workspace' }}
                    className="text-sm text-[var(--pin-text-secondary)] hover:text-[var(--pin-text-primary)] font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="monitor" className="w-4 h-4" />
                    {t('workspace')}
                  </Link>
                  {/* ComfyUI 暂时隐藏 */}
                  {/* <Link
                    href={{ pathname: '/comfyui' }}
                    className="text-sm text-[var(--pin-text-secondary)] hover:text-[var(--pin-text-primary)] font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="image" className="w-4 h-4" />
                    {t('comfyui')}
                  </Link> */}
                  {/* Nano Test 暂时隐藏 */}
                  {/* <Link
                    href={{ pathname: '/nano-test' }}
                    className="text-sm text-[var(--pin-text-secondary)] hover:text-[var(--pin-text-primary)] font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="sparklesAlt" className="w-4 h-4" />
                    Nano Test
                  </Link> */}
                  <Link
                    href={{ pathname: '/workspace/asset-hub' }}
                    className="text-sm text-[var(--pin-text-secondary)] hover:text-[var(--pin-text-primary)] font-medium transition-colors flex items-center gap-1"
                  >
                    <AppIcon name="folderHeart" className="w-4 h-4" />
                    {t('assetHub')}
                  </Link>
                  <Link
                    href={{ pathname: '/profile' }}
                    className="text-sm text-[var(--pin-text-secondary)] hover:text-[var(--pin-text-primary)] font-medium transition-colors flex items-center gap-1"
                    title={t('profile')}
                  >
                    <AppIcon name="userRoundCog" className="w-5 h-5" />
                    {t('profile')}
                  </Link>
                </>

              ) : (
                <>
                  <Link
                    href={{ pathname: '/auth/signin' }}
                    className="text-sm text-[var(--pin-text-secondary)] hover:text-[var(--pin-text-primary)] font-medium transition-colors"
                  >
                    {t('signin')}
                  </Link>
                  <Link
                    href={{ pathname: '/auth/signup' }}
                    className="pin-btn-base pin-btn-primary px-4 py-2 text-sm font-medium"
                  >
                    {t('signup')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      {update ? (
        <UpdateNoticeModal
          show={showModal}
          currentVersion={currentVersion}
          latestVersion={update.latestVersion}
          releaseUrl={update.releaseUrl}
          releaseName={update.releaseName}
          publishedAt={update.publishedAt}
          onDismiss={dismissCurrentUpdate}
        />
      ) : null}
    </>
  )
}
