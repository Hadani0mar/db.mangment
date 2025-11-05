import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  getDbConnectionCookie, 
  setDbConnectionCookie, 
  isCookieDataFresh,
  removeDbConnectionCookie 
} from "@/lib/cookies";

interface DatabaseConnection {
  id: string;
  user_id: string;
  server_name: string;
  server_address: string;
  database_name: string;
  username: string;
  // password_encrypted لا يتم إرجاعه من API - محفوظ في Supabase فقط
  sql_server_version: string;
  sql_server_full_version: string;
  is_active: boolean;
  last_connected_at: string;
  created_at: string;
  updated_at: string;
}

interface TestConnectionResponse {
  success: boolean;
  message: string;
  data?: {
    serverName: string;
    databaseName: string;
    version: string;
    fullVersion: string;
    connectionInfo: {
      server: string;
      database: string;
      user: string;
    };
  };
}

export function useDatabaseConnection() {
  const queryClient = useQueryClient();

  // جلب معلومات الاتصال - مع استخدام الكوكيز للتحسين
  const { data, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: DatabaseConnection | null;
  }>({
    queryKey: ["db-connection"],
    queryFn: async () => {
      // محاولة قراءة البيانات من الكوكيز أولاً
      const cachedData = getDbConnectionCookie();
      
      // إذا كانت البيانات موجودة وحديثة (أقل من 5 دقائق)، استخدمها
      if (cachedData && isCookieDataFresh(300)) {
        console.log('Using cached data from cookies');
        return {
          success: true,
          data: cachedData,
        };
      }

      // إذا لم تكن البيانات موجودة أو قديمة، جلبها من API
      const response = await fetch("/api/get-db-connection");
      if (!response.ok) {
        throw new Error("Failed to fetch connection");
      }
      const result = await response.json();
      
      // حفظ البيانات في الكوكيز بعد جلبها
      if (result.success && result.data) {
        setDbConnectionCookie(result.data);
      }
      
      return result;
    },
    staleTime: 30 * 1000, // 30 ثانية
    gcTime: 2 * 60 * 1000, // دقيقتان
    refetchOnWindowFocus: false, // لا تعيد الجلب عند التركيز
    refetchOnMount: false, // لا تعيد الجلب عند التركيب إذا كانت البيانات موجودة
  });

  // اختبار الاتصال وحفظه
  const testConnectionMutation = useMutation<TestConnectionResponse, Error, {
    server: string;
    user: string;
    password: string;
    database: string;
  }>({
    mutationFn: async (connectionData) => {
      const response = await fetch("/api/test-db-connection", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(connectionData),
      });
      if (!response.ok) {
        throw new Error("Failed to test connection");
      }
      return response.json();
    },
    onSuccess: (data) => {
      // إعادة جلب البيانات بعد الحفظ الناجح
      queryClient.invalidateQueries({ queryKey: ["db-connection"] });
      
      // تحديث الكوكيز بعد نجاح الاتصال
      if (data.success) {
        // سيتم تحديث الكوكيز تلقائياً في queryFn عند إعادة الجلب
      }
    },
  });

  return {
    connection: data?.data || null,
    isLoading,
    error,
    refetch,
    testConnection: testConnectionMutation.mutate,
    isTesting: testConnectionMutation.isPending,
    testError: testConnectionMutation.error,
    testResult: testConnectionMutation.data,
  };
}
