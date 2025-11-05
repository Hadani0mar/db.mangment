import Cookies from 'js-cookie';

const COOKIE_PREFIX = 'db_app_';
const COOKIE_OPTIONS = {
  expires: 7, // 7 أيام
  sameSite: 'strict' as const,
  secure: process.env.NODE_ENV === 'production',
};

export const cookieKeys = {
  dbConnection: `${COOKIE_PREFIX}db_connection`,
  lastFetchTime: `${COOKIE_PREFIX}last_fetch_time`,
  consent: 'cookie_consent_accepted',
  reportSchedule: `${COOKIE_PREFIX}report_schedule`,
} as const;

// التحقق من موافقة المستخدم على الكوكيز
export function hasCookieConsent(): boolean {
  try {
    const consent = Cookies.get(cookieKeys.consent);
    return consent === 'true';
  } catch (error) {
    console.error('Error checking cookie consent:', error);
    return false;
  }
}

// حفظ بيانات الاتصال في الكوكيز (بدون معلومات حساسة)
export function setDbConnectionCookie(data: any) {
  // التحقق من موافقة المستخدم أولاً
  if (!hasCookieConsent()) {
    console.warn('Cannot set cookie: User has not consented');
    return false;
  }
  
  try {
    // إزالة المعلومات الحساسة قبل الحفظ
    const safeData = {
      id: data?.id,
      user_id: data?.user_id,
      server_name: data?.server_name,
      server_address: data?.server_address,
      database_name: data?.database_name,
      username: data?.username,
      sql_server_version: data?.sql_server_version,
      sql_server_full_version: data?.sql_server_full_version,
      is_active: data?.is_active,
      last_connected_at: data?.last_connected_at,
      created_at: data?.created_at,
      updated_at: data?.updated_at,
      // لا نحفظ password_encrypted أو أي معلومات حساسة
    };
    
    Cookies.set(cookieKeys.dbConnection, JSON.stringify(safeData), COOKIE_OPTIONS);
    Cookies.set(cookieKeys.lastFetchTime, Date.now().toString(), COOKIE_OPTIONS);
    return true;
  } catch (error) {
    console.error('Error setting cookie:', error);
    return false;
  }
}

// قراءة بيانات الاتصال من الكوكيز
export function getDbConnectionCookie(): any | null {
  // التحقق من موافقة المستخدم أولاً
  if (!hasCookieConsent()) {
    return null;
  }
  
  try {
    const data = Cookies.get(cookieKeys.dbConnection);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading cookie:', error);
  }
  return null;
}

// التحقق من عمر البيانات في الكوكيز (بالثواني)
export function getCookieAge(): number | null {
  try {
    const lastFetchTime = Cookies.get(cookieKeys.lastFetchTime);
    if (lastFetchTime) {
      const age = Date.now() - parseInt(lastFetchTime, 10);
      return Math.floor(age / 1000); // بالثواني
    }
  } catch (error) {
    console.error('Error reading cookie age:', error);
  }
  return null;
}

// حذف بيانات الاتصال من الكوكيز
export function removeDbConnectionCookie() {
  try {
    Cookies.remove(cookieKeys.dbConnection);
    Cookies.remove(cookieKeys.lastFetchTime);
  } catch (error) {
    console.error('Error removing cookie:', error);
  }
}

// التحقق من صحة البيانات (أقل من 5 دقائق = fresh)
export function isCookieDataFresh(maxAge: number = 300): boolean {
  const age = getCookieAge();
  if (age === null) return false;
  return age < maxAge; // 5 دقائق افتراضي
}

// حفظ إعدادات الجدولة (مع مفتاح للتقرير)
export function setReportSchedule(reportKey: string = 'default', schedule: any) {
  const storageKey = `report_schedule_${reportKey}`;
  
  if (!hasCookieConsent()) {
    console.warn('Cannot set schedule cookie: User has not consented');
    // حفظ في localStorage بدلاً من ذلك
    try {
      localStorage.setItem(storageKey, JSON.stringify(schedule));
      return true;
    } catch (error) {
      console.error('Error setting schedule in localStorage:', error);
      return false;
    }
  }
  
  try {
    const cookieKey = `${cookieKeys.reportSchedule}_${reportKey}`;
    Cookies.set(cookieKey, JSON.stringify(schedule), COOKIE_OPTIONS);
    // حفظ في localStorage أيضاً كنسخة احتياطية
    localStorage.setItem(storageKey, JSON.stringify(schedule));
    return true;
  } catch (error) {
    console.error('Error setting schedule cookie:', error);
    // محاولة localStorage كبديل
    try {
      localStorage.setItem(storageKey, JSON.stringify(schedule));
      return true;
    } catch (e) {
      console.error('Error setting schedule in localStorage:', e);
      return false;
    }
  }
}

// قراءة إعدادات الجدولة (مع مفتاح للتقرير)
export function getReportSchedule(reportKey: string = 'default'): any | null {
  const storageKey = `report_schedule_${reportKey}`;
  const cookieKey = `${cookieKeys.reportSchedule}_${reportKey}`;
  
  // محاولة قراءة من cookies أولاً
  if (hasCookieConsent()) {
    try {
      const cookieData = Cookies.get(cookieKey);
      if (cookieData) {
        return JSON.parse(cookieData);
      }
    } catch (error) {
      console.error('Error reading schedule from cookie:', error);
    }
  }
  
  // إذا لم توجد في cookies، جرب localStorage
  try {
    const localData = localStorage.getItem(storageKey);
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (error) {
    console.error('Error reading schedule from localStorage:', error);
  }
  
  return null;
}

// حذف إعدادات الجدولة (مع مفتاح للتقرير)
export function removeReportSchedule(reportKey: string = 'default') {
  const storageKey = `report_schedule_${reportKey}`;
  const cookieKey = `${cookieKeys.reportSchedule}_${reportKey}`;
  
  try {
    Cookies.remove(cookieKey);
    localStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Error removing schedule:', error);
  }
}

// تخزين نتائج التقارير محلياً
const REPORT_CACHE_PREFIX = 'report_cache_';
const REPORT_CACHE_TIMESTAMP_PREFIX = 'report_cache_timestamp_';
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ساعة

interface ReportCache<T = any> {
  data: T;
  timestamp: number;
  reportKey: string;
}

// حفظ نتائج التقرير محلياً
export function setReportCache<T>(reportKey: string, data: T): boolean {
  if (!hasCookieConsent()) {
    // إذا لم يكن هناك موافقة، استخدم localStorage فقط
    try {
      const cache: ReportCache<T> = {
        data,
        timestamp: Date.now(),
        reportKey,
      };
      localStorage.setItem(`${REPORT_CACHE_PREFIX}${reportKey}`, JSON.stringify(cache));
      localStorage.setItem(`${REPORT_CACHE_TIMESTAMP_PREFIX}${reportKey}`, Date.now().toString());
      return true;
    } catch (error) {
      console.error('Error setting report cache in localStorage:', error);
      return false;
    }
  }

  try {
    const cache: ReportCache<T> = {
      data,
      timestamp: Date.now(),
      reportKey,
    };
    
    // حفظ في Cookies
    Cookies.set(`${cookieKeys.reportSchedule}_cache_${reportKey}`, JSON.stringify(cache), {
      ...COOKIE_OPTIONS,
      expires: 7, // 7 أيام
    });
    
    // حفظ في localStorage كبديل
    localStorage.setItem(`${REPORT_CACHE_PREFIX}${reportKey}`, JSON.stringify(cache));
    localStorage.setItem(`${REPORT_CACHE_TIMESTAMP_PREFIX}${reportKey}`, Date.now().toString());
    
    return true;
  } catch (error) {
    console.error('Error setting report cache:', error);
    return false;
  }
}

// قراءة نتائج التقرير من التخزين المحلي
export function getReportCache<T>(reportKey: string): T | null {
  try {
    // محاولة القراءة من Cookies أولاً
    if (hasCookieConsent()) {
      const cookieData = Cookies.get(`${cookieKeys.reportSchedule}_cache_${reportKey}`);
      if (cookieData) {
        const cache: ReportCache<T> = JSON.parse(cookieData);
        // التحقق من صلاحية البيانات (24 ساعة)
        if (Date.now() - cache.timestamp < CACHE_DURATION_MS) {
          return cache.data;
        }
      }
    }
    
    // إذا لم توجد في Cookies أو انتهت صلاحيتها، جرب localStorage
    const localData = localStorage.getItem(`${REPORT_CACHE_PREFIX}${reportKey}`);
    if (localData) {
      const cache: ReportCache<T> = JSON.parse(localData);
      // التحقق من صلاحية البيانات (24 ساعة)
      if (Date.now() - cache.timestamp < CACHE_DURATION_MS) {
        return cache.data;
      } else {
        // البيانات منتهية الصلاحية، احذفها
        removeReportCache(reportKey);
      }
    }
  } catch (error) {
    console.error('Error reading report cache:', error);
  }
  
  return null;
}

// التحقق من صلاحية البيانات (هل مرت 24 ساعة)
export function isReportCacheValid(reportKey: string): boolean {
  try {
    let timestamp: number | null = null;
    
    // محاولة القراءة من Cookies
    if (hasCookieConsent()) {
      const cookieData = Cookies.get(`${cookieKeys.reportSchedule}_cache_${reportKey}`);
      if (cookieData) {
        const cache: ReportCache = JSON.parse(cookieData);
        timestamp = cache.timestamp;
      }
    }
    
    // إذا لم توجد في Cookies، جرب localStorage
    if (timestamp === null) {
      const timestampStr = localStorage.getItem(`${REPORT_CACHE_TIMESTAMP_PREFIX}${reportKey}`);
      if (timestampStr) {
        timestamp = parseInt(timestampStr, 10);
      }
    }
    
    if (timestamp === null) {
      return false;
    }
    
    // التحقق من مرور 24 ساعة
    return Date.now() - timestamp < CACHE_DURATION_MS;
  } catch (error) {
    console.error('Error checking report cache validity:', error);
    return false;
  }
}

// حذف نتائج التقرير من التخزين المحلي
export function removeReportCache(reportKey: string): void {
  try {
    Cookies.remove(`${cookieKeys.reportSchedule}_cache_${reportKey}`);
    localStorage.removeItem(`${REPORT_CACHE_PREFIX}${reportKey}`);
    localStorage.removeItem(`${REPORT_CACHE_TIMESTAMP_PREFIX}${reportKey}`);
  } catch (error) {
    console.error('Error removing report cache:', error);
  }
}

// حذف جميع نتائج التقارير من التخزين المحلي
export function clearAllReportCache(): void {
  try {
    // حذف من Cookies
    const cookies = Cookies.get();
    Object.keys(cookies).forEach(key => {
      if (key.includes('_cache_')) {
        Cookies.remove(key);
      }
    });
    
    // حذف من localStorage
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(REPORT_CACHE_PREFIX) || key.startsWith(REPORT_CACHE_TIMESTAMP_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.error('Error clearing all report cache:', error);
  }
}

