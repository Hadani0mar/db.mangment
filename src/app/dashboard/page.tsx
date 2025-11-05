"use client";

import { useEffect, useState } from "react";
import { useDatabaseConnection } from "@/hooks/use-db-connection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings, CreditCard, Package, Clock, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { getReportCache } from "@/lib/cookies";

export default function DashboardPage() {
  const router = useRouter();
  const { connection, isLoading: loadingInfo } = useDatabaseConnection();
  const [stats, setStats] = useState({
    debts: { total: 0, amount: 0, paid: 0, unpaid: 0 },
    lowStock: { total: 0, critical: 0 },
    requiredItems: { total: 0, critical: 0 },
  });

  useEffect(() => {
    // تحميل الإحصائيات من التخزين المحلي
    const debtsData = getReportCache<any[]>('debts');
    const lowStockData = getReportCache<any[]>('low_stock');
    const requiredItemsData = getReportCache<any[]>('required_items');

    if (debtsData) {
      const totalAmount = debtsData.reduce((sum: number, record: any) => sum + (record.المبلغ_المطلوب || 0), 0);
      const paidCount = debtsData.filter((r: any) => r.حالة_الدفع === 'تم الدفع').length;
      const unpaidCount = debtsData.filter((r: any) => r.حالة_الدفع !== 'تم الدفع').length;

      setStats(prev => ({
        ...prev,
        debts: {
          total: debtsData.length,
          amount: totalAmount,
          paid: paidCount,
          unpaid: unpaidCount,
        },
      }));
    }

    if (lowStockData) {
      const criticalCount = lowStockData.filter((r: any) => r.Status === 'ناقص').length;

      setStats(prev => ({
        ...prev,
        lowStock: {
          total: lowStockData.length,
          critical: criticalCount,
        },
      }));
    }

    if (requiredItemsData) {
      const criticalCount = requiredItemsData.filter((r: any) => r.مدة_نفاذ_المخزون !== null && r.مدة_نفاذ_المخزون <= 7).length;

      setStats(prev => ({
        ...prev,
        requiredItems: {
          total: requiredItemsData.length,
          critical: criticalCount,
        },
      }));
    }
  }, []);

  if (loadingInfo) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold">لوحة التحكم</h1>
        <p className="text-sm sm:text-base text-muted-foreground">نظرة عامة على الإحصائيات والتقارير</p>
      </div>

      {connection ? (
        <>
          {/* Statistics Cards */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Debts Stats */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/reports/debts")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">تقرير الديون والمستحاقات</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.debts.total.toLocaleString('en-US')}</div>
                <p className="text-xs text-muted-foreground">
                  إجمالي السجلات
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{ width: `${stats.debts.total > 0 ? (stats.debts.paid / stats.debts.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {stats.debts.paid} مدفوع
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Low Stock Stats */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/reports/low-stock")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">المنتجات الموشكة على النفاذ</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.lowStock.total.toLocaleString('en-US')}</div>
                <p className="text-xs text-muted-foreground">
                  إجمالي المنتجات
                </p>
                {stats.lowStock.critical > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {stats.lowStock.critical} حرج
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Required Items Stats */}
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/reports/required-items")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">الأصناف المطلوبة</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold">{stats.requiredItems.total.toLocaleString('en-US')}</div>
                <p className="text-xs text-muted-foreground">
                  إجمالي الأصناف
                </p>
                {stats.requiredItems.critical > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <span className="text-xs text-red-600 dark:text-red-400">
                      {stats.requiredItems.critical} حرج
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Total Amount */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium truncate pr-2">إجمالي المبلغ المطلوب</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardHeader>
              <CardContent>
                <div className="text-xl sm:text-2xl font-bold break-words">
                  {stats.debts.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} د.ل
                </div>
                <p className="text-xs text-muted-foreground">
                  المبلغ الإجمالي للديون
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div className="grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/dashboard/reports/debts")}>
              <CardHeader>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 shrink-0">
                    <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg font-bold truncate">تقرير الديون والمستحاقات</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1 line-clamp-2">
                      إدارة ومراقبة مواعيد دفع العملاء
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold">{stats.debts.total}</p>
                    <p className="text-xs text-muted-foreground">إجمالي</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-green-600">{stats.debts.paid}</p>
                    <p className="text-xs text-muted-foreground">مدفوع</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{stats.debts.unpaid}</p>
                    <p className="text-xs text-muted-foreground">غير مدفوع</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/reports/low-stock")}>
              <CardHeader>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-yellow-100 to-orange-100 dark:from-yellow-900/20 dark:to-orange-900/20 shrink-0">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg font-bold truncate">المنتجات الموشكة على النفاذ</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1 line-clamp-2">
                      منتجات تحتاج إلى إعادة تزويد
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold">{stats.lowStock.total}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">منتج موشك على النفاذ</p>
                  {stats.lowStock.critical > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {stats.lowStock.critical} حرج
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push("/reports/required-items")}>
              <CardHeader>
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900/20 dark:to-red-900/20 shrink-0">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base sm:text-lg font-bold truncate">الأصناف المطلوبة</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1 line-clamp-2">
                      مدة نفاذ المخزون للأصناف
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-bold">{stats.requiredItems.total}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground mt-2">صنف يحتاج متابعة</p>
                  {stats.requiredItems.critical > 0 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {stats.requiredItems.critical} حرج
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-semibold mb-2">لم يتم إعداد اتصال بقاعدة البيانات</p>
              <p className="text-sm text-muted-foreground mb-6">
                قم بإعداد اتصال بقاعدة البيانات للبدء في إنشاء التقارير
              </p>
              <Button onClick={() => router.push("/dashboard/settings")}>
                <Settings className="h-4 w-4 ml-2" />
                الانتقال إلى الإعدادات
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

