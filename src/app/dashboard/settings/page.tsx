"use client";

import { useRouter } from "next/navigation";
import { useDatabaseConnection } from "@/hooks/use-db-connection";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Server, 
  Database, 
  Code, 
  Settings, 
  CheckCircle2,
  Activity,
  DatabaseIcon,
  ServerIcon,
  BarChart3,
  ArrowRight,
} from "lucide-react";
import { formatDateTimeArabic } from "@/lib/date-utils";

interface DatabaseInfo {
  serverName: string;
  databaseName: string;
  version: string;
  fullVersion: string;
  connectionInfo: {
    server: string;
    database: string;
    user: string;
  };
  lastConnectedAt?: string;
  createdAt?: string;
}

export default function SettingsPage() {
  const router = useRouter();
  const { connection, isLoading: loadingInfo } = useDatabaseConnection();

  // تحويل البيانات من Supabase إلى الشكل المطلوب
  const dbInfo: DatabaseInfo | null = connection
    ? {
        serverName: connection.server_name,
        databaseName: connection.database_name,
        version: connection.sql_server_version || 'Unknown',
        fullVersion: connection.sql_server_full_version || '',
        connectionInfo: {
          server: connection.server_address,
          database: connection.database_name,
          user: connection.username,
        },
        lastConnectedAt: connection.last_connected_at,
        createdAt: connection.created_at,
      }
    : null;

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
        <h1 className="text-2xl font-bold">الإعدادات</h1>
        <p className="text-muted-foreground">إدارة إعدادات قاعدة البيانات والاتصال</p>
      </div>

      {dbInfo ? (
          <div className="space-y-6">
            {/* Status Banner */}
            <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-lg">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-green-900 dark:text-green-100 text-lg">
                        متصل بنجاح
                      </h3>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        قاعدة البيانات متصلة وجاهزة للاستخدام
                      </p>
                      {dbInfo.lastConnectedAt && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                          آخر اتصال: {formatDateTimeArabic(dbInfo.lastConnectedAt)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push("/database-setup")}
                      className="border-green-300 hover:bg-green-100 dark:hover:bg-green-900/30"
                    >
                      <Settings className="h-4 w-4 ml-2" />
                      تحديث الاتصال
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">اسم الخادم</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{dbInfo.serverName}</div>
                  <p className="text-xs text-muted-foreground truncate">
                    {dbInfo.connectionInfo.server}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">قاعدة البيانات</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{dbInfo.databaseName}</div>
                  <p className="text-xs text-muted-foreground">
                    قاعدة البيانات المتصلة
                  </p>
                </CardContent>
              </Card>

              <Card className="border-2 shadow-lg hover:shadow-xl transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">إصدار SQL Server</CardTitle>
                  <Code className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{dbInfo.version}</div>
                  <p className="text-xs text-muted-foreground">
                    SQL Server Edition
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
                <TabsTrigger value="connection">تفاصيل الاتصال</TabsTrigger>
                <TabsTrigger value="version">معلومات الإصدار</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات قاعدة البيانات</CardTitle>
                    <CardDescription>
                      نظرة عامة على معلومات قاعدة البيانات المتصلة
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-6">
                    <div className="grid gap-6 md:grid-cols-2">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <ServerIcon className="h-4 w-4" />
                          <span>اسم الخادم</span>
                        </div>
                        <p className="text-lg font-semibold">{dbInfo.serverName}</p>
                        <p className="text-xs text-muted-foreground">{dbInfo.connectionInfo.server}</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Database className="h-4 w-4" />
                          <span>قاعدة البيانات</span>
                        </div>
                        <p className="text-lg font-semibold">{dbInfo.databaseName}</p>
                        <p className="text-xs text-muted-foreground">قاعدة البيانات الحالية</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Code className="h-4 w-4" />
                          <span>الإصدار</span>
                        </div>
                        <p className="text-lg font-semibold">SQL Server {dbInfo.version}</p>
                        <p className="text-xs text-muted-foreground">إصدار SQL Server</p>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Activity className="h-4 w-4" />
                          <span>المستخدم</span>
                        </div>
                        <p className="text-lg font-semibold">{dbInfo.connectionInfo.user}</p>
                        <p className="text-xs text-muted-foreground">مستخدم الاتصال</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="connection" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>تفاصيل الاتصال</CardTitle>
                    <CardDescription>
                      معلومات الاتصال بقاعدة البيانات
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <Server className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">الخادم</p>
                            <p className="text-xs text-muted-foreground">Server Address</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold font-mono">{dbInfo.connectionInfo.server}</p>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <Database className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">قاعدة البيانات</p>
                            <p className="text-xs text-muted-foreground">Database Name</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold font-mono">{dbInfo.connectionInfo.database}</p>
                      </div>

                      <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                        <div className="flex items-center gap-3">
                          <Activity className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">المستخدم</p>
                            <p className="text-xs text-muted-foreground">Username</p>
                          </div>
                        </div>
                        <p className="text-sm font-semibold font-mono">{dbInfo.connectionInfo.user}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="version" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>معلومات الإصدار الكاملة</CardTitle>
                    <CardDescription>
                      تفاصيل إصدار SQL Server
                    </CardDescription>
                  </CardHeader>
                  <Separator />
                  <CardContent className="pt-6">
                    <div className="bg-muted rounded-lg p-4 border">
                      <pre className="text-xs font-mono whitespace-pre-wrap break-words leading-relaxed">
                        {dbInfo.fullVersion}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>إجراءات سريعة</CardTitle>
                <CardDescription>
                  التنقل السريع بين الصفحات
                </CardDescription>
              </CardHeader>
              <Separator />
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Button
                    variant="outline"
                    className="h-auto p-6 flex flex-col items-start gap-2 hover:bg-accent"
                    onClick={() => router.push("/dashboard")}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <BarChart3 className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold flex-1">التقارير والاستعلامات</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-muted-foreground text-right">
                      عرض التقارير وتنفيذ الاستعلامات
                    </p>
                  </Button>

                  <Button
                    variant="outline"
                    className="h-auto p-6 flex flex-col items-start gap-2 hover:bg-accent"
                    onClick={() => router.push("/database-setup")}
                  >
                    <div className="flex items-center gap-2 w-full">
                      <Settings className="h-5 w-5 text-green-600" />
                      <span className="font-semibold flex-1">تحديث الاتصال</span>
                      <ArrowRight className="h-4 w-4" />
                    </div>
                    <p className="text-sm text-muted-foreground text-right">
                      تحديث إعدادات الاتصال بقاعدة البيانات
                    </p>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <p className="text-lg font-semibold mb-2">لم يتم إعداد اتصال بقاعدة البيانات</p>
                <p className="text-sm text-muted-foreground mb-6">
                  قم بإعداد اتصال بقاعدة البيانات للبدء
                </p>
                <Button onClick={() => router.push("/database-setup")}>
                  <Settings className="h-4 w-4 ml-2" />
                  إعداد قاعدة البيانات
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
    </div>
  );
}

