'use client'

/**
 * 统一角色属性编辑面板
 * 支持生成前和生成后的全属性编辑
 * 自动生成文生图和音色 AI 提示词
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { useTranslations } from 'next-intl'
import { AppIcon, type AppIconName } from '@/components/ui/icons'
import TaskStatusInline from '@/components/task/TaskStatusInline'
import { resolveTaskPresentationState } from '@/lib/task/presentation'
import { CharacterProfileData, RoleLevel, CostumeTier } from '@/types/character-profile'
import { useDebouncedCallback } from 'use-debounce'

// 角色层级选项
const ROLE_LEVELS: RoleLevel[] = ['S', 'A', 'B', 'C', 'D']
// 服装华丽度选项 (从高到低显示)
const COSTUME_TIERS: CostumeTier[] = [5, 4, 3, 2, 1]

// 游戏品质分级颜色系统
const TIER_STYLES: Record<string, { gradient: string; glow: string; accent: string }> = {
    S: { gradient: 'linear-gradient(135deg, #f59e0b, #ef4444)', glow: '0 2px 8px rgba(245,158,11,0.35)', accent: '#b45309' },
    A: { gradient: 'linear-gradient(135deg, #a855f7, #6366f1)', glow: '0 2px 8px rgba(168,85,247,0.3)', accent: '#7c3aed' },
    B: { gradient: 'linear-gradient(135deg, #3b82f6, #06b6d4)', glow: '0 2px 8px rgba(59,130,246,0.3)', accent: '#2563eb' },
    C: { gradient: 'linear-gradient(135deg, #22c55e, #10b981)', glow: '0 2px 8px rgba(34,197,94,0.25)', accent: '#16a34a' },
    D: { gradient: 'linear-gradient(135deg, #9ca3af, #6b7280)', glow: '0 2px 6px rgba(156,163,175,0.2)', accent: '#6b7280' },
}

// 生成状态
type GenerationPhase = 'idle' | 'saving' | 'generating-image' | 'generating-voice' | 'complete' | 'error'

export interface UnifiedCharacterPropertyPanelProps {
    /** 模式：asset-hub 或 project */
    mode: 'asset-hub' | 'project'
    /** 角色ID */
    characterId: string
    /** 角色名称 */
    characterName: string
    /** 角色描述 */
    description: string
    /** 现有档案数据 */
    profileData: CharacterProfileData | null
    /** 现有形象描述（生成后状态） */
    appearanceDescription?: string
    /** 现有形象索引（asset-hub模式） */
    appearanceIndex?: number
    /** 现有形象ID（project模式） */
    appearanceId?: string
    /** 项目ID（project模式必需） */
    projectId?: string
    /** 角色介绍（project模式） */
    introduction?: string | null
    /** 是否有已生成的形象 */
    hasGeneratedImage?: boolean
    /** 是否有已生成的音色 */
    hasGeneratedVoice?: boolean
    /** 关闭回调 */
    onClose: () => void
    /** 保存回调 */
    onSave: (data: { profileData: CharacterProfileData; description: string; introduction?: string }) => Promise<void>
    /** 生成形象回调 */
    onGenerateImage?: () => Promise<void>
    /** 生成音色回调 */
    onGenerateVoice?: () => Promise<void>
    /** 刷新回调 */
    onRefresh?: () => void
}

export default function UnifiedCharacterPropertyPanel({
    mode,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    characterId: _characterId,
    characterName,
    description: initialDescription,
    profileData: initialProfileData,
    appearanceDescription,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    appearanceIndex: _appearanceIndex,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    appearanceId: _appearanceId,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    projectId: _projectId,
    introduction: initialIntroduction,
    hasGeneratedImage = false,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    hasGeneratedVoice: _hasGeneratedVoice = false,
    onClose,
    onSave,
    onGenerateImage,
    onGenerateVoice,
    onRefresh,
}: UnifiedCharacterPropertyPanelProps) {
    const t = useTranslations('assets')

    // ===== 状态管理 =====
    // 基础信息
    const [name, setName] = useState(characterName)
    const [editingGender, setEditingGender] = useState(initialProfileData?.gender || '')
    const [editingAgeRange, setEditingAgeRange] = useState(initialProfileData?.age_range || '')
    const [editingIdentity, setEditingIdentity] = useState(initialProfileData?.identity || '')
    const [editingHeight, setEditingHeight] = useState(initialProfileData?.height || '')
    const [editingBodyType, setEditingBodyType] = useState(initialProfileData?.body_type || '')

    // 角色定位
    const [editingRoleLevel, setEditingRoleLevel] = useState<RoleLevel>(initialProfileData?.role_level || 'C')
    const [editingArchetype, setEditingArchetype] = useState(initialProfileData?.archetype || '')
    const [editingPersonalityTags, setEditingPersonalityTags] = useState<string[]>(initialProfileData?.personality_tags || [])

    // 视觉设定
    const [editingEraPeriod, setEditingEraPeriod] = useState(initialProfileData?.era_period || '')
    const [editingSocialClass, setEditingSocialClass] = useState(initialProfileData?.social_class || '')
    const [editingCostumeTier, setEditingCostumeTier] = useState<CostumeTier>(initialProfileData?.costume_tier || 3)
    const [editingSuggestedColors, setEditingSuggestedColors] = useState<string[]>(initialProfileData?.suggested_colors || [])
    const [editingPrimaryIdentifier, setEditingPrimaryIdentifier] = useState(initialProfileData?.primary_identifier || '')
    const [editingVisualKeywords, setEditingVisualKeywords] = useState(initialProfileData?.visual_keywords || [])

    // 描述和介绍
    const [editingDescription, setEditingDescription] = useState(appearanceDescription || initialDescription || '')
    const [editingIntroduction, setEditingIntroduction] = useState(initialIntroduction || '')

    // AI 提示词
    const [imagePrompt, setImagePrompt] = useState('')
    const [voicePrompt, setVoicePrompt] = useState('')
    const [isGeneratingImagePrompt, setIsGeneratingImagePrompt] = useState(false)

    // 生成状态
    const [generationPhase, setGenerationPhase] = useState<GenerationPhase>('idle')
    const [showRegenerateWarning, setShowRegenerateWarning] = useState(false)

    // 折叠面板状态
    const [expandedSections, setExpandedSections] = useState({
        basic: true,
        positioning: true,
        visual: true,
        prompts: true,
    })

    // 标签输入状态
    const [newPersonalityTag, setNewPersonalityTag] = useState('')
    const [newColor, setNewColor] = useState('')
    const [newKeyword, setNewKeyword] = useState('')

    // ===== 构建完整的 profileData =====
    const buildProfileData = useCallback((): CharacterProfileData => {
        return {
            role_level: editingRoleLevel,
            archetype: editingArchetype,
            personality_tags: editingPersonalityTags,
            era_period: editingEraPeriod,
            social_class: editingSocialClass,
            identity: editingIdentity || undefined,
            height: editingHeight || undefined,
            body_type: editingBodyType || undefined,
            costume_tier: editingCostumeTier,
            suggested_colors: editingSuggestedColors,
            primary_identifier: editingPrimaryIdentifier || undefined,
            visual_keywords: editingVisualKeywords,
            gender: editingGender,
            age_range: editingAgeRange,
        }
    }, [
        editingRoleLevel, editingArchetype, editingPersonalityTags,
        editingEraPeriod, editingSocialClass, editingIdentity,
        editingHeight, editingBodyType, editingCostumeTier,
        editingSuggestedColors, editingPrimaryIdentifier, editingVisualKeywords,
        editingGender, editingAgeRange,
    ])

    // ===== 音色提示词生成 =====
    const generateVoicePromptText = useCallback((data: CharacterProfileData): string => {
        const parts: string[] = []

        // 性别
        if (data.gender) {
            parts.push(data.gender === '女' || data.gender === 'female' ? '女性声音' : '男性声音')
        }

        // 年龄
        if (data.age_range) {
            const ageText = data.age_range.includes('少') || data.age_range.includes('young')
                ? '年轻'
                : data.age_range.includes('中') || data.age_range.includes('middle')
                    ? '中年'
                    : data.age_range.includes('老') || data.age_range.includes('old')
                        ? '老年'
                        : ''
            if (ageText) parts.push(ageText)
        }

        // 性格标签
        if (data.personality_tags.length > 0) {
            parts.push(data.personality_tags.slice(0, 3).join('、'))
        }

        // 身份
        if (data.identity) {
            parts.push(data.identity)
        }

        return parts.length > 0 ? `${characterName}的声音特点：${parts.join('，')}` : `${characterName}的声音`
    }, [characterName])

    // ===== 文生图提示词生成 =====
    const debouncedGenerateImagePrompt = useDebouncedCallback(async () => {
        if (!name.trim() && !editingDescription.trim()) return

        setIsGeneratingImagePrompt(true)
        try {
            // TODO: 调用现有的 API 生成提示词
            // 目前使用简化版本
            const profileData = buildProfileData()
            const promptParts: string[] = []

            // 基本信息
            if (profileData.gender) promptParts.push(profileData.gender)
            if (profileData.age_range) promptParts.push(profileData.age_range)

            // 身份和体型
            if (profileData.identity) promptParts.push(profileData.identity)
            if (profileData.height) promptParts.push(`身高${profileData.height}`)
            if (profileData.body_type) promptParts.push(profileData.body_type)

            // 时代和阶层
            if (profileData.era_period) promptParts.push(`${profileData.era_period}背景`)
            if (profileData.social_class) promptParts.push(profileData.social_class)

            // 服装
            const costumeLabels: Record<number, string> = {
                5: '皇室/顶奢级服饰',
                4: '贵族/精英级服饰',
                3: '专业/品质级服饰',
                2: '日常/普通级服饰',
                1: '朴素/统一级服饰',
            }
            promptParts.push(costumeLabels[profileData.costume_tier])

            // 色彩
            if (profileData.suggested_colors.length > 0) {
                promptParts.push(`${profileData.suggested_colors.join('、')}色调`)
            }

            // 辨识标志
            if (profileData.primary_identifier) {
                promptParts.push(profileData.primary_identifier)
            }

            // 视觉关键词
            if (profileData.visual_keywords.length > 0) {
                promptParts.push(profileData.visual_keywords.join('、'))
            }

            const generatedPrompt = promptParts.length > 0
                ? `${name}，${promptParts.join('，')}。`
                : `${name}，${editingDescription}`

            setImagePrompt(generatedPrompt)
        } catch (error) {
            console.error('Failed to generate image prompt:', error)
        } finally {
            setIsGeneratingImagePrompt(false)
        }
    }, 500)

    // 属性变化时更新提示词
    useEffect(() => {
        // 更新音色提示词
        setVoicePrompt(generateVoicePromptText(buildProfileData()))

        // 更新图片提示词（防抖）
        void debouncedGenerateImagePrompt()
    }, [
        editingGender, editingAgeRange, editingIdentity, editingHeight, editingBodyType,
        editingRoleLevel, editingArchetype, editingPersonalityTags,
        editingEraPeriod, editingSocialClass, editingCostumeTier,
        editingSuggestedColors, editingPrimaryIdentifier, editingVisualKeywords,
        editingDescription, name,
        generateVoicePromptText, buildProfileData, debouncedGenerateImagePrompt,
    ])

    // ===== 标签操作 =====
    const addPersonalityTag = useCallback(() => {
        const tag = newPersonalityTag.trim()
        if (tag && !editingPersonalityTags.includes(tag)) {
            setEditingPersonalityTags([...editingPersonalityTags, tag])
            setNewPersonalityTag('')
        }
    }, [newPersonalityTag, editingPersonalityTags])

    const removePersonalityTag = useCallback((index: number) => {
        setEditingPersonalityTags(editingPersonalityTags.filter((_, i) => i !== index))
    }, [editingPersonalityTags])

    const addColor = useCallback(() => {
        const color = newColor.trim()
        if (color && !editingSuggestedColors.includes(color)) {
            setEditingSuggestedColors([...editingSuggestedColors, color])
            setNewColor('')
        }
    }, [newColor, editingSuggestedColors])

    const removeColor = useCallback((index: number) => {
        setEditingSuggestedColors(editingSuggestedColors.filter((_, i) => i !== index))
    }, [editingSuggestedColors])

    const addKeyword = useCallback(() => {
        const keyword = newKeyword.trim()
        if (keyword && !editingVisualKeywords.includes(keyword)) {
            setEditingVisualKeywords([...editingVisualKeywords, keyword])
            setNewKeyword('')
        }
    }, [newKeyword, editingVisualKeywords])

    const removeKeyword = useCallback((index: number) => {
        setEditingVisualKeywords(editingVisualKeywords.filter((_, i) => i !== index))
    }, [editingVisualKeywords])

    // ===== 折叠面板切换 =====
    const toggleSection = useCallback((section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
    }, [])

    // ===== 生成状态显示 =====
    const generationState = useMemo(() => {
        if (generationPhase === 'idle') return null
        return resolveTaskPresentationState({
            phase: generationPhase === 'complete' ? 'completed' : 'processing',
            intent: 'generate',
            resource: generationPhase === 'generating-voice' ? 'audio' : 'image',
            hasOutput: generationPhase === 'complete',
        })
    }, [generationPhase])

    // ===== 确认并生成 =====
    const doConfirmAndGenerate = useCallback(async () => {
        setShowRegenerateWarning(false)
        setGenerationPhase('saving')

        try {
            // 保存属性
            const profileData = buildProfileData()
            await onSave({
                profileData,
                description: editingDescription,
                introduction: mode === 'project' ? editingIntroduction : undefined,
            })

            // 生成形象
            if (onGenerateImage) {
                setGenerationPhase('generating-image')
                await onGenerateImage()
            }

            // 生成音色
            if (onGenerateVoice) {
                setGenerationPhase('generating-voice')
                await onGenerateVoice()
            }

            setGenerationPhase('complete')
            onRefresh?.()
            onClose()
        } catch (error) {
            console.error('Failed to confirm and generate:', error)
            setGenerationPhase('error')
        }
    }, [
        buildProfileData, editingDescription, editingIntroduction,
        mode, onSave, onGenerateImage, onGenerateVoice, onRefresh, onClose,
    ])

    const handleConfirmAndGenerate = useCallback(async () => {
        // 如果已有生成的形象，显示警告
        if (hasGeneratedImage) {
            setShowRegenerateWarning(true)
            return
        }

        await doConfirmAndGenerate()
    }, [hasGeneratedImage, doConfirmAndGenerate])

    // ===== 渲染 =====
    if (typeof document === 'undefined') return null

    const tierStyle = TIER_STYLES[editingRoleLevel] || TIER_STYLES.D

    const content = (
        <>
            <div className="fixed inset-0 z-[9999] glass-overlay" onClick={onClose} />
            <div
                className="fixed z-[10000] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 glass-surface-modal w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* 头部 */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)] shrink-0">
                    <div className="flex items-center gap-3">
                        <span
                            className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-black text-white tracking-wide"
                            style={{
                                background: tierStyle.gradient,
                                boxShadow: tierStyle.glow,
                            }}
                        >
                            {t(`characterProfile.importance.${editingRoleLevel}` as never)}
                        </span>
                        <h2 className="font-semibold text-[var(--glass-text-primary)] text-lg">
                            {t('unifiedPanel.editTitle', { name })}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={generationPhase !== 'idle'}
                        className="glass-btn-base glass-btn-soft p-1.5 text-[var(--glass-text-tertiary)] disabled:opacity-50"
                    >
                        <AppIcon name="close" className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容区域 */}
                <div className="flex-1 overflow-y-auto app-scrollbar p-5 space-y-4">
                    {/* 名称输入 */}
                    <div className="space-y-2">
                        <label className="glass-field-label block">
                            {t('character.name')}
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="glass-input-base w-full px-3 py-2"
                            placeholder={t('modal.namePlaceholder')}
                        />
                    </div>

                    {/* Project 模式：角色介绍 */}
                    {mode === 'project' && (
                        <div className="space-y-2">
                            <label className="glass-field-label block">
                                {t('modal.introduction')}
                            </label>
                            <textarea
                                value={editingIntroduction}
                                onChange={(e) => setEditingIntroduction(e.target.value)}
                                rows={3}
                                className="glass-textarea-base w-full px-3 py-2 resize-none"
                                placeholder={t('modal.introductionPlaceholder')}
                            />
                            <p className="glass-field-hint">
                                {t('modal.introductionTip')}
                            </p>
                        </div>
                    )}

                    {/* === 1. 基础信息区域 === */}
                    <PropertySection
                        title={t('unifiedPanel.sections.basic')}
                        icon="user"
                        isExpanded={expandedSections.basic}
                        onToggle={() => toggleSection('basic')}
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('basicAttributes.gender')}
                                </label>
                                <input
                                    type="text"
                                    value={editingGender}
                                    onChange={(e) => setEditingGender(e.target.value)}
                                    className="glass-input-base w-full px-3 py-1.5 text-sm"
                                    placeholder={t('basicAttributes.genderPlaceholder')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('basicAttributes.age')}
                                </label>
                                <input
                                    type="text"
                                    value={editingAgeRange}
                                    onChange={(e) => setEditingAgeRange(e.target.value)}
                                    className="glass-input-base w-full px-3 py-1.5 text-sm"
                                    placeholder={t('basicAttributes.agePlaceholder')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('basicAttributes.identity')}
                                </label>
                                <input
                                    type="text"
                                    value={editingIdentity}
                                    onChange={(e) => setEditingIdentity(e.target.value)}
                                    className="glass-input-base w-full px-3 py-1.5 text-sm"
                                    placeholder={t('basicAttributes.identityPlaceholder')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('basicAttributes.height')}
                                </label>
                                <input
                                    type="text"
                                    value={editingHeight}
                                    onChange={(e) => setEditingHeight(e.target.value)}
                                    className="glass-input-base w-full px-3 py-1.5 text-sm"
                                    placeholder={t('basicAttributes.heightPlaceholder')}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5 mt-4">
                            <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                {t('basicAttributes.bodyType')}
                            </label>
                            <input
                                type="text"
                                value={editingBodyType}
                                onChange={(e) => setEditingBodyType(e.target.value)}
                                className="glass-input-base w-full px-3 py-1.5 text-sm"
                                placeholder={t('basicAttributes.bodyTypePlaceholder')}
                            />
                        </div>
                    </PropertySection>

                    {/* === 2. 角色定位区域 === */}
                    <PropertySection
                        title={t('unifiedPanel.sections.positioning')}
                        icon="crown"
                        isExpanded={expandedSections.positioning}
                        onToggle={() => toggleSection('positioning')}
                    >
                        <div className="space-y-4">
                            {/* 角色层级 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('characterProfile.importanceLevel')}
                                </label>
                                <select
                                    value={editingRoleLevel}
                                    onChange={(e) => setEditingRoleLevel(e.target.value as RoleLevel)}
                                    className="glass-select-base w-full px-3 py-2"
                                >
                                    {ROLE_LEVELS.map((level) => (
                                        <option key={level} value={level}>
                                            {t(`characterProfile.importance.${level}` as never)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 角色原型 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('characterProfile.characterArchetype')}
                                </label>
                                <input
                                    type="text"
                                    value={editingArchetype}
                                    onChange={(e) => setEditingArchetype(e.target.value)}
                                    className="glass-input-base w-full px-3 py-1.5 text-sm"
                                    placeholder={t('characterProfile.archetypePlaceholder')}
                                />
                            </div>

                            {/* 性格标签 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('characterProfile.personalityTags')}
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {editingPersonalityTags.map((tag, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)] rounded-lg text-xs">
                                            {tag}
                                            <button
                                                type="button"
                                                onClick={() => removePersonalityTag(i)}
                                                className="inline-flex h-4 w-4 items-center justify-center hover:text-[var(--glass-text-primary)]"
                                            >
                                                <AppIcon name="closeSm" className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newPersonalityTag}
                                        onChange={(e) => setNewPersonalityTag(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPersonalityTag())}
                                        className="glass-input-base flex-1 px-3 py-1.5 text-sm"
                                        placeholder={t('characterProfile.addTagPlaceholder')}
                                    />
                                    <button
                                        type="button"
                                        onClick={addPersonalityTag}
                                        disabled={!newPersonalityTag.trim()}
                                        className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-sm rounded-lg disabled:opacity-50"
                                    >
                                        {t('common.add')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </PropertySection>

                    {/* === 3. 视觉设定区域 === */}
                    <PropertySection
                        title={t('unifiedPanel.sections.visual')}
                        icon="palette"
                        isExpanded={expandedSections.visual}
                        onToggle={() => toggleSection('visual')}
                    >
                        <div className="space-y-4">
                            {/* 时代和阶层 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                        {t('unifiedPanel.fields.era')}
                                    </label>
                                    <input
                                        type="text"
                                        value={editingEraPeriod}
                                        onChange={(e) => setEditingEraPeriod(e.target.value)}
                                        className="glass-input-base w-full px-3 py-1.5 text-sm"
                                        placeholder={t('unifiedPanel.placeholders.era')}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                        {t('unifiedPanel.fields.socialClass')}
                                    </label>
                                    <input
                                        type="text"
                                        value={editingSocialClass}
                                        onChange={(e) => setEditingSocialClass(e.target.value)}
                                        className="glass-input-base w-full px-3 py-1.5 text-sm"
                                        placeholder={t('unifiedPanel.placeholders.socialClass')}
                                    />
                                </div>
                            </div>

                            {/* 服装华丽度 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('characterProfile.costumeLevelLabel')}
                                </label>
                                <select
                                    value={editingCostumeTier}
                                    onChange={(e) => setEditingCostumeTier(Number(e.target.value) as CostumeTier)}
                                    className="glass-select-base w-full px-3 py-2"
                                >
                                    {COSTUME_TIERS.map((tier) => (
                                        <option key={tier} value={tier}>
                                            {t(`characterProfile.costumeLevel.${tier}` as never)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* 建议色彩 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('characterProfile.suggestedColors')}
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {editingSuggestedColors.map((color, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--glass-bg-muted)] text-[var(--glass-text-secondary)] rounded-lg text-xs">
                                            {color}
                                            <button
                                                type="button"
                                                onClick={() => removeColor(i)}
                                                className="inline-flex h-4 w-4 items-center justify-center hover:text-[var(--glass-text-primary)]"
                                            >
                                                <AppIcon name="closeSm" className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newColor}
                                        onChange={(e) => setNewColor(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addColor())}
                                        className="glass-input-base flex-1 px-3 py-1.5 text-sm"
                                        placeholder={t('characterProfile.colorPlaceholder')}
                                    />
                                    <button
                                        type="button"
                                        onClick={addColor}
                                        disabled={!newColor.trim()}
                                        className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-sm rounded-lg disabled:opacity-50"
                                    >
                                        {t('common.add')}
                                    </button>
                                </div>
                            </div>

                            {/* 辨识标志 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('characterProfile.primaryMarker')}
                                    <span className="text-xs text-[var(--glass-text-tertiary)] ml-1">
                                        {t('characterProfile.markerNote')}
                                    </span>
                                </label>
                                <input
                                    type="text"
                                    value={editingPrimaryIdentifier}
                                    onChange={(e) => setEditingPrimaryIdentifier(e.target.value)}
                                    className="glass-input-base w-full px-3 py-1.5 text-sm"
                                    placeholder={t('characterProfile.markingsPlaceholder')}
                                />
                            </div>

                            {/* 视觉关键词 */}
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                    {t('characterProfile.visualKeywords')}
                                </label>
                                <div className="flex flex-wrap gap-1.5 mb-2">
                                    {editingVisualKeywords.map((keyword, i) => (
                                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--glass-tone-info-bg)] text-[var(--glass-tone-info-fg)] rounded-lg text-xs">
                                            {keyword}
                                            <button
                                                type="button"
                                                onClick={() => removeKeyword(i)}
                                                className="inline-flex h-4 w-4 items-center justify-center hover:text-[var(--glass-text-primary)]"
                                            >
                                                <AppIcon name="closeSm" className="h-3 w-3" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newKeyword}
                                        onChange={(e) => setNewKeyword(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                                        className="glass-input-base flex-1 px-3 py-1.5 text-sm"
                                        placeholder={t('characterProfile.keywordsPlaceholder')}
                                    />
                                    <button
                                        type="button"
                                        onClick={addKeyword}
                                        disabled={!newKeyword.trim()}
                                        className="glass-btn-base glass-btn-secondary px-3 py-1.5 text-sm rounded-lg disabled:opacity-50"
                                    >
                                        {t('common.add')}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </PropertySection>

                    {/* === 4. AI 提示词区域 === */}
                    <PropertySection
                        title={t('unifiedPanel.sections.prompts')}
                        icon="sparkles"
                        isExpanded={expandedSections.prompts}
                        onToggle={() => toggleSection('prompts')}
                    >
                        <div className="space-y-4">
                            {/* 文生图提示词 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                        {t('character.imagePrompt')}
                                    </label>
                                    {isGeneratingImagePrompt && (
                                        <span className="text-xs text-[var(--glass-text-tertiary)] flex items-center gap-1">
                                            <AppIcon name="loader" className="w-3 h-3 animate-spin" />
                                            {t('unifiedPanel.generating')}
                                        </span>
                                    )}
                                </div>
                                <textarea
                                    value={imagePrompt}
                                    onChange={(e) => setImagePrompt(e.target.value)}
                                    rows={4}
                                    className="glass-textarea-base w-full px-3 py-2 text-sm resize-none"
                                    placeholder={t('modal.imagePromptPlaceholder')}
                                />
                                <p className="text-xs text-[var(--glass-text-tertiary)]">
                                    {t('unifiedPanel.imagePromptHint')}
                                </p>
                            </div>

                            {/* 音色提示词 */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-medium text-[var(--glass-text-secondary)]">
                                        {t('unifiedPanel.fields.voicePrompt')}
                                    </label>
                                </div>
                                <textarea
                                    value={voicePrompt}
                                    onChange={(e) => setVoicePrompt(e.target.value)}
                                    rows={3}
                                    className="glass-textarea-base w-full px-3 py-2 text-sm resize-none"
                                    placeholder={t('unifiedPanel.placeholders.voicePrompt')}
                                />
                                <p className="text-xs text-[var(--glass-text-tertiary)]">
                                    {t('unifiedPanel.voicePromptHint')}
                                </p>
                            </div>
                        </div>
                    </PropertySection>

                    {/* 形象描述 */}
                    <div className="space-y-2">
                        <label className="glass-field-label block">
                            {t('modal.appearancePrompt')}
                        </label>
                        <textarea
                            value={editingDescription}
                            onChange={(e) => setEditingDescription(e.target.value)}
                            rows={6}
                            className="glass-textarea-base w-full px-3 py-2 resize-none"
                            placeholder={t('modal.descPlaceholder')}
                        />
                    </div>
                </div>

                {/* 底部按钮 */}
                <div className="flex gap-3 justify-end p-4 border-t border-[var(--glass-stroke-base)] bg-[var(--glass-bg-surface-strong)] rounded-b-lg flex-shrink-0">
                    <button
                        onClick={onClose}
                        className="glass-btn-base glass-btn-secondary px-4 py-2 rounded-lg"
                        disabled={generationPhase !== 'idle'}
                    >
                        {t('common.cancel')}
                    </button>
                    <button
                        onClick={handleConfirmAndGenerate}
                        disabled={generationPhase !== 'idle' || !editingDescription.trim()}
                        className="glass-btn-base glass-btn-primary px-6 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {generationPhase !== 'idle' ? (
                            <TaskStatusInline state={generationState} className="text-white [&>span]:text-white [&_svg]:text-white" />
                        ) : (
                            t('characterProfile.confirmAndGenerate')
                        )}
                    </button>
                </div>
            </div>

            {/* 重新生成警告对话框 */}
            {showRegenerateWarning && (
                <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4 glass-overlay">
                    <div className="glass-surface-modal w-full max-w-sm p-5 text-center">
                        <div className="w-12 h-12 mx-auto glass-chip glass-chip-warning rounded-full flex items-center justify-center mb-3 p-0">
                            <AppIcon name="alert" className="w-6 h-6 text-[var(--glass-tone-warning-fg)]" />
                        </div>
                        <h3 className="font-semibold text-[var(--glass-text-primary)] mb-2">
                            {t('unifiedPanel.regenerateWarning.title')}
                        </h3>
                        <p className="text-sm text-[var(--glass-text-secondary)] mb-4">
                            {t('unifiedPanel.regenerateWarning.message')}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowRegenerateWarning(false)}
                                className="glass-btn-base glass-btn-secondary flex-1 py-2 rounded-lg text-sm"
                            >
                                {t('common.cancel')}
                            </button>
                            <button
                                onClick={doConfirmAndGenerate}
                                className="glass-btn-base glass-btn-primary flex-1 py-2 rounded-lg text-sm"
                            >
                                {t('unifiedPanel.regenerateWarning.confirm')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )

    return createPortal(content, document.body)
}

// ===== 折叠面板组件 =====
interface PropertySectionProps {
    title: string
    icon: AppIconName
    isExpanded: boolean
    onToggle: () => void
    children: React.ReactNode
}

function PropertySection({ title, icon, isExpanded, onToggle, children }: PropertySectionProps) {
    return (
        <div className="border border-[var(--glass-stroke-base)] rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={onToggle}
                className="w-full flex items-center gap-2 px-4 py-3 bg-[var(--glass-bg-muted)] hover:bg-[var(--glass-bg-surface-strong)] transition-colors"
            >
                <AppIcon name={icon} className="w-4 h-4 text-[var(--glass-text-tertiary)]" />
                <span className="text-sm font-medium text-[var(--glass-text-primary)] flex-1 text-left">
                    {title}
                </span>
                <AppIcon
                    name="chevronDown"
                    className={`w-4 h-4 text-[var(--glass-text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>
            {isExpanded && (
                <div className="p-4 bg-[var(--glass-bg-surface)]">
                    {children}
                </div>
            )}
        </div>
    )
}
