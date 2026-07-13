 "use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { addDoc, collection, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useFirestore } from "@/firebase";

export default function ForgotPasswordPage() {
  const db = useFirestore();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  if (!email.trim()) {
    toast({
      title: "Email Required",
      description: "Please enter your company email.",
      variant: "destructive",
    });
    return;
  }

  setIsLoading(true);

  try {
    // STEP 1: Check if employee exists
    const employeeQuery = query(
      collection(db, "employees"),
      where("email", "==", email.trim())
    );

    const employeeSnapshot = await getDocs(employeeQuery);

    if (employeeSnapshot.empty) {
      toast({
        title: "Employee Not Found",
        description: "No employee is registered with this email.",
        variant: "destructive",
      });

      setIsLoading(false);
      return;
    }

    const employee = employeeSnapshot.docs[0].data();

    // STEP 2: Check if there's already a pending request
    const requestQuery = query(
      collection(db, "passwordResetRequests"),
      where("email", "==", email.trim()),
      where("status", "==", "Pending")
    );

    const requestSnapshot = await getDocs(requestQuery);

    if (!requestSnapshot.empty) {
      toast({
        title: "Request Already Submitted",
        description:
          "Your password reset request is already waiting for HR approval.",
      });

      setIsSubmitted(true);
      setIsLoading(false);
      return;
    }

    // STEP 3: Create password reset request
    await addDoc(collection(db, "passwordResetRequests"), {
      employeeId: employee.employeeId ?? "",
      employeeName: employee.fullName ?? employee.name ?? "",
      email: email.trim(),
      status: "Pending",
      requestedAt: serverTimestamp(),
      completedAt: null,
      handledBy: "",
      remarks: "",
    });

    setIsSubmitted(true);

    toast({
      title: "Request Submitted",
      description:
        "Your password reset request has been sent to HR.",
    });

  } catch (error: any) {
      console.error("Password Reset Error:", error);

      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
        setIsLoading(false);
      }
    };

  if (isSubmitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Request Submitted
          <span className="color: #2ecc71; font-size: 28px; font-weight: bold; line-height: 1;">&#10004;</span>
        </h1>
        <p className="text-muted-foreground mb-6">Your password reset request has been sent to the administrator for approval. Please wait for HR to provide you with a temporary password.</p>
        <Button asChild>
          <Link href="/login">Back to Login</Link>
        </Button>
      </div>
    );
  }

  return (
   <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-6">
     <div className="w-full max-w-md relative z-10">
       <div className="bg-[#0f326e] py-5 rounded-t-2xl justify-center mt-20"> 
         <div className="text-center text-white">
          <h1 className="text-2xl font-bold">Forgot Password ?</h1>
          <p className="text-white/60">Enter your email to request a password reset.</p>
         </div>
        </div>
         <Card className="border-none shadow-none overflow-hidden rounded-t-none">
           <CardContent className="pt-6">
             <Tabs defaultValue="login" className="w-full">
              <TabsContent value="login">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="font-bold text-[11px] uppercase opacity-60">Email Address</Label>
                    <Input id="email" type="email" placeholder="e.g., name@callboxinc.com" required value={email}
                      onChange={(e) => setEmail(e.target.value)} disabled={isLoading} />
                  </div>
                  <Button type="submit" className="w-full w-full h-14 font-bold text-lg shadow-none mt-4" disabled={isLoading}>
                    {isLoading ? "Submitting..." : "Request Reset"}
                  </Button>
                </form>
              </TabsContent>
             </Tabs>
           </CardContent>
           <CardFooter className="flex flex-col gap-4 border-t bg-[#0f326e] p-6">
              <Link href="/login" className="text-[14px] font-bold uppercase text-white/60 hover:text-white transition-opacity text-center w-full flex items-center justify-center gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Login
              </Link>
             </CardFooter>
         </Card>
      
     </div>
    </div>
  );
}