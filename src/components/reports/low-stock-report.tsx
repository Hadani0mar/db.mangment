"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  Package, 
  RefreshCw, 
  Clock,
  Play,
  AlertTriangle,
  TrendingDown,
  CheckCircle2,
  Zap,
  Settings,
} from "lucide-react";
import { formatDateTimeArabic } from "@/lib/date-utils";
import { getReportSchedule, setReportSchedule, getReportCache, setReportCache, isReportCacheValid } from "@/lib/cookies";

interface LowStockProduct {
  ProductID_PK: number;
  ProductCode: string;
  ProductName: string;
  MinStockLevel: number;
  StockOnHand: number;
  Difference: number;
  Status: string;
}

export function LowStockReport() {
  const router = useRouter();
  const [data, setData] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [schedule, setSchedule] = useState(() => {
    const savedSchedule = getReportSchedule('low_stock');
    return savedSchedule || {
      enabled: false,
      scheduleType: 'daily',
      interval: 1,
      time: '09:00',
      testMode: false,
      testInterval: 30,
    };
  });

  // التحقق من إذن الإشعارات
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // تحميل البيانات تلقائياً عند تحميل الكومبوننت (بدون إشعارات)
  useEffect(() => {
    // محاولة تحميل البيانات من التخزين المحلي أولاً
    const cachedData = getReportCache<LowStockProduct[]>('low_stock');
    if (cachedData && isReportCacheValid('low_stock')) {
      setData(cachedData);
    } else {
      // إذا لم توجد بيانات محلية أو انتهت صلاحيتها، جلب من الخادم
      executeQuery(false, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // إرسال إشعار المتصفح
  const sendBrowserNotification = useCallback((title: string, body: string, data?: unknown) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'low-stock-report-notification',
          data,
        });

        notification.onclick = () => {
          window.focus();
          router.push("/reports/low-stock");
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
      const cachedData = getReportCache<LowStockProduct[]>('low_stock');
      if (cachedData && isReportCacheValid('low_stock')) {
        setData(cachedData);
        if (showNotifications) {
          toast.info('تم تحميل البيانات من التخزين المحلي', {
            description: `تم العثور على ${cachedData.length} منتج`,
          });
          setTimeout(() => {
            router.push("/reports/low-stock");
          }, 1000);
        }
        return;
      }
    }

    setLoading(true);
    setData([]);
    
    try {
      const response = await fetch('/api/reports/low-stock', {
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
        setLoading(false);
        return;
      }

      const result = await response.json();
      
      if (result.success) {
        if (result.data && Array.isArray(result.data)) {
          setData(result.data);
          
          // حفظ البيانات في التخزين المحلي
          setReportCache('low_stock', result.data);
          
          if (showNotifications) {
            if (result.data.length === 0) {
              toast.warning('تم إنشاء التقرير بنجاح', {
                description: 'ولكن لا توجد منتجات موشكة على النفاذ',
              });
              sendBrowserNotification(
                'تقرير المنتجات الموشكة على النفاذ',
                'تم إنشاء التقرير بنجاح ولكن لا توجد منتجات موشكة على النفاذ'
              );
            } else {
              toast.success('تم إنشاء التقرير بنجاح', {
                description: `تم العثور على ${result.data.length} منتج موشك على النفاذ - جاري التوجيه...`,
              });
              sendBrowserNotification(
                'تقرير المنتجات الموشكة على النفاذ',
                `تم العثور على ${result.data.length} منتج - اضغط لعرض التفاصيل`,
                { count: result.data.length }
              );
              setTimeout(() => {
                router.push("/reports/low-stock");
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
    } finally {
      setLoading(false);
    }
  }, [sendBrowserNotification, router]);

  // حفظ إعدادات الجدولة
  const handleScheduleChange = (newSchedule: typeof schedule) => {
    setSchedule(newSchedule);
    setReportSchedule('low_stock', newSchedule);
    
    if (!newSchedule.enabled) {
      localStorage.removeItem('last_report_execution_low_stock');
      localStorage.removeItem('next_report_execution_low_stock');
    }
  };




  // الجدولة التلقائية
  useEffect(() => {
    if (!schedule.enabled) {
      localStorage.removeItem('last_report_execution_low_stock');
      localStorage.removeItem('next_report_execution_low_stock');
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
      
      if (schedule.testMode) {
        const lastExecutionStr = localStorage.getItem('last_report_execution_low_stock');
        const lastExecution = lastExecutionStr ? new Date(lastExecutionStr) : null;
        const testIntervalMs = schedule.testInterval * 1000;
        
        if (!lastExecution || (now.getTime() - lastExecution.getTime() >= testIntervalMs)) {
          console.log('Auto-executing low stock report in test mode:', now);
            executeQuery(true);
            localStorage.setItem('last_report_execution_low_stock', now.toISOString());
          const nextExecution = new Date(now.getTime() + testIntervalMs);
          localStorage.setItem('next_report_execution_low_stock', nextExecution.toISOString());
        }
        return;
      }

      const [hours, minutes] = schedule.time.split(':').map(Number);
      const todayScheduledTime = new Date();
      todayScheduledTime.setHours(hours, minutes, 0, 0);

      let nextExecution = new Date();
      
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

      const lastExecutionStr = localStorage.getItem('last_report_execution_low_stock');
      const lastExecution = lastExecutionStr ? new Date(lastExecutionStr) : null;
      const timeDiff = Math.abs(now.getTime() - nextExecution.getTime());
      const oneMinute = 60 * 1000;
      
      const shouldExecute = 
        (!lastExecution || (now.getTime() - lastExecution.getTime() >= oneMinute)) &&
        (timeDiff <= oneMinute || now >= nextExecution);

      if (shouldExecute) {
        console.log('Auto-executing low stock report at scheduled time:', now);
            executeQuery(true);
            localStorage.setItem('last_report_execution_low_stock', now.toISOString());
        localStorage.setItem('next_report_execution_low_stock', nextExecution.toISOString());
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

  const criticalCount = data.filter(r => r.StockOnHand < 0).length;
  const lowCount = data.filter(r => r.StockOnHand >= 0 && r.StockOnHand <= r.MinStockLevel).length;

  return (
    <>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => router.push("/reports/low-stock")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/20 dark:to-orange-900/20">
                <Package className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">تقرير المنتجات الموشكة على النفاذ</CardTitle>
                <CardDescription className="text-sm mt-1">
                  منتجات وصلت للحد الأدنى من المخزون
                </CardDescription>
              </div>
            </div>
            <Badge variant={data.length > 0 ? "destructive" : "secondary"} className="text-sm">
              {data.length > 0 ? `${data.length} منتج` : 'لا توجد بيانات'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">{criticalCount}</p>
                <p className="text-xs text-red-700 dark:text-red-300">ناقص</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
              <TrendingDown className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">{lowCount}</p>
                <p className="text-xs text-amber-700 dark:text-amber-300">منخفض</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              إعدادات تقرير المنتجات الموشكة على النفاذ
            </DialogTitle>
            <DialogDescription>
              إعدادات الجدولة والإشعارات والتنفيذ
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 px-6">
            <div className="space-y-6 py-4">
            {/* Execute Button */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-base">إنشاء التقرير</CardTitle>
                </div>
                <CardDescription className="text-sm mt-1">
                  اضغط لتنفيذ استعلام المنتجات الموشكة على النفاذ
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <Button
                  onClick={() => executeQuery(true, true)}
                  disabled={loading}
                  className="w-full"
                  size="default"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                      جاري المعالجة...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 ml-2" />
                      إنشاء التقرير
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Schedule Settings */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">الجدولة التلقائية</CardTitle>
                </div>
                <CardDescription className="text-sm mt-1">
                  جدولة تنفيذ التقرير تلقائياً
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="scheduleEnabledLowStock"
                    checked={schedule.enabled}
                    onChange={(e) => handleScheduleChange({ ...schedule, enabled: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="scheduleEnabledLowStock" className="text-sm font-medium cursor-pointer">
                    تفعيل الجدولة
                  </Label>
                </div>

                {schedule.enabled && (
                  <>
                    <Separator />
                    
                    {/* Test Mode */}
                    <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="testModeLowStock"
                          checked={schedule.testMode || false}
                          onChange={(e) => handleScheduleChange({ ...schedule, testMode: e.target.checked })}
                          className="rounded"
                        />
                        <Label htmlFor="testModeLowStock" className="text-sm font-semibold text-foreground cursor-pointer">
                          وضع التجربة (للتجربة السريعة)
                        </Label>
                      </div>
                      {schedule.testMode && (
                        <div className="space-y-2 pr-6">
                          <Label htmlFor="testIntervalLowStock" className="text-xs text-muted-foreground">
                            مدة التنفيذ
                          </Label>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={schedule.testInterval === 30 ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleScheduleChange({ ...schedule, testInterval: 30 })}
                              className="flex-1"
                            >
                              30 ثانية
                            </Button>
                            <Button
                              type="button"
                              variant={schedule.testInterval === 1800 ? "default" : "outline"}
                              size="sm"
                              onClick={() => handleScheduleChange({ ...schedule, testInterval: 1800 })}
                              className="flex-1"
                            >
                              30 دقيقة
                            </Button>
                          </div>
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            سيتم تنفيذ التقرير كل {schedule.testInterval === 30 ? '30 ثانية' : '30 دقيقة'} للتجربة
                          </p>
                        </div>
                      )}
                    </div>

                    {!schedule.testMode && (
                      <>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor="scheduleTypeLowStock" className="text-sm font-semibold text-foreground">نوع الجدولة</Label>
                            <select
                              id="scheduleTypeLowStock"
                              value={schedule.scheduleType}
                              onChange={(e) => handleScheduleChange({ ...schedule, scheduleType: e.target.value as 'daily' | 'weekly' | 'monthly' })}
                              className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                            >
                              <option value="daily">يومي</option>
                              <option value="weekly">أسبوعي</option>
                              <option value="monthly">شهري</option>
                            </select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="intervalLowStock" className="text-sm font-semibold text-foreground">
                              {schedule.scheduleType === 'daily' && 'كل كم يوم'}
                              {schedule.scheduleType === 'weekly' && 'كل كم أسبوع'}
                              {schedule.scheduleType === 'monthly' && 'كل كم شهر'}
                            </Label>
                            <Input
                              id="intervalLowStock"
                              type="number"
                              min="1"
                              value={schedule.interval}
                              onChange={(e) => handleScheduleChange({ ...schedule, interval: parseInt(e.target.value) || 1 })}
                              className="h-10 text-base"
                              placeholder="1"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="timeLowStock" className="text-sm font-semibold text-foreground">وقت التنفيذ</Label>
                            <Input
                              id="timeLowStock"
                              type="time"
                              value={schedule.time}
                              onChange={(e) => handleScheduleChange({ ...schedule, time: e.target.value })}
                              className="h-10 text-base"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Notifications */}
                    <div className="space-y-2 p-4 bg-gray-50 dark:bg-gray-950/20 border border-gray-200 dark:border-gray-800 rounded-lg">
                      <Label className="text-sm font-semibold text-foreground">إشعارات المتصفح</Label>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                          {notificationPermission === 'granted' 
                            ? '✓ الإشعارات مفعلة'
                            : notificationPermission === 'denied'
                            ? '✗ تم رفض الإشعارات'
                            : 'تفعيل الإشعارات لتلقي تنبيهات عند إصدار التقارير'}
                        </p>
                        {notificationPermission !== 'granted' && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              if ('Notification' in window) {
                                const permission = await Notification.requestPermission();
                                setNotificationPermission(permission);
                                if (permission === 'granted') {
                                  toast.success('تم تفعيل الإشعارات', {
                                    description: 'ستتلقى إشعارات عند إصدار التقارير',
                                  });
                                  sendBrowserNotification(
                                    'تقرير المنتجات الموشكة على النفاذ',
                                    'تم تفعيل الإشعارات بنجاح!'
                                  );
                                } else if (permission === 'denied') {
                                  toast.error('تم رفض الإشعارات', {
                                    description: 'يرجى تفعيل الإشعارات من إعدادات المتصفح',
                                  });
                                }
                              }
                            }}
                            className="h-8"
                          >
                            {notificationPermission === 'denied' ? 'إعادة المحاولة' : 'تفعيل'}
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3 pt-2">
                      <Button
                        onClick={() => {
                          handleScheduleChange(schedule);
                          toast.success('تم الحفظ بنجاح', {
                            description: 'تم حفظ إعدادات الجدولة محلياً',
                          });
                        }}
                        variant="default"
                        size="default"
                        className="w-full h-10"
                      >
                        حفظ الإعدادات
                      </Button>
                      {schedule.enabled && (() => {
                        const nextExecutionStr = localStorage.getItem('next_report_execution_low_stock');
                        const nextExecution = nextExecutionStr ? new Date(nextExecutionStr) : null;
                        
                        return (
                          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <div className="p-1 rounded-full bg-blue-500 mt-0.5">
                                <CheckCircle2 className="h-3 w-3 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                                  الجدولة مفعلة
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                                  {nextExecution 
                                    ? `التنفيذ التالي: ${formatDateTimeArabic(nextExecution.toISOString())}`
                                    : 'سيتم تنفيذ التقرير تلقائياً حسب الإعدادات المحددة'}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            </div>
          </ScrollArea>

          <DialogFooter className="px-6 pb-6 pt-4 flex-shrink-0 border-t">
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}

