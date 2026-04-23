'use client'

import { useEffect, useState } from 'react'
import { useSession, signIn } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'
import { isSingleUserMode, ROOT_USER_NAME, ROOT_USER_PASSWORD } from '@/lib/single-user-mode'

/**
 * 单用户模式自动登录组件
 * 放置在布局中，自动检测并登录未认证用户
 */
export function SingleUserAutoLogin({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [isAutoLoggingIn, setIsAutoLoggingIn] = useState(false)

  useEffect(() => {
    // 仅在单用户模式下执行
    if (!isSingleUserMode()) return

    // 如果正在加载或已登录，跳过
    if (status === 'loading' || session) return

    // 如果正在自动登录中，跳过
    if (isAutoLoggingIn) return

    // 自动登录
    const performAutoLogin = async () => {
      setIsAutoLoggingIn(true)
      try {
        const result = await signIn('credentials', {
          username: ROOT_USER_NAME,
          password: ROOT_USER_PASSWORD,
          redirect: false,
        })

        if (result?.error) {
          console.error('[SingleUserAutoLogin] Auto-login failed:', result.error)
        } else {
          // 登录成功，刷新页面
          router.refresh()
        }
      } catch (error) {
        console.error('[SingleUserAutoLogin] Auto-login error:', error)
      } finally {
        setIsAutoLoggingIn(false)
      }
    }

    performAutoLogin()
  }, [session, status, isAutoLoggingIn, pathname, router])

  // 显示加载状态
  if (isSingleUserMode() && status === 'loading') {
    return (
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">Loading...</div>
      </div>
    )
  }

  // 单用户模式下，正在自动登录时显示加载
  if (isSingleUserMode() && !session && isAutoLoggingIn) {
    return (
      <div className="glass-page min-h-screen flex items-center justify-center">
        <div className="text-[var(--glass-text-secondary)]">Auto-login...</div>
      </div>
    )
  }

  return <>{children}</>
}
