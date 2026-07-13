"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Zap, Activity, Clock, User, Loader2, Trash2 } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, limit, doc, deleteDoc } from "firebase/firestore"
import { toast } from "sonner"

export default function LogsPage() {
  const db = useFirestore()
  const certificatesQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "certificates"), orderBy("createdAt", "desc"), limit(50))
  }, [db])

  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null
    return collection(db, "employees")
  }, [db])

  const { data: certificates, loading: loadingCerts } = useCollection(certificatesQuery)
  const { data: employees, loading: loadingEmps } = useCollection(employeesQuery)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const stats = [
    { 
      id: "events", 
      title: "Total Events", 
      value: loadingCerts ? "..." : (certificates?.length || 0), 
      icon: Activity 
    },
    { 
      id: "users", 
      title: "Active Employees", 
      value: loadingEmps ? "..." : (employees?.length || 0), 
      icon: User 
    },
    { 
      id: "uptime", 
      title: "System Health", 
      value: "99.9%", 
      icon: Clock 
    },
  ]

  const formatLongDateTime = (date: any) => {
    if (!date) return "Just now";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
  }

  const handleDeleteClick = (log: any) => {
    setSelectedLog(log)
    setIsAlertOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedLog || !db) return

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "certificates", selectedLog.id))
      toast.success(`Draft for ${selectedLog.employeeName} has been deleted.`)
      setIsAlertOpen(false)
      setSelectedLog(null)
    } catch (error) {
      console.error("Error deleting document: ", error)
      toast.error("Failed to delete the draft. Please try again.")
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-headline font-bold tracking-tight">
          System <span className="text-primary">Activity</span>
        </h2>
        <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Audit trail and system logs</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Card key={stat.id} className="shadow-sm border group hover:bg-primary transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 group-hover:text-primary-foreground transition-colors">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-primary group-hover:text-white transition-colors duration-300" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold group-hover:text-primary-foreground transition-colors">
                {stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border overflow-hidden">
        <CardHeader className="border-b bg-muted/50">
          <CardTitle className="font-headline font-bold text-2xl uppercase">Activity Log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow className="hover:bg-transparent border-b">
                <TableHead className="font-bold">Action</TableHead>
                <TableHead className="font-bold">Target Employee</TableHead>
                <TableHead className="font-bold">Date</TableHead>
                <TableHead className="font-bold">Status</TableHead>
                <TableHead className="font-bold">Document Type</TableHead>
                <TableHead className="font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCerts ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                    <p className="mt-2 font-bold opacity-20 uppercase text-xs">Streaming logs...</p>
                  </TableCell>
                </TableRow>
              ) : (
                certificates?.map((log) => (
                  <TableRow key={log.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold">
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 fill-primary text-primary" />
                        Draft Generated
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{log.employeeName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatLongDateTime(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-bold border-green-500 text-green-600 bg-green-50">
                        Success
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm italic font-medium">{log.certificateType}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeleteClick(log)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
              {!loadingCerts && certificates?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 opacity-40 italic">
                    No activity recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the draft certificate for <span className="font-bold">{selectedLog?.employeeName}</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                "Yes, delete it"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}