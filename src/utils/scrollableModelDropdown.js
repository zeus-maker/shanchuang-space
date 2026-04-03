/**
 * 模型选项过多时：n-dropdown / n-select 菜单限制高度并可滚动（各节点与画布批量面板共用）
 */

const MENU_STYLE = Object.freeze({
  maxHeight: 'min(360px, 55vh)'
})

/** n-dropdown 的 menu-props（函数形态，供 Naive 调用） */
export function scrollableModelDropdownMenuProps () {
  return { style: { ...MENU_STYLE } }
}

/** n-select 的 menu-props（对象形态） */
export const scrollableModelSelectMenuProps = Object.freeze({
  style: { ...MENU_STYLE }
})
