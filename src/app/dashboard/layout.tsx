'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { MemberSidebar } from "@/components/layout/member-sidebar";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils";

const WHITELISTED_ADMIN_EMAIL = "admin@callboxinc.com";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, loading: authLoading } = useUser();
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'member' | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAuthorization() {
      if (authLoading) return;
      
      if (!user) {
        router.push("/login");
        return;
      }

      const cleanEmail = user.email?.trim().toLowerCase();
      if (!cleanEmail) {
        setRole(null);
        setChecking(false);
        return;
      }

      const cachedRole = sessionStorage.getItem(`fd_role_${cleanEmail}`);
      if (cachedRole) {
        setRole(cachedRole as 'admin' | 'member');
        setChecking(false);
        return;
      }

      if (cleanEmail === WHITELISTED_ADMIN_EMAIL.toLowerCase()) {
        const detectedRole = 'admin';
        setRole(detectedRole);
        sessionStorage.setItem(`fd_role_${cleanEmail}`, detectedRole);
        setChecking(false);
        return;
      }

      try {
        const [adminSnap, empSnap] = await Promise.all([
          getDocs(query(collection(db, "adminUsers"), where("email", "==", cleanEmail), limit(1))),
          getDocs(query(collection(db, "employees"), where("email", "==", cleanEmail), limit(1)))
        ]);

        let detectedRole: 'admin' | 'member' | null = null;
        if (!adminSnap.empty) {
          detectedRole = 'admin';
        } else if (!empSnap.empty) {
          detectedRole = 'member';
        }

        setRole(detectedRole);
        if (detectedRole) {
          sessionStorage.setItem(`fd_role_${cleanEmail}`, detectedRole);
        }
      } catch (error) {
        console.error("Authorization check failed", error);
      } finally {
        setChecking(false);
      }
    }

    checkAuthorization();
  }, [user, authLoading, db, router]);

  const handleSignOut = async () => {
    if (user?.email) {
      sessionStorage.removeItem(`fd_role_${user.email.toLowerCase()}`);
    }
    await signOut(auth);
    router.push("/login");
  };

  if (authLoading || (checking && !role)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        <p className="font-bold uppercase text-[10px] tracking-[0.3em] opacity-40">Verifying Security Clearance...</p>
      </div>
    );
  }

  if (role === null) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#0f326e] p-6">
        <div className="max-w-md w-full bg-background rounded-3xl p-10 text-center shadow-none space-y-6">
          <div className="mx-auto bg-destructive h-20 w-20 rounded-full flex items-center justify-center text-destructive-foreground">
            <ShieldAlert className="h-10 w-10" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-headline font-bold uppercase tracking-tight">Access Denied</h2>
            <p className="font-bold opacity-60 uppercase text-[10px] tracking-widest">Unauthorized User</p>
          </div>
          <p className="text-sm font-medium leading-relaxed opacity-80">
            Your account ({user?.email}) has not been authorized. Please contact HR to ensure your email is registered.
          </p>
          <Button onClick={handleSignOut} className="w-full h-12 font-bold uppercase shadow-none border-2 border-primary">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      {role === 'admin' ? <DashboardSidebar /> : <MemberSidebar />}
      <SidebarInset className="bg-background">
        <header className={cn(
          "flex h-20 shrink-0 items-center gap-2 border-b transition-colors duration-500 px-6",
          role === 'admin' 
            ? "bg-[#0f326e] text-white border-white/10" 
            : "bg-[#ADADAD] text-foreground border-foreground/10"
        )}>
          <SidebarTrigger className={cn("-ml-1", role === 'admin' ? "hover:bg-white/10 text-white" : "hover:bg-black/5 text-foreground")} />
          <Separator orientation="vertical" className={cn("mr-2 h-6", role === 'admin' ? "bg-white/20" : "bg-foreground/20")} />
          <div className="flex-1 flex flex-col justify-center">
             <h1 className="font-headline font-bold text-lg uppercase tracking-tight leading-none">
               FastDocs <span className="text-primary">Console</span>
             </h1>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Callb<span className="relative inline-block">o<ChevronUp className="absolute -top-[0.2em] left-1/2 -translate-x-1/2 h-[0.5em] w-[0.5em] text-primary" strokeWidth={4} /></span>x Inc. Davao</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            
            <NotificationBell role={role} user={user} />
          </div>
        </header>
        <main className="p-6 bg-background min-h-screen">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
