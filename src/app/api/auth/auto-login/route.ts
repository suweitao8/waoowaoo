import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { isSingleUserMode, ROOT_USER_NAME, ROOT_USER_PASSWORD } from '@/lib/single-user-mode'

/**
 * 自动登录 API 端点
 * 仅在 SINGLE_USER_MODE=true 时可用
 * 自动使用 root/root 登录
 */
export async function POST(request: NextRequest) {
  // 检查是否启用单用户模式
  if (!isSingleUserMode()) {
    return NextResponse.json(
      { error: 'Single user mode not enabled' },
      { status: 400 }
    )
  }

  // 检查是否已登录
  const session = await getServerSession(authOptions)
  if (session) {
    return NextResponse.json({ success: true, alreadyAuthenticated: true })
  }

  // 在服务端，我们需要直接操作 session
  // 由于 next-auth 的 signIn 是客户端 API，我们需要使用 Credentials Provider 的逻辑
  const bcrypt = await import('bcryptjs')
  const { prisma } = await import('@/lib/prisma')

  try {
    const user = await prisma.user.findUnique({
      where: { name: ROOT_USER_NAME },
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: 'Root user not found' },
        { status: 500 }
      )
    }

    const isPasswordValid = await bcrypt.compare(ROOT_USER_PASSWORD, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 500 }
      )
    }

    // 返回成功，让客户端调用 signIn
    return NextResponse.json({
      success: true,
      credentials: {
        username: ROOT_USER_NAME,
        password: ROOT_USER_PASSWORD,
      }
    })
  } catch (error) {
    console.error('[auto-login] Error:', error)
    return NextResponse.json(
      { error: 'Auto-login failed' },
      { status: 500 }
    )
  }
}

/**
 * GET 请求返回是否需要自动登录
 */
export async function GET() {
  if (!isSingleUserMode()) {
    return NextResponse.json({ singleUserMode: false })
  }

  const session = await getServerSession(authOptions)
  return NextResponse.json({
    singleUserMode: true,
    authenticated: !!session,
  })
}
