"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function ReactQueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 دقيقة - البيانات تعتبر جديدة لمدة دقيقة
            gcTime: 5 * 60 * 1000, // 5 دقائق - إبقاء البيانات في الكاش لمدة 5 دقائق
            refetchOnWindowFocus: false, // عدم إعادة الجلب عند التركيز على النافذة
            retry: 1, // إعادة المحاولة مرة واحدة فقط
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

