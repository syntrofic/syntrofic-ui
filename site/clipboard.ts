export async function copyText(text: string) {
  const status = document.querySelector<HTMLElement>('.site-status')!
  try {
    await navigator.clipboard.writeText(text)
    status.textContent = '已复制到剪贴板'
    return true
  } catch {
    status.textContent = '无法访问剪贴板，请选中文本手动复制。'
    return false
  }
}
