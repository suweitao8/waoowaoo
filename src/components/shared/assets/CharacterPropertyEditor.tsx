'use client'

/**
 * 角色属性编辑组件
 *
 * 可复用于 CharacterEditModal 和 UnifiedCharacterPropertyPanel
 *
 * @features
 * - 基础信息编辑：性别、年龄、身份、身高、外貌体型
 * - 性格标签：支持添加、删除
 * - 视觉设定（可选）：时代、社会阶层、角色层级、原型、服装华丽度、建议色彩、辨识标志、视觉关键词
 * - 可折叠面板模式
 *
 * @example
 * ```tsx
 * <CharacterPropertyEditor
 *   profileData={profileData}
 *   onChange={handleProfileDataChange}
 *   collapsible={true}
 *   defaultExpanded={true}
 *   showAllProperties={true}
 * />
 * ```
 */

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { AppIcon } from '@/components/ui/icons'
import { CharacterProfileData, RoleLevel, CostumeTier } from '@/types/character-profile'

// 角色层级选项
const ROLE_LEVELS: RoleLevel[] = ['S', 'A', 'B', 'C', 'D']
// 服装华丽度选项 (从高到低显示)
const COSTUME_TIERS: CostumeTier[] = [5, 4, 3, 2, 1]

export interface CharacterPropertyEditorProps {
    /** 初始档案数据 */
    profileData: CharacterProfileData | null
    /** 属性变更回调 */
    onChange: (profileData: CharacterProfileData) => void
    /** 是否显示折叠面板 */
    collapsible?: boolean
    /** 初始折叠状态 */
    defaultExpanded?: boolean
    /** 是否显示所有属性（包括视觉设定） */
    showAllProperties?: boolean
}

export function CharacterPropertyEditor({
    profileData: initialProfileData,
    onChange,
    collapsible = true,
    defaultExpanded = true,
    showAllProperties = false,
}: CharacterPropertyEditorProps) {
    const t = useTranslations('assets')
    const [isExpanded, setIsExpanded] = useState(defaultExpanded)

    // 基础信息
    const [gender, setGender] = useState(initialProfileData?.gender || '')
    const [ageRange, setAgeRange] = useState(initialProfileData?.age_range || '')
    const [identity, setIdentity] = useState(initialProfileData?.identity || '')
    const [height, setHeight] = useState(initialProfileData?.height || '')
    const [bodyType, setBodyType] = useState(initialProfileData?.body_type || '')

    // 角色定位
    const [roleLevel, setRoleLevel] = useState<RoleLevel>(initialProfileData?.role_level || 'C')
    const [archetype, setArchetype] = useState(initialProfileData?.archetype || '')
    const [personalityTags, setPersonalityTags] = useState<string[]>(initialProfileData?.personality_tags || [])

    // 视觉设定
    const [eraPeriod, setEraPeriod] = useState(initialProfileData?.era_period || '')
    const [socialClass, setSocialClass] = useState(initialProfileData?.social_class || '')
    const [costumeTier, setCostumeTier] = useState<CostumeTier>(initialProfileData?.costume_tier || 3)
    const [suggestedColors, setSuggestedColors] = useState<string[]>(initialProfileData?.suggested_colors || [])
    const [primaryIdentifier, setPrimaryIdentifier] = useState(initialProfileData?.primary_identifier || '')
    const [visualKeywords, setVisualKeywords] = useState<string[]>(initialProfileData?.visual_keywords || [])

    // 标签输入状态
    const [newPersonalityTag, setNewPersonalityTag] = useState('')
    const [newColor, setNewColor] = useState('')
    const [newKeyword, setNewKeyword] = useState('')

    // 构建并通知变更
    const notifyChange = useCallback(() => {
        const newProfileData: CharacterProfileData = {
            role_level: roleLevel,
            archetype,
            personality_tags: personalityTags,
            era_period: eraPeriod,
            social_class: socialClass,
            identity: identity || undefined,
            height: height || undefined,
            body_type: bodyType || undefined,
            costume_tier: costumeTier,
            suggested_colors: suggestedColors,
            primary_identifier: primaryIdentifier || undefined,
            visual_keywords: visualKeywords,
            gender,
            age_range: ageRange,
        }
        onChange(newProfileData)
    }, [roleLevel, archetype, personalityTags, eraPeriod, socialClass, identity, height, bodyType, costumeTier, suggestedColors, primaryIdentifier, visualKeywords, gender, ageRange, onChange])

    // 标签操作
    const addPersonalityTag = useCallback(() => {
        const tag = newPersonalityTag.trim()
        if (tag && !personalityTags.includes(tag)) {
            setPersonalityTags([...personalityTags, tag])
            setNewPersonalityTag('')
            setTimeout(notifyChange, 0)
        }
    }, [newPersonalityTag, personalityTags, notifyChange])

    const removePersonalityTag = useCallback((index: number) => {
        setPersonalityTags(personalityTags.filter((_, i) => i !== index))
        setTimeout(notifyChange, 0)
    }, [personalityTags, notifyChange])

    const addColor = useCallback(() => {
        const color = newColor.trim()
        if (color && !suggestedColors.includes(color)) {
            setSuggestedColors([...suggestedColors, color])
            setNewColor('')
            setTimeout(notifyChange, 0)
        }
    }, [newColor, suggestedColors, notifyChange])

    const removeColor = useCallback((index: number) => {
        setSuggestedColors(suggestedColors.filter((_, i) => i !== index))
        setTimeout(notifyChange, 0)
    }, [suggestedColors, notifyChange])

    const addKeyword = useCallback(() => {
        const keyword = newKeyword.trim()
        if (keyword && !visualKeywords.includes(keyword)) {
            setVisualKeywords([...visualKeywords, keyword])
            setNewKeyword('')
            setTimeout(notifyChange, 0)
        }
    }, [newKeyword, visualKeywords, notifyChange])

    const removeKeyword = useCallback((index: number) => {
        setVisualKeywords(visualKeywords.filter((_, i) => i !== index))
        setTimeout(notifyChange, 0)
    }, [visualKeywords, notifyChange])

    // 创建输入变更处理器
    const createChangeHandler = (setter: (value: string) => void) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setter(e.target.value)
        setTimeout(notifyChange, 0)
    }

    const content = (
        <div className="space-y-4">
            {/* 第一行：性别、年龄 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                        {t('basicAttributes.gender')}
                    </label>
                    <input
                        type="text"
                        value={gender}
                        onChange={createChangeHandler(setGender)}
                        className="pin-input-base w-full px-3 py-1.5 text-sm"
                        placeholder={t('basicAttributes.genderPlaceholder')}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                        {t('basicAttributes.age')}
                    </label>
                    <input
                        type="text"
                        value={ageRange}
                        onChange={createChangeHandler(setAgeRange)}
                        className="pin-input-base w-full px-3 py-1.5 text-sm"
                        placeholder={t('basicAttributes.agePlaceholder')}
                    />
                </div>
            </div>

            {/* 第二行：身份、身高 */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                        {t('basicAttributes.identity')}
                    </label>
                    <input
                        type="text"
                        value={identity}
                        onChange={createChangeHandler(setIdentity)}
                        className="pin-input-base w-full px-3 py-1.5 text-sm"
                        placeholder={t('basicAttributes.identityPlaceholder')}
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                        {t('basicAttributes.height')}
                    </label>
                    <input
                        type="text"
                        value={height}
                        onChange={createChangeHandler(setHeight)}
                        className="pin-input-base w-full px-3 py-1.5 text-sm"
                        placeholder={t('basicAttributes.heightPlaceholder')}
                    />
                </div>
            </div>

            {/* 第三行：外貌体型 */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                    {t('basicAttributes.bodyType')}
                </label>
                <input
                    type="text"
                    value={bodyType}
                    onChange={createChangeHandler(setBodyType)}
                    className="pin-input-base w-full px-3 py-1.5 text-sm"
                    placeholder={t('basicAttributes.bodyTypePlaceholder')}
                />
            </div>

            {/* 性格标签 */}
            <div className="space-y-1.5">
                <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                    {t('basicAttributes.personality')}
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                    {personalityTags.map((tag, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)] rounded-lg text-xs">
                            {tag}
                            <button
                                type="button"
                                onClick={() => removePersonalityTag(i)}
                                className="inline-flex h-4 w-4 items-center justify-center hover:text-[var(--pin-text-primary)]"
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
                        className="pin-input-base flex-1 px-3 py-1.5 text-sm"
                        placeholder={t('basicAttributes.personalityPlaceholder')}
                    />
                    <button
                        type="button"
                        onClick={addPersonalityTag}
                        disabled={!newPersonalityTag.trim()}
                        className="pin-btn-base pin-btn-secondary px-3 py-1.5 text-sm rounded-lg disabled:opacity-50"
                    >
                        {t('common.add')}
                    </button>
                </div>
            </div>

            {/* 扩展属性：视觉设定 */}
            {showAllProperties && (
                <>
                    {/* 时代和阶层 */}
                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-[var(--pin-stroke-base)]">
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                                {t('unifiedPanel.fields.era')}
                            </label>
                            <input
                                type="text"
                                value={eraPeriod}
                                onChange={createChangeHandler(setEraPeriod)}
                                className="pin-input-base w-full px-3 py-1.5 text-sm"
                                placeholder={t('unifiedPanel.placeholders.era')}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                                {t('unifiedPanel.fields.socialClass')}
                            </label>
                            <input
                                type="text"
                                value={socialClass}
                                onChange={createChangeHandler(setSocialClass)}
                                className="pin-input-base w-full px-3 py-1.5 text-sm"
                                placeholder={t('unifiedPanel.placeholders.socialClass')}
                            />
                        </div>
                    </div>

                    {/* 角色层级 */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                            {t('characterProfile.importanceLevel')}
                        </label>
                        <select
                            value={roleLevel}
                            onChange={createChangeHandler((v) => setRoleLevel(v as RoleLevel))}
                            className="pin-select-base w-full px-3 py-2"
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
                        <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                            {t('characterProfile.characterArchetype')}
                        </label>
                        <input
                            type="text"
                            value={archetype}
                            onChange={createChangeHandler(setArchetype)}
                            className="pin-input-base w-full px-3 py-1.5 text-sm"
                            placeholder={t('characterProfile.archetypePlaceholder')}
                        />
                    </div>

                    {/* 服装华丽度 */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                            {t('characterProfile.costumeLevelLabel')}
                        </label>
                        <select
                            value={costumeTier}
                            onChange={createChangeHandler((v) => setCostumeTier(Number(v) as CostumeTier))}
                            className="pin-select-base w-full px-3 py-2"
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
                        <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                            {t('characterProfile.suggestedColors')}
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {suggestedColors.map((color, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--pin-bg-muted)] text-[var(--pin-text-secondary)] rounded-lg text-xs">
                                    {color}
                                    <button
                                        type="button"
                                        onClick={() => removeColor(i)}
                                        className="inline-flex h-4 w-4 items-center justify-center hover:text-[var(--pin-text-primary)]"
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
                                className="pin-input-base flex-1 px-3 py-1.5 text-sm"
                                placeholder={t('characterProfile.colorPlaceholder')}
                            />
                            <button
                                type="button"
                                onClick={addColor}
                                disabled={!newColor.trim()}
                                className="pin-btn-base pin-btn-secondary px-3 py-1.5 text-sm rounded-lg disabled:opacity-50"
                            >
                                {t('common.add')}
                            </button>
                        </div>
                    </div>

                    {/* 辨识标志 */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                            {t('characterProfile.primaryMarker')}
                            <span className="text-xs text-[var(--pin-text-tertiary)] ml-1">
                                {t('characterProfile.markerNote')}
                            </span>
                        </label>
                        <input
                            type="text"
                            value={primaryIdentifier}
                            onChange={createChangeHandler(setPrimaryIdentifier)}
                            className="pin-input-base w-full px-3 py-1.5 text-sm"
                            placeholder={t('characterProfile.markingsPlaceholder')}
                        />
                    </div>

                    {/* 视觉关键词 */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-[var(--pin-text-secondary)]">
                            {t('characterProfile.visualKeywords')}
                        </label>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                            {visualKeywords.map((keyword, i) => (
                                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--pin-tone-info-bg)] text-[var(--pin-tone-info-fg)] rounded-lg text-xs">
                                    {keyword}
                                    <button
                                        type="button"
                                        onClick={() => removeKeyword(i)}
                                        className="inline-flex h-4 w-4 items-center justify-center hover:text-[var(--pin-text-primary)]"
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
                                className="pin-input-base flex-1 px-3 py-1.5 text-sm"
                                placeholder={t('characterProfile.keywordsPlaceholder')}
                            />
                            <button
                                type="button"
                                onClick={addKeyword}
                                disabled={!newKeyword.trim()}
                                className="pin-btn-base pin-btn-secondary px-3 py-1.5 text-sm rounded-lg disabled:opacity-50"
                            >
                                {t('common.add')}
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    )

    if (!collapsible) {
        return content
    }

    return (
        <div className="border border-[var(--pin-stroke-base)] rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--pin-bg-muted)] hover:bg-[var(--pin-bg-surface-strong)] transition-colors"
            >
                <span className="text-sm font-medium text-[var(--pin-text-primary)]">
                    {t('basicAttributes.title')}
                </span>
                <AppIcon
                    name="chevronDown"
                    className={`w-4 h-4 text-[var(--pin-text-tertiary)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                />
            </button>
            {isExpanded && (
                <div className="p-4 bg-[var(--pin-bg-surface)]">
                    {content}
                </div>
            )}
        </div>
    )
}
