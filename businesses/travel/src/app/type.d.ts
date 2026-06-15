export type TExcludeDate =
  | Array<{
      date: Date
      message?: string
    }>
  | Array<Date>

export type TExcludeDateIntervals = Array<{
  start: Date
  end: Date
}>
