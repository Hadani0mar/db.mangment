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
  AlertTriangle,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { formatDateTimeArabic } from "@/lib/date-utils";
import { getReportCache, setReportCache, isReportCacheValid } from "@/lib/cookies";
import * as XLSX from "xlsx";

interface LowStockProduct {
  ProductID_PK: number;
  ProductCode: string;
  ProductName: string;
  MinStockLevel: number;
  StockOnHand: number;
  Difference: number;
  Status: string;
}

export default function LowStockReportPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const [data, setData] = useState<LowStockProduct[]>([]);
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
      const cachedData = getReportCache<LowStockProduct[]>('low_stock');
      if (cachedData && isReportCacheValid('low_stock')) {
        setData(cachedData);
        setLoadingData(false);
        toast.info('تم تحميل البيانات من التخزين المحلي', {
          description: `تم العثور على ${cachedData.length} منتج`,
        });
        return;
      }
    }

    setLoadingData(true);
    try {
      const response = await fetch('/api/reports/low-stock', {
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
          setReportCache('low_stock', result.data);
          
          if (result.data.length === 0) {
            toast.warning('لا توجد بيانات', {
              description: 'لا توجد منتجات موشكة على النفاذ',
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
        description: 'لا توجد منتجات للتصدير',
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
          'معرف المنتج': record.ProductID_PK,
          'كود المنتج': record.ProductCode,
          'اسم المنتج': record.ProductName,
          'الحد الأدنى للمخزون': record.MinStockLevel,
          'المخزون الحالي': record.StockOnHand,
          'الفرق': record.Difference,
          'الحالة': record.Status,
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const colWidths = [
          { wch: 15 },
          { wch: 20 },
          { wch: 30 },
          { wch: 20 },
          { wch: 20 },
          { wch: 15 },
          { wch: 15 },
        ];
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'تقرير المنتجات الموشكة على النفاذ');

        const now = new Date();
        const dateStr = formatDateTimeArabic(now.toISOString()).replace(/\s/g, '_').replace(/:/g, '-').replace(/-/g, '_');
        const fileName = `تقرير_المنتجات_الموشكة_على_النفاذ_${dateStr}.xlsx`;

        XLSX.writeFile(wb, fileName);

        toast.success('تم التصدير بنجاح', {
          description: `تم حفظ الملف: ${fileName} (${data.length.toLocaleString('en-US')} منتج)`,
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ناقص':
        return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100/80 dark:bg-red-900/20 dark:text-red-300">ناقص</Badge>;
      case 'كافٍ':
        return <Badge variant="default" className="bg-green-100 text-green-700 hover:bg-green-100/80 dark:bg-green-900/20 dark:text-green-300">كافٍ</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-100/80 dark:bg-gray-800/20 dark:text-gray-300">{status || 'غير محدد'}</Badge>;
    }
  };

  const criticalCount = data.filter(r => r.StockOnHand < 0).length;
  const lowCount = data.filter(r => r.StockOnHand >= 0 && r.StockOnHand <= r.MinStockLevel).length;

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard")}
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                العودة للداشبورد
              </Button>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-red-500 to-orange-600 text-white">
                  <TrendingDown className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">تقرير المنتجات الموشكة على النفاذ</h1>
                  <p className="text-xs text-muted-foreground">Low Stock Products Report</p>
                </div>
              </div>
            </div>
            <Button
              onClick={exportToExcel}
              disabled={data.length === 0 || exportLoading}
              size="sm"
            >
              {exportLoading ? (
                <Loader2 className="h-4 w-4 ml-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 ml-2" />
              )}
              {exportLoading ? 'جاري التصدير...' : 'تصدير Excel'}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                إجمالي المنتجات
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.length.toLocaleString('en-US')}</p>
              <p className="text-xs text-muted-foreground mt-1">منتج موشك على النفاذ</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                ناقص
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{criticalCount.toLocaleString('en-US')}</p>
              <p className="text-xs text-muted-foreground mt-1">منتج بكمية سالبة</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-amber-600" />
                منخفض
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-amber-600">{lowCount.toLocaleString('en-US')}</p>
              <p className="text-xs text-muted-foreground mt-1">منتج عند الحد الأدنى</p>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Package className="h-4 w-4 sm:h-5 sm:w-5" />
              قائمة المنتجات الموشكة على النفاذ
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            {data.length > 0 ? (
              <div className="border rounded-lg overflow-x-auto -mx-4 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[80px]">المعرف</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[100px]">كود المنتج</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[150px]">اسم المنتج</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[100px] hidden sm:table-cell">الحد الأدنى</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[120px]">المخزون الحالي</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[100px] hidden md:table-cell">الفرق</TableHead>
                      <TableHead className="text-right text-xs sm:text-sm min-w-[100px]">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.map((record) => (
                      <TableRow key={record.ProductID_PK} className="hover:bg-muted/50">
                        <TableCell className="font-medium text-xs sm:text-sm">{record.ProductID_PK}</TableCell>
                        <TableCell className="font-mono text-xs sm:text-sm">{record.ProductCode}</TableCell>
                        <TableCell className="font-medium text-xs sm:text-sm">
                          <span className="line-clamp-2">{record.ProductName}</span>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm hidden sm:table-cell">{record.MinStockLevel.toFixed(2)}</TableCell>
                        <TableCell className={`font-semibold text-xs sm:text-sm ${
                          record.StockOnHand < 0 ? 'text-red-600' : 
                          record.StockOnHand <= record.MinStockLevel ? 'text-amber-600' : 
                          'text-green-600'
                        }`}>{record.StockOnHand.toFixed(2)}</TableCell>
                        <TableCell className={`font-semibold text-xs sm:text-sm hidden md:table-cell ${
                          record.Difference < 0 ? 'text-red-600' : 'text-green-600'
                        }`}>{record.Difference.toFixed(2)}</TableCell>
                        <TableCell>{getStatusBadge(record.Status)}</TableCell>
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
                  لا توجد منتجات موشكة على النفاذ حالياً
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

