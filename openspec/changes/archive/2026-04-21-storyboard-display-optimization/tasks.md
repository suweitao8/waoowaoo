## 1. 隐藏技术字段

- [x] 1.1 在 `PanelEditFormV2.tsx` 中移除 `videoPrompt` 字段的渲染代码
- [x] 1.2 在 `PanelEditFormV2.tsx` 中移除 `cameraMove` 字段的渲染代码

## 2. 新增对话/旁白展示

- [x] 2.1 在 `PanelEditFormV2.tsx` 中将 `sourceText` 改为必显示的对话/旁白区域
- [x] 2.2 添加对话/旁白展示的样式
- [x] 2.3 添加翻译 key（如 `dialogue`、`narration`、`sourceText`）

## 3. 剧本生成规则修改

- [x] 3.1 修改 `agent_storyboard_plan.zh.txt` prompt，添加规则：如果没有对话也没有旁白的纯镜头，必须生成旁白描述
- [x] 3.2 同步修改 `agent_storyboard_plan.en.txt` 英文版本
- [x] 3.3 确保每个分镜的 `source_text` 字段都有内容

## 4. 验证与测试

- [ ] 4.1 测试剧本生成：验证纯镜头是否转为旁白描述
- [ ] 4.2 测试分镜展示：验证每个分镜都显示对话/旁白内容
- [ ] 4.3 测试隐藏字段：验证视频提示词和镜头运动字段已隐藏
