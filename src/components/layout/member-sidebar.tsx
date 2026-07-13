"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { FileText, Settings, ChevronUp, LogOut, Send } from "lucide-react"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useAuth, useUser } from "@/firebase"
import { signOut } from "firebase/auth"

export function MemberSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const handleLogout = async () => {
    try {
      if (user?.email) {
        sessionStorage.removeItem(`fd_role_${user.email.toLowerCase()}`);
      }
      await signOut(auth)
      router.push("/")
    } catch (error) {
      console.error("Logout failed:", error)
    }
  }
  const userName = user?.displayName || user?.email?.split('@')[0] || "Member"
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
        { title: "My Documents", url: "/dashboard", icon: FileText },
      ],
    },
    {
      title: "Actions",
      items: [
        { title: "Request Certificate", url: "/dashboard/member/requests/new", icon: Send },
      ],
    },
    {
      title: "Account",
      items: [
        { title: "Profile Settings", url: "/dashboard/settings", icon: Settings },
      ],
    },
  ]

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-foreground/10"
      style={{
        "--sidebar-background": "0 0% 60%", // #C4C4C4
        "--sidebar-foreground": "0 0% 0%",
        "--sidebar-primary": "45 93% 47%",
        "--sidebar-primary-foreground": "0 0% 0%",
        "--sidebar-accent": "0 0% 70%",
        "--sidebar-accent-foreground": "0 0% 0%",
        "--sidebar-border": "0 0% 65%",
      } as React.CSSProperties}
    >
      <SidebarHeader className="h-20 flex flex-col justify-center px-4 border-b border-foreground/10">
        <Link href="/dashboard" className="flex flex-col">
          <div className="flex items-center gap-2">
            <div className="bg-primary h-8 w-8 rounded-full flex items-center justify-center text-primary-foreground font-headline font-bold text-xl">F</div>
            <span className="font-headline font-bold text-xl tracking-tight group-data-[collapsible=icon]:hidden text-foreground">
              FastDocs</span>
          </div>
          <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-60 ml-10 -mt-0.5 group-data-[collapsible=icon]:hidden text-foreground">Callb<span className="relative inline-block">o<ChevronUp className="absolute -top-[0.2em] left-1/2 -translate-x-1/2 h-[0.5em] w-[0.5em]" strokeWidth={4} /></span>x Inc. Davao</span>
       </Link>
      </SidebarHeader>
      <SidebarContent>
        {navData.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel className="font-bold uppercase tracking-widest text-[10px] opacity-70 text-foreground">{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title} className="font-bold hover:bg-black/5">
                      <Link href={item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
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
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-black/5 text-foreground">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">{userInitials}</div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{userName}</span>
                    <span className="truncate text-xs opacity-60">Employee</span>
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
