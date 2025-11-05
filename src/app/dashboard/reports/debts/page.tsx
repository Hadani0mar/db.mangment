"use client";

import { useDatabaseConnection } from "@/hooks/use-db-connection";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Settings } from "lucide-react";
import { DebtsReport } from "@/components/reports/debts-report";
import { useRouter } from "next/navigation";

export default function DebtsReportPage() {
  const router = useRouter();
  const { connection, isLoading: loadingInfo } = useDatabaseConnection();

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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">تقرير الديون والمستحاقات</h1>
        <p className="text-muted-foreground">إدارة ومراقبة مواعيد دفع العملاء</p>
      </div>

      {connection ? (
        <DebtsReport />
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

