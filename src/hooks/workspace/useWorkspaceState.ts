'use client'

import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY_PREFIX = 'waoowaoo_workspace_state_'

export interface WorkspaceState {
    /** 当前选中的剧集ID */
    episodeId: string | null
    /** 当前选中的阶段 (story/script/storyboard/editor) */
    stage: string | null
    /** 搜索关键词 */
    searchQuery: string
}

const DEFAULT_STATE: WorkspaceState = {
    episodeId: null,
    stage: null,
    searchQuery: '',
}

/**
 * 工作区状态持久化 Hook
 * 将项目状态保存到 localStorage，下次打开时自动恢复
 */
export function useWorkspaceState(projectId: string) {
    const storageKey = `${STORAGE_KEY_PREFIX}${projectId}`

    // 从 localStorage 读取初始状态
    const getInitialState = useCallback((): WorkspaceState => {
        if (typeof window === 'undefined') return DEFAULT_STATE

        try {
            const stored = localStorage.getItem(storageKey)
            if (stored) {
                const parsed = JSON.parse(stored) as WorkspaceState
                return {
                    episodeId: parsed.episodeId ?? null,
                    stage: parsed.stage ?? null,
                    searchQuery: parsed.searchQuery ?? '',
                }
            }
        } catch (e) {
            console.error('Failed to parse workspace state from localStorage:', e)
        }
        return DEFAULT_STATE
    }, [storageKey])

    const [state, setState] = useState<WorkspaceState>(DEFAULT_STATE)

    // 初始化时从 localStorage 读取
    useEffect(() => {
        const initialState = getInitialState()
        setState(initialState)
    }, [getInitialState])

    // 保存状态到 localStorage
    const saveState = useCallback((newState: Partial<WorkspaceState>) => {
        setState(prev => {
            const updated = { ...prev, ...newState }
            try {
                localStorage.setItem(storageKey, JSON.stringify(updated))
            } catch (e) {
                console.error('Failed to save workspace state to localStorage:', e)
            }
            return updated
        })
    }, [storageKey])

    // 保存剧集ID
    const saveEpisodeId = useCallback((episodeId: string | null) => {
        saveState({ episodeId })
    }, [saveState])

    // 保存阶段
    const saveStage = useCallback((stage: string | null) => {
        saveState({ stage })
    }, [saveState])

    // 保存搜索关键词
    const saveSearchQuery = useCallback((searchQuery: string) => {
        saveState({ searchQuery })
    }, [saveState])

    // 清除所有状态
    const clearState = useCallback(() => {
        try {
            localStorage.removeItem(storageKey)
        } catch (e) {
            console.error('Failed to clear workspace state from localStorage:', e)
        }
        setState(DEFAULT_STATE)
    }, [storageKey])

    return {
        state,
        saveEpisodeId,
        saveStage,
        saveSearchQuery,
        clearState,
    }
}
