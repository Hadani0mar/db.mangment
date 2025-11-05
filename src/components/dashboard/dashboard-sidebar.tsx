"use client";

import { usePathname, useRouter } from "next/navigation";
import { useUser } from "@/components/auth/user-context";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Settings,
  FileText,
  User,
  LogOut,
  DatabaseIcon,
  CreditCard,
  Package,
  Clock,
  Home,
} from "lucide-react";

interface DashboardSidebarProps {
  onNavigate?: () => void;
}

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useUser();

  const getInitials = (email: string) => {
    return email.slice(0, 2).toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    if (onNavigate) {
      onNavigate();
    }
  };

  const menuItems = [
    {
      title: "التقارير",
      icon: FileText,
      href: "/dashboard",
      items: [
        {
          title: "لوحة التحكم",
          href: "/dashboard",
          icon: Home,
        },
        {
          title: "تقرير الديون والمستحاقات",
          href: "/dashboard/reports/debts",
          icon: CreditCard,
        },
        {
          title: "تقرير المنتجات الموشكة على النفاذ",
          href: "/reports/low-stock",
          icon: Package,
        },
        {
          title: "تقرير الأصناف المطلوبة",
          href: "/reports/required-items",
          icon: Clock,
        },
      ],
    },
    {
      title: "الإعدادات",
      icon: Settings,
      href: "/dashboard/settings",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex h-full w-full sm:w-64 flex-col bg-white dark:bg-gray-950 border-l border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex h-16 items-center gap-3 border-b border-gray-200 dark:border-gray-800 px-4">
        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white shrink-0">
          <DatabaseIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-bold truncate">لوحة التحكم</h2>
          <p className="text-xs text-muted-foreground truncate">Dashboard</p>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
          {menuItems.map((item) => (
            <div key={item.title}>
              <Button
                variant={isActive(item.href) ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 sm:gap-3 text-xs sm:text-sm",
                  isActive(item.href) && "bg-gray-100 dark:bg-gray-800"
                )}
                onClick={() => handleNavigation(item.href)}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.title}</span>
              </Button>
              {item.items && (
                <div className="mr-4 sm:mr-8 mt-1 sm:mt-2 space-y-1">
                  {item.items.map((subItem) => (
                    <Button
                      key={subItem.title}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "w-full justify-start gap-2 text-xs",
                        pathname === subItem.href &&
                          "bg-gray-100 dark:bg-gray-800"
                      )}
                      onClick={() => handleNavigation(subItem.href)}
                    >
                      <subItem.icon className="h-3 w-3 shrink-0" />
                      <span className="truncate">{subItem.title}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Profile Section */}
      <div className="border-t border-gray-200 dark:border-gray-800 p-2 sm:p-4">
        <Button
          variant={isActive("/dashboard/profile") ? "secondary" : "ghost"}
          className={cn(
            "w-full justify-start gap-2 sm:gap-3 mb-2 sm:mb-3 text-xs sm:text-sm",
            isActive("/dashboard/profile") && "bg-gray-100 dark:bg-gray-800"
          )}
          onClick={() => handleNavigation("/dashboard/profile")}
        >
          <User className="h-4 w-4 shrink-0" />
          <span className="truncate">البروفايل</span>
        </Button>

        {user && (
          <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
            <Avatar className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
              <AvatarImage
                src={user.user_metadata?.avatar_url}
                alt={user.email || ""}
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-xs sm:text-sm">
                {getInitials(user.email || "U")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate">
                {user.user_metadata?.full_name || user.email?.split("@")[0] || "مستخدم"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        )}

        <Separator className="my-2 sm:my-3" />

        <Button
          variant="ghost"
          className="w-full justify-start gap-2 sm:gap-3 text-xs sm:text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span className="truncate">تسجيل الخروج</span>
        </Button>
      </div>
    </div>
  );
}

