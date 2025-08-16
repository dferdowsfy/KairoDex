export const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}
