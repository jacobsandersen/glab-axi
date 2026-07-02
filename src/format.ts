export interface CountLineOptions {
  count: number;
  limit?: number;
  totalCount?: number;
  apiLimitHit?: boolean;
  displayLimit?: number;
}

export function formatCountLine(opts: CountLineOptions): string {
  const { count, limit, totalCount, apiLimitHit, displayLimit } = opts;

  if (apiLimitHit) {
    return `count: ${count}+ (GitLab search API limit reached)`;
  }

  if (totalCount !== undefined && totalCount !== null) {
    return `count: ${count} of ${totalCount} total`;
  }

  if (displayLimit !== undefined && count > displayLimit) {
    return `count: ${count} (showing first ${displayLimit})`;
  }

  if (limit !== undefined && count === limit && count > 0) {
    return `count: ${count} (showing first ${count})`;
  }

  return `count: ${count}`;
}
