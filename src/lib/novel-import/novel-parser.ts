/**
 * 章节拆分接口
 */
export interface ChapterSplit {
  title: string        // 完整标题：第X章 章节名
  chapterNumber: string // 章节号：第X章
  chapterName: string   // 章节名：章节名（不含第X章）
  content: string
  startIndex: number
  endIndex: number
}

/**
 * 格式化小说正文：每行前加 tab，行与行之间加空行
 */
export function formatNovelContent(text: string): string {
  if (!text) return ''

  // 按换行符分割
  const lines = text.split(/\n/)

  // 过滤空行，然后每行前加 tab
  const formattedLines = lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => '\t' + line)

  // 行与行之间加空行（即用 \n\n 连接）
  return formattedLines.join('\n\n')
}

/**
 * 使用正则表达式按章节标题拆分小说内容
 * 支持：第X章、第一章、第1章 等格式
 */
export function splitNovelByChapters(content: string): ChapterSplit[] {
  // 匹配章节标题：第X章 或 第X章 章节名（X可以是中文数字或阿拉伯数字）
  const chapterRegex = /(?:^|\n)(第[一二三四五六七八九十百千万\d]+章[^\n]*)/g

  const chapters: ChapterSplit[] = []
  let match

  // 找到所有章节标题的位置
  const matches: { title: string; index: number }[] = []
  while ((match = chapterRegex.exec(content)) !== null) {
    const title = match[1].trim()
    // 确保标题长度合理（过滤掉可能的误匹配）
    if (title.length <= 50) {
      matches.push({ title, index: match.index + (match[0].length - match[1].length) })
    }
  }

  // 如果没有找到章节，返回整个内容作为一章
  if (matches.length === 0) {
    const trimmedContent = content.trim()
    if (trimmedContent.length > 0) {
      return [{
        title: '第一章',
        chapterNumber: '第一章',
        chapterName: '',
        content: formatNovelContent(trimmedContent),
        startIndex: 0,
        endIndex: trimmedContent.length
      }]
    }
    return []
  }

  // 按章节分割内容
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]

    // 如果是第一个匹配，检查前面是否有内容（序章）
    if (i === 0 && current.index > 0) {
      const prologueContent = content.substring(0, current.index).trim()
      if (prologueContent.length > 100) {
        chapters.push({
          title: '序章',
          chapterNumber: '序章',
          chapterName: '',
          content: formatNovelContent(prologueContent),
          startIndex: 0,
          endIndex: current.index
        })
      }
    }

    // 提取章节内容
    const endIndex = next ? next.index : content.length
    const rawContent = content.substring(current.index, endIndex)

    // 只有内容足够长才添加（避免空章节）
    if (rawContent.trim().length > 50) {
      // 提取章节号和章节名
      const titleMatch = current.title.match(/(第[一二三四五六七八九十百千万\d]+章)\s*(.*)/)
      const chapterNumber = titleMatch ? titleMatch[1] : '第一章'
      const chapterName = titleMatch && titleMatch[2] ? titleMatch[2].trim() : ''

      // 从内容中移除章节标题行（第一行）
      const contentWithoutTitle = rawContent.replace(/^[^\n]*\n/, '').trim()

      // 格式化正文：每行前加 tab，行与行之间加空行
      const formattedContent = formatNovelContent(contentWithoutTitle)

      chapters.push({
        title: chapterName ? `${chapterNumber} ${chapterName}` : chapterNumber,
        chapterNumber,
        chapterName,
        content: formattedContent,
        startIndex: current.index,
        endIndex: endIndex
      })
    }
  }

  return chapters
}

/**
 * 预处理小说文本，清理常见格式问题
 * - 移除分隔线（如 ------------、===========、***********）
 * - 移除文件名标识（如 "1-10"、"第1-100章" 等）
 * - 清理多余空行
 */
export function preprocessNovelContent(content: string): string {
  if (!content || content.length < 100) {
    return content
  }

  let processed = content

  // 1. 移除文件名标识行（常见于复制的内容开头）
  // 匹配：凡人修仙传1-10、斗破苍穹第1-100章、小说名+数字范围 等
  processed = processed.replace(/^[^\n]*[\u4e00-\u9fa5]+\s*\d+\s*[-~至到]\s*\d+\s*[章回集部卷]?\s*$/gm, '')
  processed = processed.replace(/^[^\n]*[\u4e00-\u9fa5]+\s*第?\s*\d+\s*[-~至到]\s*\d+\s*[章回集部卷]?\s*$/gm, '')

  // 2. 移除"第X卷"标记（整行）
  // 匹配：第一卷、第二卷、第1卷、第壹卷 等
  processed = processed.replace(/^第[一二三四五六七八九十百千\d零壹贰叁肆伍陆柒捌玖拾]+卷[^\n]*$/gm, '')

  // 3. 移除常见分隔线
  // 匹配：------------、===========、***********、──────────── 等
  processed = processed.replace(/^[──\-_=*~·•]{3,}$/gm, '')

  // 4. 移除多余的连续空行（保留最多一个空行）
  processed = processed.replace(/\n{3,}/g, '\n\n')

  // 5. 移除行首行尾的空白（保留段落缩进）
  processed = processed.replace(/[ \t]+$/gm, '')  // 行尾空白

  // 6. 清理文档开头和结尾的空白
  processed = processed.trim()

  return processed
}

/**
 * 检测文件编码并解码为 UTF-8 字符串
 * 支持：UTF-8 (带/不带BOM)、GB2312、GBK、GB18030、Big5
 */
export function detectEncodingAndDecode(uint8Array: Uint8Array): string {
  const len = uint8Array.length

  // 1. 检查 BOM (Byte Order Mark)
  // UTF-8 BOM: EF BB BF
  if (len >= 3 && uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
    return new TextDecoder('utf-8').decode(uint8Array)
  }

  // UTF-16 LE BOM: FF FE
  if (len >= 2 && uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
    return new TextDecoder('utf-16le').decode(uint8Array)
  }

  // UTF-16 BE BOM: FE FF
  if (len >= 2 && uint8Array[0] === 0xFE && uint8Array[1] === 0xFF) {
    return new TextDecoder('utf-16be').decode(uint8Array)
  }

  // 2. 尝试 UTF-8 解码，检查是否有效
  const utf8Decoder = new TextDecoder('utf-8', { fatal: true })
  try {
    const text = utf8Decoder.decode(uint8Array)
    // 检查是否有替换字符（无效 UTF-8 序列会被替换为 \uFFFD）
    if (!text.includes('\uFFFD')) {
      return text
    }
  } catch {
    // UTF-8 解码失败，继续尝试其他编码
  }

  // 3. 检测是否为中文编码 (GB2312/GBK/GB18030)
  // 中文编码特征：高字节 0x81-0xFE，低字节 0x40-0xFE（排除 0x7F）
  let isLikelyChineseEncoding = false
  let chineseBytePairs = 0
  let totalBytePairs = 0

  for (let i = 0; i < len - 1; i++) {
    const b1 = uint8Array[i]
    const b2 = uint8Array[i + 1]

    // GB2312/GBK 双字节字符：第一字节 0x81-0xFE，第二字节 0x40-0xFE（不含 0x7F）
    if (b1 >= 0x81 && b1 <= 0xFE && b2 >= 0x40 && b2 <= 0xFE && b2 !== 0x7F) {
      chineseBytePairs++
      i++ // 跳过下一字节
    }
    totalBytePairs++
  }

  // 如果有较多中文双字节字符，很可能是中文编码
  if (totalBytePairs > 0 && chineseBytePairs / totalBytePairs > 0.05) {
    isLikelyChineseEncoding = true
  }

  // 4. 尝试 GB18030（GB2312/GBK 的超集）
  if (isLikelyChineseEncoding) {
    try {
      const gb18030Decoder = new TextDecoder('gb18030', { fatal: true })
      const text = gb18030Decoder.decode(uint8Array)
      // 验证解码结果是否包含合理的中文内容
      if (!text.includes('\uFFFD') && /[\u4e00-\u9fa5]/.test(text)) {
        return text
      }
    } catch {
      // GB18030 解码失败
    }
  }

  // 5. 尝试 Big5（繁体中文）
  if (isLikelyChineseEncoding) {
    try {
      const big5Decoder = new TextDecoder('big5', { fatal: true })
      const text = big5Decoder.decode(uint8Array)
      if (!text.includes('\uFFFD') && /[\u4e00-\u9fa5]/.test(text)) {
        return text
      }
    } catch {
      // Big5 解码失败
    }
  }

  // 6. 最后回退：尝试 GB18030（即使检测不强烈也尝试）
  try {
    const gb18030Decoder = new TextDecoder('gb18030')
    const text = gb18030Decoder.decode(uint8Array)
    if (/[\u4e00-\u9fa5]/.test(text)) {
      return text
    }
  } catch {
    // 忽略
  }

  // 7. 最终回退：UTF-8（宽松模式）
  return new TextDecoder('utf-8').decode(uint8Array)
}
