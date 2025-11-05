"use client";

import { useState, useEffect, useCallback } from "react";
import * as XLSX from "xlsx";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { 
  CreditCard, 
  Download, 
  RefreshCw, 
  Clock,
  Play,
  FileText,
  Calendar,
  DollarSign,
  User,
  CheckCircle2,
  XCircle,
  Zap,
  Settings,
  Loader2
} from "lucide-react";
import { formatDateTimeArabic } from "@/lib/date-utils";
import { getReportSchedule, setReportSchedule, getReportCache, setReportCache, isReportCacheValid } from "@/lib/cookies";

interface DebtRecord {
  معرف_الموعد: number;
  رقم_الفاتورة: string;
  تاريخ_الاستحقاق: Date;
  المبلغ_المطلوب: number;
  اسم_العميل: string;
  حالة_الدفع: string;
  الملاحظة: string;
  المستخدم_الذي_أضافه: string;
  تاريخ_الإضافة: Date;
}

export function DebtsReport() {
  const [data, setData] = useState<DebtRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [schedule, setSchedule] = useState(() => {
    // تحميل الإعدادات المحفوظة عند التحميل
    const savedSchedule = getReportSchedule('debts');
    return savedSchedule || {
      enabled: false,
      scheduleType: 'daily',
      interval: 1,
      time: '09:00',
      testMode: false, // وضع التجربة
      testInterval: 30, // 30 ثانية أو دقيقة
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
    const cachedData = getReportCache<DebtRecord[]>('debts');
    if (cachedData && isReportCacheValid('debts')) {
      // تحويل التواريخ من strings إلى Date objects
      const formattedCachedData = cachedData.map((record: DebtRecord) => ({
        ...record,
        تاريخ_الاستحقاق: record.تاريخ_الاستحقاق ? new Date(record.تاريخ_الاستحقاق) : new Date(),
        تاريخ_الإضافة: record.تاريخ_الإضافة ? new Date(record.تاريخ_الإضافة) : new Date(),
      }));
      setData(formattedCachedData);
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
          tag: 'report-notification',
          data,
        });

        notification.onclick = () => {
          window.focus();
          setDialogOpen(true);
          notification.close();
        };

        // إغلاق الإشعار تلقائياً بعد 5 ثوان
        setTimeout(() => {
          notification.close();
        }, 5000);
      } catch (error) {
        console.error('Error showing notification:', error);
      }
    }
  }, []);

  const executeQuery = useCallback(async (showNotifications = true, forceRefresh = false) => {
    // إذا لم يكن forceRefresh، تحقق من التخزين المحلي أولاً
    if (!forceRefresh) {
      const cachedData = getReportCache<DebtRecord[]>('debts');
      if (cachedData && isReportCacheValid('debts')) {
        // تحويل التواريخ من strings إلى Date objects
        const formattedCachedData = cachedData.map((record: DebtRecord) => ({
          ...record,
          تاريخ_الاستحقاق: record.تاريخ_الاستحقاق ? new Date(record.تاريخ_الاستحقاق) : new Date(),
          تاريخ_الإضافة: record.تاريخ_الإضافة ? new Date(record.تاريخ_الإضافة) : new Date(),
        }));
        setData(formattedCachedData);
        if (showNotifications) {
          toast.info('تم تحميل البيانات من التخزين المحلي', {
            description: `تم العثور على ${formattedCachedData.length} سجل`,
          });
          setDialogOpen(true);
        }
        return;
      }
    }

    setLoading(true);
    setData([]);
    
    try {
      const response = await fetch('/api/reports/debts', {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const formattedData = result.data.map((record: any) => ({
            ...record,
            تاريخ_الاستحقاق: record.تاريخ_الاستحقاق ? new Date(record.تاريخ_الاستحقاق) : new Date(),
            تاريخ_الإضافة: record.تاريخ_الإضافة ? new Date(record.تاريخ_الإضافة) : new Date(),
          }));
          
          setData(formattedData);
          
          // حفظ البيانات في التخزين المحلي
          setReportCache('debts', formattedData);
          
          if (showNotifications) {
            if (formattedData.length === 0) {
              toast.warning('تم إنشاء التقرير بنجاح', {
                description: 'ولكن لا توجد بيانات لعرضها',
              });
              sendBrowserNotification(
                'تقرير الديون والمستحاقات',
                'تم إنشاء التقرير بنجاح ولكن لا توجد بيانات لعرضها'
              );
            } else {
              toast.success('تم إنشاء التقرير بنجاح', {
                description: `تم العثور على ${formattedData.length} سجل`,
              });
              sendBrowserNotification(
                'تقرير الديون والمستحاقات',
                `تم العثور على ${formattedData.length} سجل - اضغط لعرض التفاصيل`,
                { count: formattedData.length }
              );
              setDialogOpen(true);
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
  }, [sendBrowserNotification]);

  const formatCurrency = useCallback((amount: number) => {
    // تنسيق الأرقام بالإنجليزية مع فاصلة الآلاف
    const formattedAmount = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    
    return `${formattedAmount} د.ل`;
  }, []);

  // حفظ إعدادات الجدولة عند التغيير
  const handleScheduleChange = (newSchedule: typeof schedule) => {
    setSchedule(newSchedule);
    setReportSchedule('debts', newSchedule);
    
    // إذا تم تعطيل الجدولة، احذف بيانات التنفيذ من localStorage
    if (!newSchedule.enabled) {
      localStorage.removeItem('last_report_execution_debts');
      localStorage.removeItem('next_report_execution_debts');
    }
  };

  // تصدير البيانات إلى Excel
  const exportToExcel = useCallback(() => {
    if (data.length === 0) {
      toast.error('لا توجد بيانات للتصدير', {
        description: 'قم بإنشاء التقرير أولاً',
      });
      return;
    }

    setExportLoading(true);
    toast.loading('جاري تحويل التقرير إلى Excel...', {
      id: 'excel-export',
    });

    // استخدام setTimeout لإعطاء الوقت لظهور الرسالة
    setTimeout(() => {
      try {
        // تحضير البيانات للتصدير
      const excelData = data.map((record) => ({
        'معرف الموعد': record.معرف_الموعد,
        'اسم العميل': record.اسم_العميل,
        'رقم الفاتورة': record.رقم_الفاتورة,
        'تاريخ الاستحقاق': record.تاريخ_الاستحقاق 
          ? formatDateTimeArabic(new Date(record.تاريخ_الاستحقاق).toISOString())
          : '-',
        'المبلغ المطلوب': record.المبلغ_المطلوب || 0,
        'حالة الدفع': record.حالة_الدفع || 'غير محدد',
        'الملاحظة': record.الملاحظة || '-',
        'المستخدم الذي أضافه': record.المستخدم_الذي_أضافه || '-',
        'تاريخ الإضافة': record.تاريخ_الإضافة
          ? formatDateTimeArabic(new Date(record.تاريخ_الإضافة).toISOString())
          : '-',
      }));

      // إنشاء ورقة عمل
      const ws = XLSX.utils.json_to_sheet(excelData);
      
      // ضبط عرض الأعمدة
      const colWidths = [
        { wch: 12 }, // معرف الموعد
        { wch: 25 }, // اسم العميل
        { wch: 15 }, // رقم الفاتورة
        { wch: 20 }, // تاريخ الاستحقاق
        { wch: 15 }, // المبلغ المطلوب
        { wch: 15 }, // حالة الدفع
        { wch: 30 }, // الملاحظة
        { wch: 20 }, // المستخدم
        { wch: 20 }, // تاريخ الإضافة
      ];
      ws['!cols'] = colWidths;

      // إنشاء مصنف
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'تقرير الديون والمستحاقات');

      // إنشاء اسم الملف مع التاريخ والوقت
      const now = new Date();
      const dateStr = formatDateTimeArabic(now.toISOString()).replace(/\s/g, '_').replace(/:/g, '-').replace(/-/g, '_');
      const fileName = `تقرير_الديون_والمستحاقات_${dateStr}.xlsx`;

      // تحميل الملف
      XLSX.writeFile(wb, fileName);

      toast.success('تم التصدير بنجاح', {
        description: `تم حفظ الملف: ${fileName}`,
        id: 'excel-export',
      });
      setExportLoading(false);
    } catch (error: unknown) {
      console.error('Error exporting to Excel:', error);
      const errorMessage = error instanceof Error ? error.message : 'حدث خطأ أثناء التصدير';
      toast.error('فشل التصدير', {
        description: errorMessage,
        id: 'excel-export',
      });
      setExportLoading(false);
      }
    }, 100);
  }, [data]);



  // التحقق من الجدولة وتنفيذ التقرير تلقائياً
  useEffect(() => {
    // إذا كانت الجدولة معطلة، تأكد من إزالة أي interval قيد التشغيل
    if (!schedule.enabled) {
      // إزالة بيانات التنفيذ من localStorage عند التعطيل
      localStorage.removeItem('last_report_execution_debts');
      localStorage.removeItem('next_report_execution_debts');
      return;
    }

    let intervalId: NodeJS.Timeout | null = null;
    let isEnabled = schedule.enabled; // نسخ القيمة

    const checkAndExecute = () => {
      // التحقق مرة أخرى قبل التنفيذ
      if (!isEnabled || !schedule.enabled) {
        if (intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
        return;
      }

      const now = new Date();
      
      // إذا كان وضع التجربة مفعل
      if (schedule.testMode) {
        const lastExecutionStr = localStorage.getItem('last_report_execution_debts');
        const lastExecution = lastExecutionStr ? new Date(lastExecutionStr) : null;
        
        // حساب المدة المحددة (بالمللي ثانية)
        const testIntervalMs = schedule.testInterval * 1000; // تحويل إلى مللي ثانية
        
        if (!lastExecution || (now.getTime() - lastExecution.getTime() >= testIntervalMs)) {
          console.log('Auto-executing report in test mode:', now);
            executeQuery(true);
            localStorage.setItem('last_report_execution_debts', now.toISOString());
          
          // حساب وقت التنفيذ التالي
          const nextExecution = new Date(now.getTime() + testIntervalMs);
          localStorage.setItem('next_report_execution_debts', nextExecution.toISOString());
        }
        return;
      }

      // الجدولة العادية
      const [hours, minutes] = schedule.time.split(':').map(Number);
      
      // وقت التنفيذ المحدد اليوم
      const todayScheduledTime = new Date();
      todayScheduledTime.setHours(hours, minutes, 0, 0);

      // حساب وقت التنفيذ التالي بناءً على نوع الجدولة
      let nextExecution = new Date();
      
      if (schedule.scheduleType === 'daily') {
        // يومي: كل X يوم
        if (now >= todayScheduledTime) {
          // إذا مر الوقت اليوم، احسب اليوم التالي
          nextExecution = new Date(todayScheduledTime);
          nextExecution.setDate(nextExecution.getDate() + schedule.interval);
        } else {
          // لم يمر الوقت بعد، استخدم وقت اليوم
          nextExecution = new Date(todayScheduledTime);
        }
      } else if (schedule.scheduleType === 'weekly') {
        // أسبوعي: كل X أسبوع
        const daysUntilNext = (schedule.interval * 7) - (now.getDay() % (schedule.interval * 7));
        nextExecution = new Date(todayScheduledTime);
        if (now >= todayScheduledTime) {
          nextExecution.setDate(nextExecution.getDate() + daysUntilNext);
        }
      } else if (schedule.scheduleType === 'monthly') {
        // شهري: كل X شهر
        nextExecution = new Date(todayScheduledTime);
        if (now >= todayScheduledTime) {
          nextExecution.setMonth(nextExecution.getMonth() + schedule.interval);
        }
      }

      // التحقق من آخر تنفيذ
      const lastExecutionStr = localStorage.getItem('last_report_execution_debts');
      const lastExecution = lastExecutionStr ? new Date(lastExecutionStr) : null;
      
      // التحقق إذا حان وقت التنفيذ (داخل نطاق دقيقة من الوقت المحدد)
      const timeDiff = Math.abs(now.getTime() - nextExecution.getTime());
      const oneMinute = 60 * 1000;
      
      const shouldExecute = 
        (!lastExecution || (now.getTime() - lastExecution.getTime() >= oneMinute)) &&
        (timeDiff <= oneMinute || now >= nextExecution);

      if (shouldExecute) {
        console.log('Auto-executing report at scheduled time:', now);
            executeQuery(true);
            localStorage.setItem('last_report_execution_debts', now.toISOString());
        localStorage.setItem('next_report_execution_debts', nextExecution.toISOString());
      }
    };

    // في وضع التجربة، التحقق كل ثانية، وإلا كل دقيقة
    const intervalMs = schedule.testMode ? 1000 : 60000;
    
    // التحقق فوراً عند التحميل (في وضع التجربة فقط)
    if (schedule.testMode) {
      checkAndExecute();
    }
    
    intervalId = setInterval(() => {
      // تحديث القيمة قبل كل تنفيذ
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

  const totalAmount = data.reduce((sum, record) => sum + (record.المبلغ_المطلوب || 0), 0);
  const paidCount = data.filter(r => r.حالة_الدفع === 'تم الدفع').length;
  const unpaidCount = data.filter(r => r.حالة_الدفع !== 'تم الدفع').length;

  return (
    <>
      <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setSettingsDialogOpen(true)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CreditCard className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold">تقرير الديون والمستحاقات</CardTitle>
                <CardDescription className="text-sm mt-1">
                  إدارة ومراقبة مواعيد دفع العملاء
                </CardDescription>
              </div>
            </div>
            <Badge variant={data.length > 0 ? "default" : "secondary"} className="text-sm">
              {data.length > 0 ? `${data.length} سجل` : 'لا توجد بيانات'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                  {formatCurrency(totalAmount)}
                </p>
                <p className="text-xs text-green-700 dark:text-green-300">إجمالي المبلغ</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-semibold text-green-900 dark:text-green-100">{paidCount}</p>
                <p className="text-xs text-green-700 dark:text-green-300">مدفوع</p>
              </div>
            </div>
            <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-950/20 rounded-lg">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900 dark:text-red-100">{unpaidCount}</p>
                <p className="text-xs text-red-700 dark:text-red-300">غير مدفوع</p>
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
              إعدادات تقرير الديون والمستحاقات
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
                  اضغط لتنفيذ استعلام مواعيد دفع العملاء
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
              id="scheduleEnabled"
              checked={schedule.enabled}
              onChange={(e) => handleScheduleChange({ ...schedule, enabled: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="scheduleEnabled" className="text-sm font-medium cursor-pointer">
              تفعيل الجدولة
            </Label>
          </div>

          {schedule.enabled && (
            <>
              <Separator />
              
              {/* وضع التجربة */}
              <div className="space-y-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="testMode"
                    checked={schedule.testMode || false}
                    onChange={(e) => handleScheduleChange({ ...schedule, testMode: e.target.checked })}
                    className="rounded"
                  />
                  <Label htmlFor="testMode" className="text-sm font-semibold text-foreground cursor-pointer">
                    وضع التجربة (للتجربة السريعة)
                  </Label>
                </div>
                {schedule.testMode && (
                  <div className="space-y-2 pr-6">
                    <Label htmlFor="testInterval" className="text-xs text-muted-foreground">
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
                  <Label htmlFor="scheduleType" className="text-sm font-semibold text-foreground">نوع الجدولة</Label>
                  <select
                    id="scheduleType"
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
                  <Label htmlFor="interval" className="text-sm font-semibold text-foreground">
                    {schedule.scheduleType === 'daily' && 'كل كم يوم'}
                    {schedule.scheduleType === 'weekly' && 'كل كم أسبوع'}
                    {schedule.scheduleType === 'monthly' && 'كل كم شهر'}
                  </Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={schedule.interval}
                    onChange={(e) => handleScheduleChange({ ...schedule, interval: parseInt(e.target.value) || 1 })}
                    className="h-10 text-base"
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="time" className="text-sm font-semibold text-foreground">وقت التنفيذ</Label>
                  <Input
                    id="time"
                    type="time"
                    value={schedule.time}
                    onChange={(e) => handleScheduleChange({ ...schedule, time: e.target.value })}
                    className="h-10 text-base"
                  />
                </div>
              </div>
              </>
              )}

              {/* إعدادات الإشعارات */}
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
                            // إرسال إشعار تجريبي
                            sendBrowserNotification(
                              'تقرير الديون والمستحاقات',
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
                  const nextExecutionStr = localStorage.getItem('next_report_execution_debts');
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

      {/* Results Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-[90vw] md:max-w-[85vw] lg:max-w-6xl w-full max-h-[95vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0 border-b">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
              نتائج التقرير
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              تم العثور على {data.length} سجل من مواعيد دفع العملاء
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden min-h-0">
            <ScrollArea className="h-full px-3 sm:px-6 py-3 sm:py-4">
              {data.length > 0 ? (
                <div className="space-y-3 sm:space-y-4 pb-4">
                  <div className="p-2 sm:p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 rounded-lg">
                    <p className="text-xs sm:text-sm text-green-800 dark:text-green-200 font-medium">
                      ✓ تم العثور على {data.length} سجل
                    </p>
                  </div>
                  
                  <div className="border rounded-lg overflow-x-auto -mx-2 sm:mx-0">
                    <div className="min-w-full inline-block">
                      <Table className="w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-right min-w-[80px] sm:min-w-[100px] text-xs sm:text-sm whitespace-nowrap">المعرف</TableHead>
                            <TableHead className="text-right min-w-[120px] sm:min-w-[150px] text-xs sm:text-sm whitespace-nowrap">اسم العميل</TableHead>
                            <TableHead className="text-right min-w-[100px] sm:min-w-[120px] text-xs sm:text-sm whitespace-nowrap">رقم الفاتورة</TableHead>
                            <TableHead className="text-right min-w-[140px] sm:min-w-[180px] text-xs sm:text-sm whitespace-nowrap">تاريخ الاستحقاق</TableHead>
                            <TableHead className="text-right min-w-[100px] sm:min-w-[130px] text-xs sm:text-sm whitespace-nowrap">المبلغ</TableHead>
                            <TableHead className="text-right min-w-[110px] sm:min-w-[140px] text-xs sm:text-sm whitespace-nowrap">حالة الدفع</TableHead>
                            <TableHead className="text-right min-w-[150px] sm:min-w-[200px] text-xs sm:text-sm whitespace-nowrap hidden sm:table-cell">الملاحظة</TableHead>
                            <TableHead className="text-right min-w-[120px] sm:min-w-[150px] text-xs sm:text-sm whitespace-nowrap hidden md:table-cell">المستخدم</TableHead>
                            <TableHead className="text-right min-w-[140px] sm:min-w-[180px] text-xs sm:text-sm whitespace-nowrap hidden lg:table-cell">تاريخ الإضافة</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.map((record, index) => (
                            <TableRow key={record.معرف_الموعد || index} className="hover:bg-muted/50">
                              <TableCell className="font-mono text-xs sm:text-sm min-w-[80px] sm:min-w-[100px]">
                                <span className="text-muted-foreground">#{record.معرف_الموعد || '-'}</span>
                              </TableCell>
                              <TableCell className="font-medium min-w-[120px] sm:min-w-[150px]">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="truncate text-xs sm:text-sm">{record.اسم_العميل || 'غير محدد'}</span>
                                </div>
                              </TableCell>
                              <TableCell className="font-mono text-xs sm:text-sm min-w-[100px] sm:min-w-[120px]">
                                <span className="truncate block">{record.رقم_الفاتورة || '-'}</span>
                              </TableCell>
                              <TableCell className="min-w-[140px] sm:min-w-[180px]">
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
                                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="whitespace-nowrap">
                                    {record.تاريخ_الاستحقاق 
                                      ? formatDateTimeArabic(new Date(record.تاريخ_الاستحقاق).toISOString())
                                      : '-'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold text-xs sm:text-sm min-w-[100px] sm:min-w-[130px] whitespace-nowrap">
                                {formatCurrency(record.المبلغ_المطلوب || 0)}
                              </TableCell>
                              <TableCell className="min-w-[110px] sm:min-w-[140px]">
                                <Badge
                                  variant={record.حالة_الدفع === 'تم الدفع' ? 'default' : 'destructive'}
                                  className={`text-xs sm:text-sm ${
                                    record.حالة_الدفع === 'تم الدفع'
                                      ? 'bg-green-500 hover:bg-green-600 whitespace-nowrap'
                                      : 'bg-red-500 hover:bg-red-600 whitespace-nowrap'
                                  }`}
                                >
                                  {record.حالة_الدفع === 'تم الدفع' ? (
                                    <CheckCircle2 className="h-3 w-3 ml-1" />
                                  ) : (
                                    <XCircle className="h-3 w-3 ml-1" />
                                  )}
                                  <span className="whitespace-nowrap">{record.حالة_الدفع || 'غير محدد'}</span>
                                </Badge>
                              </TableCell>
                              <TableCell className="min-w-[150px] sm:min-w-[200px] max-w-[300px] hidden sm:table-cell">
                                <span className="text-xs sm:text-sm text-muted-foreground truncate block" title={record.الملاحظة || ''}>
                                  {record.الملاحظة || '-'}
                                </span>
                              </TableCell>
                              <TableCell className="min-w-[120px] sm:min-w-[150px] hidden md:table-cell">
                                <span className="text-xs sm:text-sm truncate block">{record.المستخدم_الذي_أضافه || '-'}</span>
                              </TableCell>
                              <TableCell className="min-w-[140px] sm:min-w-[180px] hidden lg:table-cell">
                                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                                  <Calendar className="h-3 w-3 flex-shrink-0" />
                                  <span className="whitespace-nowrap">
                                    {record.تاريخ_الإضافة 
                                      ? formatDateTimeArabic(new Date(record.تاريخ_الإضافة).toISOString())
                                      : '-'}
                                  </span>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">لا توجد بيانات</h3>
                  <p className="text-sm text-muted-foreground">
                    لا توجد نتائج لعرضها
                  </p>
                </div>
              )}
            </ScrollArea>
          </div>

          <DialogFooter className="px-6 pb-6 pt-4 border-t flex-shrink-0">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              إغلاق
            </Button>
            {data.length > 0 && (
              <>
                <Button 
                  onClick={exportToExcel} 
                  disabled={exportLoading}
                >
                  {exportLoading ? (
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 ml-2" />
                  )}
                  {exportLoading ? 'جاري التصدير...' : 'تصدير Excel'}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}
