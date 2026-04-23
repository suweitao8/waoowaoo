'use client'

import { useEffect, useState } from "react"
import { signIn } from "next-auth/react"
import { useTranslations } from 'next-intl'
import Navbar from "@/components/Navbar"
import { Link, useRouter } from '@/i18n/navigation'
import { buildAuthenticatedHomeTarget } from '@/lib/home/default-route'
import { isSingleUserMode } from '@/lib/single-user-mode'

export default function SignIn() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const t = useTranslations('auth')

  // 单用户模式下直接重定向到 workspace
  useEffect(() => {
    if (isSingleUserMode()) {
      router.replace(buildAuthenticatedHomeTarget())
    }
  }, [router])

  // 单用户模式下不渲染登录表单
  if (isSingleUserMode()) {
    return (
      <div className="pin-page min-h-screen flex items-center justify-center">
        <div className="text-[var(--pin-text-secondary)]">Redirecting...</div>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.error === 'RateLimited') {
        setError(t('rateLimited'))
      } else if (result?.error) {
        setError(t('loginFailed'))
      } else {
        router.push(buildAuthenticatedHomeTarget())
        router.refresh()
      }
    } catch {
      setError(t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="pin-page min-h-screen">
      <Navbar />
      <div className="flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full">
          <div className="pin-surface-modal p-8">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-[var(--pin-text-primary)] mb-2">
                {t('welcomeBack')}
              </h1>
              <p className="text-[var(--pin-text-secondary)]">{t('loginTo')}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="username" className="pin-field-label block mb-2">
                  {t('phoneNumber')}
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="pin-input-base w-full px-4 py-3"
                  placeholder={t('phoneNumberPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="password" className="pin-field-label block mb-2">
                  {t('password')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pin-input-base w-full px-4 py-3"
                  placeholder={t('passwordPlaceholder')}
                />
              </div>

              {error && (
                <div className="bg-[var(--pin-tone-danger-bg)] border border-[color:color-mix(in_srgb,var(--pin-tone-danger-fg)_22%,transparent)] text-[var(--pin-tone-danger-fg)] px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="pin-btn-base pin-btn-primary w-full py-3 px-4 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('loginButtonLoading') : t('loginButton')}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-[var(--pin-text-secondary)]">
                {t('noAccount')}{" "}
                <Link href={{ pathname: '/auth/signup' }} className="text-[var(--pin-tone-info-fg)] hover:underline font-medium">
                  {t('signupNow')}
                </Link>
              </p>
            </div>

            <div className="mt-6 text-center">
              <Link href={{ pathname: '/' }} className="text-[var(--pin-text-tertiary)] hover:text-[var(--pin-text-secondary)] text-sm">
                {t('backToHome')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
