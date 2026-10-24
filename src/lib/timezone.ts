export interface TimezoneInfo {
  /** IANA 时区，如 Asia/Shanghai */
  id: string;
  /** UTC 偏移字符串，如 +08:00 */
  utc: string;
}

let cache: TimezoneInfo | null = null;
let inflight: Promise<TimezoneInfo | null> | null = null;

// 启动时尝试从本地读取上次的结果
try {
  const saved = localStorage.getItem('tz');
  if (saved) cache = JSON.parse(saved) as TimezoneInfo;
} catch {
  /* ignore */
}

/**
 * 通过访问者 IP 所在国家/地区判断时区。
 * 优先使用 ipwho.is（免费、支持 CORS，直接返回 timezone.id 与 timezone.utc），
 * 失败时回退到 ipinfo.io，再失败返回 null（由调用方使用本地时区兜底）。
 */
export function getTimezone(): Promise<TimezoneInfo | null> {
  if (cache) return Promise.resolve(cache);
  if (inflight) return inflight;

  inflight = (async () => {
    // 1) ipwho.is
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch('https://ipwho.is/', { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const id = data?.timezone?.id as string | undefined;
        const utc = data?.timezone?.utc as string | undefined;
        if (id && utc) {
          cache = { id, utc };
          try {
            localStorage.setItem('tz', JSON.stringify(cache));
          } catch {
            /* ignore */
          }
          return cache;
        }
      }
    } catch {
      /* 继续尝试下一个来源 */
    }

    // 2) ipinfo.io（仅返回 IANA id，需自行计算偏移）
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch('https://ipinfo.io/json', { signal: ctrl.signal });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        const id = data?.timezone as string | undefined;
        if (id) {
          const utc = offsetForTimezone(id);
          if (utc) {
            cache = { id, utc };
            try {
              localStorage.setItem('tz', JSON.stringify(cache));
            } catch {
              /* ignore */
            }
            return cache;
          }
        }
      }
    } catch {
      /* ignore */
    }

    return null;
  })();

  return inflight;
}

/** 用 IANA 时区计算当前 UTC 偏移字符串，如 "Asia/Shanghai" -> "+08:00" */
function offsetForTimezone(id: string): string | null {
  try {
    const now = new Date();
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: id,
      timeZoneName: 'shortOffset',
    }).formatToParts(now);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value; // 形如 GMT+8
    if (tzName) {
      const m = tzName.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
      if (m) {
        const sign = m[1];
        const h = m[2].padStart(2, '0');
        const min = m[3] ? `:${m[3]}` : ':00';
        return `${sign}${h}${min}`;
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}
