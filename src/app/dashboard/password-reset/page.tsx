"use client";

import { collection, query, doc, updateDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { useState } from "react";

export default function PasswordResetPage() {
  const db = useFirestore();
  const { user } = useUser();
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);  

console.log("Current logged in user:", user);
console.log("Admin email:", user?.email);
console.log("Admin UID:", user?.uid);

  const generateTemporaryPassword = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let password = "";
    for (let i = 0; i < 10; i++) {
        password += chars[ Math.floor(Math.random() * chars.length) ];
        }
      return password;
  };
  const handleApprove = async (
  requestId: string ) => {

  try {
    const temporaryPassword = generateTemporaryPassword();
    await updateDoc(
      doc(db, "passwordResetRequests", requestId),
      {
        status: "Approved",
        temporaryPassword,
        handledBy: "HR Admin",
        completedAt: serverTimestamp(),
        remarks: "Password reset request approved.",
      }
    );
    toast.success("Request approved. Temporary password generated.");
    } catch (error) {
        console.error(error);
        toast.error("Failed to approve request");
      }
  };

  const handleReject = async (requestId: string) => {
  try {
    await updateDoc(
      doc(db, "passwordResetRequests", requestId),
      {
        status: "Rejected",
        handledBy: "HR Admin",
        completedAt: serverTimestamp(),
        remarks: "Password reset request rejected.",
      }
    );
    toast.success("Password reset request rejected");
    } catch(error){
        console.error(error);
        toast.error("Failed to reject request");
      }
  };
    const handleDeleteClick = async (requestId: string) => {
      try {
        await deleteDoc(doc(db, "passwordResetRequests", requestId));
        toast.success("Request deleted.");
      } catch (error) {
        console.error(error);
        toast.error("Failed to delete request.");
      }
    };

  const requestsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "passwordResetRequests"),
      );
      }, [db]);

  const { data: requests } = useCollection(requestsQuery);
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Password Reset Requests</h1>
        <p className="text-muted-foreground">Review employee password reset requests.</p>
      </div>
      {!requests || requests.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center">
            No pending password reset requests.
          </CardContent>
        </Card>
        ) : (
        requests.map((request: any) => (
        <Card key={request.id}>
          <CardContent className="p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold">
              {request.employeeName}
              </h2>
                <p className="text-sm text-muted-foreground">
                Email: {request.email}
                </p>
                <p className="text-sm">
                Status: {request.status}
                </p>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => handleApprove(request.id) }>
                Approve Reset Request
              </Button>
              <Button variant="destructive" onClick={() => handleReject(request.id) }>
                Reject
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeleteClick(request.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        ))
        )}
    </div>
  );
}