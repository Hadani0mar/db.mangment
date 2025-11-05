"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  Clock, 
  AlertCircle,
  TrendingDown,
} from "lucide-react";
import { getReportSchedule, getReportCache, setReportCache, isReportCacheValid } from "@/lib/cookies";

interface RequiredItem {
  اسم_الصنف: string;
  كود_الصنف: string;
  مدة_نفاذ_المخزون: number;
}

export function RequiredItemsReport() {
  const router = useRouter();
  const [data, setData] = useState<RequiredItem[]>([]);
  const [schedule] = useState(() => {
    const savedSchedule = getReportSchedule('required_items');
    return savedSchedule || {
      enabled: false,
      scheduleType: 'daily',
      interval: 1,
      time: '09:00',
      testMode: false,
      testInterval: 30,
    };
  });

  // تحميل البيانات تلقائياً عند تحميل الكومبوننت (بدون إشعارات)
  useEffect(() => {
    // محاولة تحميل البيانات من التخزين المحلي أولاً
    const cachedData = getReportCache<RequiredItem[]>('required_items');
    if (cachedData && isReportCacheValid('required_items')) {
      setData(cachedData);
    } else {
      // إذا لم توجد بيانات محلية أو انتهت صلاحيتها، جلب من الخادم
      executeQuery(false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إرسال إشعار المتصفح
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'required-items-report-notification',
        });

        notification.onclick = () => {
          window.focus();
          router.push("/reports/required-items");
          notification.close();
        };

        setTimeout(() => {
          notification.close();
        }, 5000);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }, [router]);

  const executeQuery = useCallback(async (showNotifications = true, forceRefresh = false) => {
    // إذا لم يكن forceRefresh، تحقق من التخزين المحلي أولاً
    if (!forceRefresh) {
      const cachedData = getReportCache<RequiredItem[]>('required_items');
      if (cachedData && isReportCacheValid('required_items')) {
        setData(cachedData);
        if (showNotifications) {
          toast.info('تم تحميل البيانات من التخزين المحلي', {
            description: `تم العثور على ${cachedData.length} صنف`,
          });
          setTimeout(() => {
            router.push("/reports/required-items");
          }, 1000);
        }
        return;
      }
    }

    setData([]);
    
    try {
      const response = await fetch('/api/reports/required-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: {} }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (showNotifications) {
          toast.error('خطأ في الاستجابة', {
            description: `${response.status} - ${errorText}`,
          });
        }
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        if (result.data && Array.isArray(result.data)) {
          setData(result.data);
          
          // حفظ البيانات في التخزين المحلي
          setReportCache('required_items', result.data);
          
          if (showNotifications) {
            if (result.data.length === 0) {
              toast.warning('تم إنشاء التقرير بنجاح', {
                description: 'ولكن لا توجد أصناف مطلوبة',
              });
              sendBrowserNotification(
                'تقرير الأصناف المطلوبة',
                'تم إنشاء التقرير بنجاح ولكن لا توجد أصناف مطلوبة'
              );
            } else {
              toast.success('تم إنشاء التقرير بنجاح', {
                description: `تم العثور على ${result.data.length} صنف - جاري التوجيه...`,
              });
              sendBrowserNotification(
                'تقرير الأصناف المطلوبة',
                `تم العثور على ${result.data.length} صنف - اضغط لعرض التفاصيل`
              );
              setTimeout(() => {
                router.push("/reports/required-items");
              }, 1000);
            }
          }
        } else {
          if (showNotifications) {
            toast.error('خطأ في البيانات', {
              description: 'البيانات المستلمة ليست في الصيغة الصحيحة',
            });
          }
        }
      } else {
        if (showNotifications) {
          toast.error('فشل إنشاء التقرير', {
            description: result.message || 'حدث خطأ غير متوقع',
          });
        }
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      if (showNotifications) {
        toast.error('حدث خطأ', {
          description: errorMessage,
        });
      }
    }
  }, [sendBrowserNotification, router]);


  // الجدولة التلقائية
  useEffect(() => {
    if (!schedule.enabled) {
      localStorage.removeItem('last_report_execution_required_items');
      localStorage.removeItem('next_report_execution_required_items');
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let isEnabled = schedule.enabled;

    const checkAndExecute = () => {
      if (!isEnabled || !schedule.enabled) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }

      const now = new Date();
      let nextExecution: Date | null = null;

      const [hours, minutes] = schedule.time.split(':').map(Number);
      const todayScheduledTime = new Date(now);
      todayScheduledTime.setHours(hours, minutes, 0, 0);

      if (schedule.testMode) {
        const lastExecutionStr = localStorage.getItem('last_report_execution_required_items');
        const lastExecution = lastExecutionStr ? new Date(lastExecutionStr) : null;
        const testIntervalMs = schedule.testInterval * 1000;

        if (!lastExecution || (now.getTime() - lastExecution.getTime() >= testIntervalMs)) {
          console.log('Auto-executing required items report in test mode:', now);
            executeQuery(true);
            localStorage.setItem('last_report_execution_required_items', now.toISOString());
          localStorage.setItem('next_report_execution_required_items', new Date(now.getTime() + testIntervalMs).toISOString());
        }
        return;
      }

      if (schedule.scheduleType === 'daily') {
        if (now >= todayScheduledTime) {
          nextExecution = new Date(todayScheduledTime);
          nextExecution.setDate(nextExecution.getDate() + schedule.interval);
        } else {
          nextExecution = new Date(todayScheduledTime);
        }
      } else if (schedule.scheduleType === 'weekly') {
        const daysUntilNext = (schedule.interval * 7) - (now.getDay() % (schedule.interval * 7));
        nextExecution = new Date(todayScheduledTime);
        if (now >= todayScheduledTime) {
          nextExecution.setDate(nextExecution.getDate() + daysUntilNext);
        }
      } else if (schedule.scheduleType === 'monthly') {
        nextExecution = new Date(todayScheduledTime);
        if (now >= todayScheduledTime) {
          nextExecution.setMonth(nextExecution.getMonth() + schedule.interval);
        }
      }

      const lastExecutionStr = localStorage.getItem('last_report_execution_required_items');
      const lastExecution = lastExecutionStr ? new Date(lastExecutionStr) : null;
      const timeDiff = Math.abs(now.getTime() - (nextExecution?.getTime() || 0));
      const oneMinute = 60 * 1000;
      
      const shouldExecute = 
        (!lastExecution || (now.getTime() - lastExecution.getTime() >= oneMinute)) &&
        (timeDiff <= oneMinute || now >= (nextExecution || new Date(0)));

      if (shouldExecute) {
        console.log('Auto-executing required items report at scheduled time:', now);
            executeQuery(true);
            localStorage.setItem('last_report_execution_required_items', now.toISOString());
        localStorage.setItem('next_report_execution_required_items', (nextExecution || now).toISOString());
      }
    };

    const intervalMs = schedule.testMode ? 1000 : 60000;
    
    if (schedule.testMode) {
      checkAndExecute();
    }
    
    intervalId = setInterval(() => {
      isEnabled = schedule.enabled;
      checkAndExecute();
    }, intervalMs);

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };
  }, [schedule.enabled, schedule.scheduleType, schedule.interval, schedule.time, schedule.testMode, schedule.testInterval, executeQuery]);

  const criticalCount = data.filter(r => r.مدة_نفاذ_المخزون !== null && r.مدة_نفاذ_المخزون <= 7).length;
  const avgDays = data.length > 0 
    ? data.reduce((sum, r) => sum + (r.مدة_نفاذ_المخزون || 0), 0) / data.length 
    : 0;

  return (
    <>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/reports/required-items")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20">
                <Clock className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">تقرير الأصناف المطلوبة</CardTitle>
                <CardDescription className="text-sm mt-1">
                  مدة نفاذ المخزون للأصناف
                </CardDescription>
              </div>
            </div>
            <Badge variant={data.length > 0 ? "default" : "secondary"} className="text-sm">
              {data.length > 0 ? `${data.length} صنف` : 'لا توجد بيانات'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">{criticalCount}</p>
                <p className="text-xs text-red-700 dark:text-red-300">حرج</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <TrendingDown className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">{avgDays.toFixed(1)}</p>
                <p className="text-xs text-blue-700 dark:text-blue-300">متوسط المدة</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

