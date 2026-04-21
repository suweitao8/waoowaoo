/**
 * 单用户模式配置
 * 当 SINGLE_USER_MODE=true 时，自动使用 root/root 登录
 */

// 在构建时确定值，这样客户端也能获取到正确的值
export const SINGLE_USER_MODE = process.env.NEXT_PUBLIC_SINGLE_USER_MODE === 'true' || process.env.SINGLE_USER_MODE === 'true'
export const ROOT_USER_NAME = 'root'
export const ROOT_USER_PASSWORD = 'root'

/**
 * 检查是否启用单用户模式
 */
export function isSingleUserMode(): boolean {
  return SINGLE_USER_MODE
}
