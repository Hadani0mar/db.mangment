"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/auth/user-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { 
  Package, 
  Download, 
  ArrowRight,
  TrendingDown,
  Clock,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { formatDateTimeArabic } from "@/lib/date-utils";
import { getReportCache, setReportCache, isReportCacheValid } from "@/lib/cookies";
import * as XLSX from "xlsx";

interface RequiredItem {
  اسم_الصنف: string;
  كود_الصنف: string;
  مدة_نفاذ_المخزون: number;
}

export default function RequiredItemsReportPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [data, setData] = useState<RequiredItem[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }

    // تحميل البيانات عند فتح الصفحة
    if (user) {
      loadData();
    }
  }, [user, loading, router]);

  const loadData = async (forceRefresh = false) => {
    // إذا لم يكن forceRefresh، تحقق من التخزين المحلي أولاً
    if (!forceRefresh) {
      const cachedData = getReportCache<RequiredItem[]>('required_items');
      if (cachedData && isReportCacheValid('required_items')) {
        setData(cachedData);
        setLoadingData(false);
        toast.info('تم تحميل البيانات من التخزين المحلي', {
          description: `تم العثور على ${cachedData.length} صنف`,
        });
        return;
      }
    }

    setLoadingData(true);
    try {
      const response = await fetch('/api/reports/required-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filters: {} }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        toast.error('خطأ في الاستجابة', {
          description: `${response.status} - ${errorText}`,
        });
        setLoadingData(false);
        return;
      }

      const result = await response.json();

      if (result.success) {
        if (result.data && Array.isArray(result.data)) {
          setData(result.data);
          
          // حفظ البيانات في التخزين المحلي
          setReportCache('required_items', result.data);
          
          if (result.data.length === 0) {
            toast.warning('لا توجد بيانات', {
              description: 'لا توجد أصناف مطلوبة',
            });
          }
        } else {
          toast.error('خطأ في البيانات', {
            description: 'البيانات المستلمة ليست في الصيغة الصحيحة',
          });
        }
      } else {
        toast.error('فشل تحميل التقرير', {
          description: result.message || 'حدث خطأ غير متوقع',
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'خطأ غير معروف';
      toast.error('حدث خطأ', {
        description: errorMessage,
      });
    } finally {
      setLoadingData(false);
    }
  };

  const exportToExcel = () => {
    if (data.length === 0) {
      toast.error('لا توجد بيانات للتصدير', {
        description: 'لا توجد أصناف للتصدير',
      });
      return;
    }

    setExportLoading(true);
    toast.loading('جاري تحويل التقرير إلى Excel...', {
      id: 'excel-export',
    });

    setTimeout(() => {
      try {
        const excelData = data.map((record) => ({
          'اسم الصنف': record.اسم_الصنف,
          'كود الصنف': record.كود_الصنف,
          'مدة نفاذ المخزون': record.مدة_نفاذ_المخزون || 0,
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const colWidths = [
          { wch: 30 },
          { wch: 20 },
          { wch: 20 },
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'تقرير الأصناف المطلوبة');

        const now = new Date();
        const dateStr = formatDateTimeArabic(now.toISOString()).replace(/\s/g, '_').replace(/:/g, '-').replace(/-/g, '_');
        const fileName = `تقرير_الأصناف_المطلوبة_${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);

        toast.success('تم التصدير بنجاح', {
          description: `تم حفظ الملف: ${fileName} (${data.length.toLocaleString('en-US')} صنف)`,
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
  };

  const getDaysBadge = (days: number | null) => {
    if (days === null || days === undefined) {
      return <Badge variant="secondary">غير محدد</Badge>;
    }
    if (days <= 7) {
      return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100/80 dark:bg-red-900/20 dark:text-red-300">حرج ({days.toFixed(1)} يوم)</Badge>;
    }
    if (days <= 30) {
      return <Badge variant="default" className="bg-amber-100 text-amber-700 hover:bg-amber-100/80 dark:bg-amber-900/20 dark:text-amber-300">منخفض ({days.toFixed(1)} يوم)</Badge>;
    }
    if (days <= 60) {
      return <Badge variant="default" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100/80 dark:bg-yellow-900/20 dark:text-yellow-300">متوسط ({days.toFixed(1)} يوم)</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/20 dark:text-green-300">كافٍ ({days.toFixed(1)} يوم)</Badge>;
  };

  const criticalCount = data.filter(r => r.مدة_نفاذ_المخزون !== null && r.مدة_نفاذ_المخزون <= 7).length;
  const lowCount = data.filter(r => r.مدة_نفاذ_المخزون !== null && r.مدة_نفاذ_المخزون > 7 && r.مدة_نفاذ_المخزون <= 30).length;
  const avgDays = data.length > 0 
    ? data.reduce((sum, r) => sum + (r.مدة_نفاذ_المخزون || 0), 0) / data.length 
    : 0;

  if (loading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex h-14 sm:h-16 items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-1 sm:gap-2 shrink-0"
              >
                <ArrowRight className="h-4 w-4" />
                <span className="hidden sm:inline">العودة للداشبورد</span>
                <span className="sm:hidden">عودة</span>
              </Button>
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-gradient-to-br from-orange-500 to-red-600 text-white shrink-0">
                  <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg md:text-xl font-bold truncate">تقرير الأصناف المطلوبة</h1>
                  <p className="text-xs text-muted-foreground hidden sm:block">Required Items Report (Days of Stock Coverage)</p>
                </div>
              </div>
            </div>
            <Button
              onClick={exportToExcel}
              disabled={data.length === 0 || exportLoading}
              size="sm"
              className="shrink-0 text-xs sm:text-sm"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 ml-1 sm:ml-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 ml-1 sm:ml-2" />
              )}
              <span className="hidden sm:inline">{exportLoading ? 'جاري التصدير...' : 'تصدير Excel'}</span>
              <span className="sm:hidden">تصدير</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 lg:p-8">
        {/* Statistics Cards */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-4 sm:mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-blue-600" />
                إجمالي الأصناف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.length.toLocaleString('en-US')}</p>
              <p className="text-xs text-muted-foreground mt-1">صنف في التقرير</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                حرج
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{criticalCount.toLocaleString('en-US')}</p>
              <p className="text-xs text-muted-foreground mt-1">صنف (≤ 7 أيام)</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                متوسط المدة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{avgDays.toFixed(1)}</p>
              <p className="text-xs text-muted-foreground mt-1">يوم</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="truncate">قائمة الأصناف المطلوبة (مرتبة حسب مدة النفاذ)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {data.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[150px]">اسم الصنف</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[100px]">كود الصنف</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[140px]">مدة نفاذ المخزون</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[100px]">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((record, index) => (
                      <TableRow key={`${record.كود_الصنف}-${index}`} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <span className="line-clamp-2">{record.اسم_الصنف}</span>
                        </TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm">{record.كود_الصنف}</TableCell>
                        <TableCell className="font-semibold text-xs sm:text-sm">
                          {record.مدة_نفاذ_المخزون !== null && record.مدة_نفاذ_المخزون !== undefined
                            ? `${record.مدة_نفاذ_المخزون.toFixed(1)} يوم`
                            : 'غير محدد'}
                        </TableCell>
                        <TableCell>{getDaysBadge(record.مدة_نفاذ_المخزون)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">لا توجد بيانات</h3>
                <p className="text-sm text-muted-foreground">
                  لا توجد أصناف مطلوبة حالياً
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

