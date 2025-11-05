"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Cookie, X, CheckCircle2 } from "lucide-react";
import Cookies from "js-cookie";

const COOKIE_CONSENT_KEY = "cookie_consent_accepted";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // التحقق من وجود موافقة سابقة
    const consent = Cookies.get(COOKIE_CONSENT_KEY);
    if (!consent) {
      // إظهار البانر بعد ثانية واحدة
      setTimeout(() => {
        setShow(true);
      }, 1000);
    }
  }, []);

  const handleAccept = () => {
    // حفظ الموافقة في الكوكيز لمدة سنة
    Cookies.set(COOKIE_CONSENT_KEY, "true", {
      expires: 365,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    setShow(false);
  };

  const handleReject = () => {
    // حفظ رفض الموافقة
    Cookies.set(COOKIE_CONSENT_KEY, "false", {
      expires: 365,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    // حذف جميع الكوكيز التطبيقية
    Cookies.remove("db_app_db_connection");
    Cookies.remove("db_app_last_fetch_time");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom-5 duration-300">
      <Card className="max-w-4xl mx-auto shadow-2xl border-2">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/20 mt-1">
              <Cookie className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-lg flex items-center gap-2">
                إشعار الكوكيز
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
              </CardTitle>
              <CardDescription className="mt-1 text-sm">
                نستخدم ملفات تعريف الارتباط (الكوكيز) لتحسين تجربتك وتسريع التطبيق
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleReject}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>ما نستخدمه:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 mr-4">
                <li>الكوكيز الأساسية: لتخزين معلومات الاتصال بقاعدة البيانات (لتحسين الأداء)</li>
                <li>كوكيز المصادقة: لإدارة جلسة تسجيل الدخول</li>
              </ul>
              <p className="text-xs mt-2">
                لا نجمع أي معلومات شخصية أو نشاركها مع أطراف ثالثة. جميع البيانات محفوظة محلياً.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={handleAccept}
                className="flex-1 sm:flex-none"
                size="sm"
              >
                <CheckCircle2 className="h-4 w-4 ml-2" />
                قبول الكوكيز
              </Button>
              <Button
                onClick={handleReject}
                variant="outline"
                className="flex-1 sm:flex-none"
                size="sm"
              >
                <X className="h-4 w-4 ml-2" />
                رفض
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

