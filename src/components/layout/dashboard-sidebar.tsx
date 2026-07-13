"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { LayoutDashboard, FileText, Settings, CheckSquare, Zap, Activity, LogOut, ChevronUp, Users, ShieldAlert } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarMenuBadge, SidebarRail } from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { collection, query, where } from "firebase/firestore"

export function DashboardSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const db = useFirestore()
  const adminQuery = useMemoFirebase(() => {
    if (!db || !user?.email) return null
    return query(collection(db, "adminUsers"), where("email", "==", user.email.toLowerCase()))
  }, [db, user?.email])

  const { data: adminData } = useCollection(adminQuery)
  const userRole = adminData?.[0]?.role || "Super Admin"
  const employeesCountQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "employees")
  }, [db])
  const { data: employees } = useCollection(employeesCountQuery)
  const documentsCountQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "certificates")
  }, [db])
  const { data: documents } = useCollection(documentsCountQuery)
  const pendingCountQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "certificates"), where("status", "==", "Pending"))
  }, [db])
  const { data: pendingItems } = useCollection(pendingCountQuery)
    const passwordResetQuery = useMemoFirebase(() => {
  if (!db) return null

  return query(
    collection(db, "passwordResetRequests"),
    where("status", "==", "Pending")
  )
}, [db])

const { data: passwordResetRequests } = useCollection(passwordResetQuery)
  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }

  const userName = user?.displayName || user?.email?.split('@')[0] || "Admin User"
  const userInitials = userName
    .split(' ')
    .filter(Boolean)
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2)

  const navData = [
    {
      title: "Navigation",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
        { title: "Employees", url: "/dashboard/employees", icon: Users, count: employees?.length ?? 0 },
        { title: "Documents", url: "/dashboard/certificates", icon: FileText, count: documents?.length ?? 0 },
      ],
    },
    
    {
      title: "Shortcuts",
      items: [
        { 
          title: "Quick Draft", 
          url: "/dashboard/certificates/new", 
          icon: Zap 
        },
        { 
          title: "HR Approval Desk", 
          url: "/dashboard/approvals", 
          icon: CheckSquare, 
          count: pendingItems?.length ?? 0, 
          variant: "primary" 
        },
        { 
          title: "Password Reset Requests", 
          url: "/dashboard/password-reset", 
          icon: ShieldAlert 
        },
      ],
    },
    {
      title: "System",
      items: [
        { title: "User Management", url: "/dashboard/users", icon: ShieldAlert },
        { title: "Activity", url: "/dashboard/logs", icon: Activity },
        { title: "Settings", url: "/dashboard/settings", icon: Settings },
      ],
    },
  ]
  return (
    <Sidebar collapsible="icon" className="border-r border-foreground/10">
      <SidebarHeader className="h-20 flex flex-col justify-center px-4 border-b border-foreground/10">
        <Link href="/dashboard" className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="bg-primary h-8 w-8 rounded-full flex items-center justify-center text-primary-foreground font-headline font-bold text-xl">F</div>
            <span className="font-headline font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden">FastDocs</span>
          </div>
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-primary ml-10 -mt-0.5 group-data-[collapsible=icon]:hidden">Callb<span className="relative inline-block">o<ChevronUp className="absolute -top-[0.2em] left-1/2 -translate-x-1/2 h-[0.5em] w-[0.5em] text-primary" strokeWidth={4} /></span>x Inc. Davao</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        {navData.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="font-bold uppercase tracking-widest text-[10px] opacity-50">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title} className="font-bold">
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                    {item.count !== undefined && (
                      <SidebarMenuBadge className={"variant" in item && item.variant === "primary" ? "bg-primary text-primary-foreground font-bold" : "bg-muted-foreground/20 text-foreground font-bold"}>
                        ({item.count})
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-foreground/10 p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">{userInitials}</div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs opacity-60">{userRole}</span>
                  </div>
                  <ChevronUp className="ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-none border-2 border-foreground" align="start">
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer font-bold focus:bg-destructive focus:text-destructive-foreground">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}