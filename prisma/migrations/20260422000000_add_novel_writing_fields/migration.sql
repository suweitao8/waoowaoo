-- 为 NovelPromotionProject 表添加写小说专用字段
ALTER TABLE `novel_promotion_projects`
ADD COLUMN `worldContext` TEXT NULL COMMENT '世界观设定',
ADD COLUMN `writingStyle` TEXT NULL COMMENT '写作风格描述',
ADD COLUMN `extractedCharacters` TEXT NULL COMMENT '提取的角色信息（JSON数组）';

-- 为 NovelPromotionEpisode 表添加改写相关字段
ALTER TABLE `novel_promotion_episodes`
ADD COLUMN `rewriteHistory` TEXT NULL COMMENT '改写历史（JSON数组）',
ADD COLUMN `originalText` TEXT NULL COMMENT '原始文本备份';
