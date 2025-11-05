"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/auth/user-context";
import { useDatabaseConnection } from "@/hooks/use-db-connection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Database, Server, User, Key, Loader2, CheckCircle2, XCircle } from "lucide-react";

export default function DatabaseSetupPage() {
  const { user, loading } = useUser();
  const router = useRouter();
  const { connection, testConnection, isTesting, testError, testResult } = useDatabaseConnection();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
      return;
    }
    // لا نوجه المستخدم تلقائياً - قد يريد تحديث الاتصال
  }, [user, loading, router]);

  useEffect(() => {
    if (testResult) {
      if (testResult.success && testResult.data) {
        toast.success('تم الاتصال بنجاح', {
          description: 'جاري توجيهك للداشبورد...',
        });
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        toast.error('فشل الاتصال', {
          description: testResult.message || 'حدث خطأ أثناء الاتصال',
        });
      }
    }
    if (testError) {
      toast.error('حدث خطأ', {
        description: testError.message || 'فشل الاتصال بقاعدة البيانات',
      });
    }
  }, [testResult, testError, router]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const connectionData = {
      server: formData.get('server') as string || 'localhost',
      user: formData.get('user') as string || 'sa',
      password: formData.get('password') as string || '',
      database: formData.get('database') as string || 'master',
    };

    testConnection(connectionData);
  };

  if (loading) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border shadow-sm">
          <CardHeader className="space-y-1 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <Database className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-xl">إعداد الاتصال</CardTitle>
            </div>
            <CardDescription className="text-sm">
              {connection ? 'تحديث معلومات الاتصال بقاعدة البيانات SQL Server' : 'أدخل معلومات الاتصال بقاعدة البيانات SQL Server'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="server" className="text-sm font-medium flex items-center gap-2">
                  <Server className="h-4 w-4 text-muted-foreground" />
                  اسم الخادم
                </Label>
                <Input
                  id="server"
                  name="server"
                  type="text"
                  placeholder="localhost"
                  defaultValue={connection?.server_address || 'localhost'}
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="user" className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  اسم المستخدم
                </Label>
                <Input
                  id="user"
                  name="user"
                  type="text"
                  placeholder="sa"
                  defaultValue={connection?.username || 'sa'}
                  className="h-9"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  كلمة المرور
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="كلمة المرور (اختياري)"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="database" className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4 text-muted-foreground" />
                  اسم قاعدة البيانات
                </Label>
                <Input
                  id="database"
                  name="database"
                  type="text"
                  placeholder="master"
                  defaultValue={connection?.database_name || 'master'}
                  className="h-9"
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full h-9"
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                    جاري الاختبار...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 ml-2" />
                    اختبار الاتصال
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                تأكد من أن SQL Server يعمل وأن Authentication مفعل
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
