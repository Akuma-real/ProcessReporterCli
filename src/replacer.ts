import { ignoreProcessNames, rules } from "./configs"
import { PushData, PushDto } from "./pusher"

export const pushDataReplacor = async (data: PushData) => {
  const processName = data.process

  if (
    ignoreProcessNames.some((ignoreName) => {
      if (typeof ignoreName === "string") {
        return processName === ignoreName
      } else if (ignoreName instanceof RegExp) {
        return ignoreName.test(processName)
      }
      return ignoreName(processName)
    })
  ) {
    return
  }

  const rule = rules.find(
    (rule) =>
      rule.matchApplication === data.process || rule.matchApplication === "*"
  )
  if (!rule) return data

  // 确保 iconUrl 和 iconBase64 的优先级处理
  const finalIconProps: PushDto["meta"] = {
    // 如果规则中有 override.iconUrl，使用它
    // 否则保留原有的 iconUrl
    // 如果都没有，保留 iconBase64
    iconUrl: rule.override?.iconUrl || data.iconUrl,
    iconBase64: rule.override?.iconUrl ? undefined : data.iconBase64,
  }

  const finalProcessName =
    rule.replace?.application?.(data.process) || data.process
  const finalDescription =
    rule.replace?.description?.(data.description) || data.description

  return {
    process: finalProcessName,
    description: finalDescription,
    ...finalIconProps,
  }
}
