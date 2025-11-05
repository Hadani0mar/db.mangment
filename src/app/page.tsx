"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/auth/user-context";
import { useDatabaseConnection } from "@/hooks/use-db-connection";
import { getDbConnectionCookie, isCookieDataFresh } from "@/lib/cookies";
import { Demo } from "@/components/ui/demo";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { connection, isLoading: loadingConnection } = useDatabaseConnection();

  useEffect(() => {
    if (!loading && !loadingConnection && user) {
      // التحقق من الكوكيز أولاً للسرعة
      const cachedConnection = getDbConnectionCookie();
      
      // إذا كانت البيانات في الكوكيز وحديثة، استخدمها مباشرة
      if (cachedConnection && isCookieDataFresh(300)) {
        router.push("/dashboard");
        return;
      }

      // إذا كان المستخدم لديه اتصال موجود، توجهه مباشرة للداشبورد
      if (connection) {
        router.push("/dashboard");
      } else {
        // إذا لم يكن لديه اتصال، توجهه لصفحة إعداد قاعدة البيانات
        router.push("/database-setup");
      }
    }
  }, [user, loading, loadingConnection, connection, router]);

  if (loading || loadingConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // إذا كان المستخدم مسجل دخول، لا تعرض صفحة تسجيل الدخول
  if (user) {
    return null;
  }

  // عرض صفحة تسجيل الدخول للمستخدمين غير المسجلين
  return <Demo />;
}
