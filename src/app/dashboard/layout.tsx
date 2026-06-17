'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/layout/dashboard-sidebar";
import { Separator } from "@/components/ui/separator";
import { useUser, useFirestore, useAuth } from "@/firebase";
import { Loader2, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { ChevronUp } from "lucide-react"

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
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkAuthorization() {
      if (authLoading) return;
      
      if (!user) {
        router.push("/login");
        return;
      }

      const cleanEmail = user.email?.trim().toLowerCase();
      if (!cleanEmail) {
        setAuthorized(false);
        return;
      }

      // Hardcoded Admin bypass
      if (cleanEmail === WHITELISTED_ADMIN_EMAIL.toLowerCase()) {
        setAuthorized(true);
        return;
      }

      try {
        const adminQuery = query(
          collection(db, "adminUsers"), 
          where("email", "==", cleanEmail), 
          limit(1)
        );
        const adminSnap = await getDocs(adminQuery);
        
        const isAuth = !adminSnap.empty;
        setAuthorized(isAuth);
      } catch (error) {
        console.error("Authorization check failed", error);
        setAuthorized(false);
      }
    }

    checkAuthorization();
  }, [user, authLoading, db, router]);

  const handleSignOut = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (authLoading || (authorized === null)) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="font-bold uppercase text-[10px] tracking-[0.3em] opacity-40">Verifying Security Clearance...</p>
      </div>
    );
  }

  if (authorized === false) {
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
            Your account ({user?.email}) has not been authorized to access the FastDocs Console. Please contact a Super Admin to authorize this email address.
          </p>
          <Button onClick={handleSignOut} className="w-full h-12 font-bold uppercase shadow-none">
            <LogOut className="mr-2 h-4 w-4" /> Sign Out
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-background">
        <header className="flex h-20 shrink-0 items-center gap-2 border-b border-foreground/10 px-6 bg-[#0f326e] text-white">
          <SidebarTrigger className="-ml-1 hover:bg-white/10 hover:text-white" />
          <Separator orientation="vertical" className="mr-2 h-6 bg-white/20" />
          <div className="flex-1 flex flex-col justify-center">
             <h1 className="font-headline font-bold text-lg uppercase tracking-tight leading-none">
               FastDocs <span className="text-primary">Console</span>
             </h1>
             <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Callb<span className="relative inline-block">o<ChevronUp className="absolute -top-[0.2em] left-1/2 -translate-x-1/2 h-[0.5em] w-[0.5em] text-primary" strokeWidth={4} /></span>x Inc. Davao</span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <NotificationBell />
          </div>
        </header>
        <main className="p-6 bg-background min-h-screen">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
