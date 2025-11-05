"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { RefreshCw, Menu } from "lucide-react";
import { clearAllReportCache } from "@/lib/cookies";
import { toast } from "sonner";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

export function DashboardNavbar() {
  const router = useRouter();
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // تحديث جميع التقارير
  const refreshAllReports = async () => {
    setRefreshingAll(true);
    try {
      // مسح جميع التخزينات المحلية
      clearAllReportCache();

      // إعادة تحميل الصفحة لإجبار جميع التقارير على جلب البيانات الجديدة
      toast.success("تم مسح التخزين المحلي", {
        description: "جاري تحديث جميع التقارير...",
      });

      // إعادة تحميل الصفحة بعد ثانية
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error refreshing all reports:", error);
      toast.error("حدث خطأ أثناء تحديث التقارير", {
        description: "يرجى المحاولة مرة أخرى",
      });
      setRefreshingAll(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex h-full items-center justify-between px-3 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Mobile Menu Button */}
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">فتح القائمة</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96 p-0">
                <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
              </SheetContent>
            </Sheet>
            <h1 className="text-base sm:text-lg font-bold truncate">لوحة التحكم</h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={refreshAllReports}
              disabled={refreshingAll}
              className="text-xs sm:text-sm"
            >
              {refreshingAll ? (
                <RefreshCw className="h-4 w-4 ml-1 sm:ml-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 ml-1 sm:ml-2" />
              )}
              <span className="hidden sm:inline">تحديث جميع التقارير</span>
              <span className="sm:hidden">تحديث</span>
            </Button>
          </div>
        </div>
      </header>
    </>
  );
}

