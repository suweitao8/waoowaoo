/**
 * 确保 root 用户存在
 * 用于单用户模式下的自动登录
 */
import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/prisma'

const ROOT_USER_NAME = 'root'
const ROOT_USER_PASSWORD = 'root'

async function ensureRootUser() {
  try {
    // 检查 root 用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { name: ROOT_USER_NAME },
    })

    if (existingUser) {
      console.log('[ensure-root-user] Root user already exists')
      return
    }

    // 创建 root 用户
    const hashedPassword = await bcrypt.hash(ROOT_USER_PASSWORD, 10)

    await prisma.user.create({
      data: {
        name: ROOT_USER_NAME,
        password: hashedPassword,
      },
    })

    console.log('[ensure-root-user] Root user created successfully')
  } catch (error) {
    console.error('[ensure-root-user] Failed to ensure root user:', error)
    throw error
  }
}

// 直接执行
ensureRootUser()
  .then(() => {
    console.log('[ensure-root-user] Done')
    process.exit(0)
  })
  .catch((error) => {
    console.error('[ensure-root-user] Error:', error)
    process.exit(1)
  })
