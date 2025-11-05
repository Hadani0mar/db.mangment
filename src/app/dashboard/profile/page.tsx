"use client";

import { useUser } from "@/components/auth/user-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { User, Mail, Calendar, LogOut } from "lucide-react";
import { formatDateTimeArabic } from "@/lib/date-utils";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ProfilePage() {
  const { user, signOut } = useUser();
  const router = useRouter();

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  if (!user) {
    return null;
  }

  const userCreatedAt = user.created_at
    ? formatDateTimeArabic(new Date(user.created_at).toISOString())
    : "غير متوفر";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">البروفايل</h1>
        <p className="text-muted-foreground">معلومات المستخدم</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>معلومات الحساب</CardTitle>
          <CardDescription>تفاصيل حسابك الشخصي</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={user.user_metadata?.avatar_url}
                alt={user.email || ""}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-2xl">
                {getInitials(user.email || "U")}
              </AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-semibold">
                {user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "مستخدم"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {user.user_metadata?.role || "مستخدم"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Email */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20">
              <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">البريد الإلكتروني</p>
              <p className="text-base font-semibold">{user.email || "غير متوفر"}</p>
            </div>
          </div>

          <Separator />

          {/* Created At */}
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20">
              <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">تاريخ التسجيل</p>
              <p className="text-base font-semibold">{userCreatedAt}</p>
            </div>
          </div>

          <Separator />

          {/* Sign Out Button */}
          <div className="flex justify-end pt-4">
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              تسجيل الخروج
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



