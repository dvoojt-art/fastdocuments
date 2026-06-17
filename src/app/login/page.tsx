'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail, updateProfile } from "firebase/auth";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, ShieldAlert, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useAuth, useFirestore } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronUp } from "lucide-react"

const SUPER_ADMIN_EMAIL = "admin@callboxinc.com";

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  
  const router = useRouter();
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  const handleLogin = async (e: FormEvent) => {e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: FormEvent) => {e.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password || !displayName) {
      toast({
        title: "Missing Info",
        description: "Please fill in all fields.",
        variant: "destructive"
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Weak Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Super Admin Bypass Check
      let authorized = cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase();

     // 2. Database Check (if not Super Admin)
if (!authorized) {
  console.log("Checking whitelist...");
  console.log("Email:", cleanEmail);

  const adminQuery = query(
    collection(db, "adminUsers"),
    where("email", "==", cleanEmail),
    limit(1)
  );

  const adminSnap = await getDocs(adminQuery);

  console.log("Whitelist query completed");
  console.log("Found records:", adminSnap.size);

  authorized = !adminSnap.empty;
}

      // 3. Create the user in Auth
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      
      // 4. Set Profile
      await updateProfile(userCredential.user, { 
        displayName: displayName.trim() 
      });
      
      toast({
        title: "Account Activated",
        description: "Your authorized account is ready. Welcome to FastDocs!",
      });
      router.push("/dashboard");
      } catch (error: any) {
    console.error("Signup error code:", error.code);
    console.error("Signup error message:", error.message);
    console.error("Full signup error:", error);

    let message = error.message;

    if (error.code === "auth/email-already-in-use") {
      message = "This email is already registered. Please use the Login tab to enter.";
    } else if (error.code === "auth/weak-password") {
      message = "Password should be at least 6 characters.";
    }

    toast({
      title: "Setup Failed",
      description: message,
      variant: "destructive",
    });
  } finally {
    setLoading(false);
  }
};

  const handleResetPassword = async () => {
  const cleanResetEmail = resetEmail.trim().toLowerCase();

  if (!cleanResetEmail) return;

  setResetLoading(true);

  try {
    await sendPasswordResetEmail(auth, cleanResetEmail);

    console.log("RESET SENT SUCCESSFULLY");
     console.log("PROJECT:", auth.app.options.projectId);
     
    toast({
      title: "Instructions Sent",
      description: "Please check your inbox for the reset link.",
    });

    setIsResetDialogOpen(false);
  } catch (e: any) {
    console.log("RESET ERROR:", e.code, e.message);

    toast({
      title: "Reset Failed",
      description: e.message,
      variant: "destructive",
    });
  } finally {
    setResetLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0 opacity-20">
        <div className="absolute top-[10%] left-[10%] w-64 h-64 rounded-full bg-primary/20 blur-3xl"></div>
        <div className="absolute bottom-[10%] right-[10%] w-96 h-96 rounded-full bg-[#07224f]/10 blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-[#07224f] py-10 rounded-t-3xl flex flex-col items-center justify-center shadow-xl border-b border-white/10">
          <Link href="/" className="flex flex-col items-center group">
            <div className="flex items-center gap-3">
              <div className="bg-primary h-12 w-12 rounded-full flex items-center justify-center text-primary-foreground font-headline font-bold text-2xl shadow-lg">
                F
              </div>
              <span className="font-headline font-bold text-3xl tracking-tight text-white">FastDocs</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mt-1">Callb<span className="relative inline-block">o<ChevronUp className="absolute -top-[0.2em] left-1/2 -translate-x-1/2 h-[0.5em] w-[0.5em] text-primary" strokeWidth={4} /></span>x Inc. Davao</span>
          </Link>
        </div>

        <Card className="border-none shadow-2xl overflow-hidden rounded-t-none">
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12">
                <TabsTrigger value="login" className="font-bold uppercase text-xs">Login</TabsTrigger>
                <TabsTrigger value="signup" className="font-bold uppercase text-xs">Set Up Access</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold text-[11px] uppercase opacity-60">Email Address</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email address" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password" className="font-bold text-[11px] uppercase opacity-60">Password</Label>
                      <button
                        type="button"
                        onClick={() => setIsResetDialogOpen(true)}
                        className="text-[10px] font-bold uppercase text-primary hover:underline"
                      >
                        Forgot Password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input 
                        id="password" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pr-10"
                        required 
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full h-14 font-bold text-lg shadow-lg mt-4">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <div className="bg-muted/50 p-4 rounded-lg border mb-6 flex items-start gap-3">
                  <ShieldAlert className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <p className="text-[10px] font-medium leading-relaxed uppercase opacity-70">
                    Your email must be whitelisted in <strong>User Management</strong> before you can activate your login access.
                  </p>
                </div>
                
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name" className="font-bold text-[11px] uppercase opacity-60">Full Name</Label>
                    <Input 
                      id="signup-name" 
                      placeholder="e.g., Daryl Cortes" 
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="h-12"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email" className="font-bold text-[11px] uppercase opacity-60">Email Address</Label>
                    <Input 
                      id="signup-email" 
                      type="email" 
                      placeholder="admin@callboxinc.com" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-12"
                      required 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password" className="font-bold text-[11px] uppercase opacity-60">Create Password</Label>
                    <div className="relative">
                      <Input 
                        id="signup-password" 
                        type={showSignupPassword ? "text" : "password"} 
                        placeholder="Minimum of 6 characters"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-12 pr-10"
                        required 
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignupPassword(!showSignupPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button type="submit" disabled={loading} className="w-full h-14 font-bold text-lg shadow-lg mt-4">
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Activate Access'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 border-t bg-[#07224f] p-6">
            <Link href="/" className="text-[14px] font-bold uppercase text-white/60 hover:text-white transition-opacity text-center w-full flex items-center justify-center gap-2">
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Link>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline font-bold uppercase">Reset Password</DialogTitle>
            <DialogDescription className="font-bold opacity-60 uppercase text-[10px] tracking-widest">
              Enter your email to receive a recovery link
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reset-email" className="font-bold text-xs uppercase">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="admin@callboxinc.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleResetPassword} disabled={resetLoading} className="w-full font-bold">
              {resetLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Send Recovery Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
