"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Zap, Users, Clock, TrendingUp, Loader2, Eye, FileText, Activity, Search, Trash2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import Link from "next/link";
import { useCollection, useFirestore, useUser, useMemoFirebase } from "@/firebase"
import { collection, query, limit, orderBy, where, doc, deleteDoc } from "firebase/firestore"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { jsPDF } from "jspdf";
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const db = useFirestore()
  const { user } = useUser()
  const { toast } = useToast()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  const [logToDelete, setLogToDelete] = useState<any | null>(null)
  const [isAlertOpen, setIsAlertOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    // Rely on session storage role set by DashboardLayout to avoid unauthorized adminUsers queries
    if (user?.email) {
      const cleanEmail = user.email.toLowerCase();
      const cachedRole = sessionStorage.getItem(`fd_role_${cleanEmail}`);
      if (cachedRole) {
        setIsAdmin(cachedRole === 'admin');
        setCheckingRole(false);
      } else {
        // Fallback or wait for Layout to set it
        const checkInterval = setInterval(() => {
          const role = sessionStorage.getItem(`fd_role_${cleanEmail}`);
          if (role) {
            setIsAdmin(role === 'admin');
            setCheckingRole(false);
            clearInterval(checkInterval);
          }
        }, 500);
        return () => clearInterval(checkInterval);
      }
    }
  }, [user]);

  // Admin Data Queries
  const certificatesQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null
    return collection(db, "certificates")
  }, [db, isAdmin])

  const employeesQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null
    return collection(db, "employees")
  }, [db, isAdmin])

  const waitingQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null
    return query(collection(db, "certificates"), where("status", "==", "Pending"))
  }, [db, isAdmin])

  const recentActivitiesQuery = useMemoFirebase(() => {
    if (!db || !isAdmin) return null
    return query(collection(db, "certificates"), orderBy("createdAt", "desc"), limit(5))
  }, [db, isAdmin])

  // Member Data Query (Strictly Personal History)
  const personalHistoryQuery = useMemoFirebase(() => {
    if (!db || isAdmin || checkingRole || !user?.email) return null
    return query(
      collection(db, "certificates"),
      where("requestedBy", "==", user.email.toLowerCase()),
      
    )
  }, [db, isAdmin, checkingRole, user?.email])

  const { data: certificates, loading: loadingCerts } = useCollection(certificatesQuery)
  const { data: employees, loading: loadingEmps } = useCollection(employeesQuery)
  const { data: waiting, loading: loadingWaiting } = useCollection(waitingQuery)
  const { data: recentCerts, loading: loadingRecent } = useCollection(recentActivitiesQuery)
  const { data: personalHistory, loading: loadingHistory } = useCollection(personalHistoryQuery)

  const formatLongDate = (date: any) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-500 text-white"
      case "Rejected": return "bg-destructive text-destructive-foreground"
      case "Pending": return "bg-primary text-primary-foreground"
      default: return "bg-muted text-muted-foreground"
    }
  }

  const handleDownloadPDF = async (cert: any) => {
    if (!cert?.narrative) return
    try {
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 25
      const contentWidth = pageWidth - margin * 2

      const getBase64Image = async (url: string) => {
        const response = await fetch(url)
        const blob = await response.blob()
        return new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }
//variv irfj wwask 
      const headerBase64 = await getBase64Image("/header.jpg")
      const footerBase64 = await getBase64Image("/footer.jpg")
      const signBase64 = await getBase64Image("/sign.png")

      doc.addImage(headerBase64, "JPEG", 0, 0, pageWidth, 35)

      const lines = cert.narrative.split("\n")
      let currentY = 50;

      lines.forEach((line: string) => {
        if (line.trim() === "") {
          currentY += 5
          return;
        }

        const titles = ["CERTIFICATION", "CERTIFICATE OF EMPLOYMENT", "CERTIFICATE OF TERMINATION", "CERTIFICATE OF RECOGNITION", "CERTIFICATE OF COMPLETION", "CLEARANCE CERTIFICATE"]
        const isTitle = titles.some(t => line.trim().toUpperCase().includes(t));
        
        if (isTitle) doc.setFontSize(18);
        else doc.setFontSize(10);

        const splitText = doc.splitTextToSize(line, contentWidth)

        if (currentY + splitText.length * 5 > pageHeight - 45) {
          doc.addPage()
          doc.addImage(headerBase64, "JPEG", 0, 0, pageWidth, 35)
          currentY = 50
        }

        if (isTitle) {
          doc.setFont("times", "bold")
          doc.text(line, pageWidth / 2, currentY, { align: "center" })
          currentY += 14
        } else {
          doc.setFont("times", "normal")
          const textLines = doc.splitTextToSize(line, contentWidth);
          textLines.forEach((l: string) => {
            doc.text(l, margin, currentY);
            currentY += 5;
          });
        }
      })

      doc.addImage(signBase64, "PNG", margin, currentY + 10, 50, 15);
      doc.addImage(footerBase64, "JPEG", 0, pageHeight - 30, pageWidth, 23);

      doc.save(`${cert.employeeName}_document.pdf`)
      toast({ title: "PDF Exported" })
    } catch (error) {
      toast({ title: "Export Failed", variant: "destructive" })
    }
  }

  const handleDeleteClick = (log: any) => {
    setLogToDelete(log)
    setIsAlertOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!logToDelete || !db) return

    setIsDeleting(true)
    try {
      await deleteDoc(doc(db, "certificates", logToDelete.id))
      toast({
        title: "Document Deleted",
        description: `The document request for ${logToDelete.certificateType} has been deleted.`,
      })
      setIsAlertOpen(false)
      setLogToDelete(null)
    } catch (error) {
      console.error("Error deleting document: ", error)
      toast({ title: "Failed to delete the document.", variant: "destructive" })
    } finally {
      setIsDeleting(false)
    }
  }

  if (checkingRole) {
    return (
      <div className="h-[400px] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        <p className="font-bold uppercase text-[10px] tracking-widest opacity-40">Loading Workspace...</p>
      </div>
    )
  }

  // 👤 MEMBER VIEW: Personalized Request History
  if (!isAdmin) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-headline font-bold tracking-tight">
              My <span className="text-primary">Documents</span>
            </h2>
            <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Access your official HR documents and certificates</p>
          </div>
          <Button asChild size="lg" className="h-12 px-8 font-bold shadow-none rounded-full bg-[#F5D97F] hover:bg-[#F5D97F]/90 text-black">
            <Link href="/dashboard/member/requests/new">
              <Zap className="mr-2 h-4 w-4 fill-current" />
              Request New
            </Link>
          </Button>
        </div>

        <Card className="shadow-none border overflow-hidden">
          <CardHeader className="border-b bg-muted/20 pb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search your records..." 
                className="pl-10 h-10 shadow-none bg-background" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-bold uppercase text-xs">Document Type</TableHead>
                  <TableHead className="font-bold uppercase text-xs">Generated Date</TableHead>
                  <TableHead className="font-bold uppercase text-xs">Status</TableHead>
                  <TableHead className="text-right font-bold uppercase text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                    </TableCell>
                  </TableRow>
                ) : personalHistory && personalHistory.length > 0 ? (
                  personalHistory.filter(c => c.certificateType?.toLowerCase().includes(searchTerm.toLowerCase())).map((cert) => (
                    <TableRow key={cert.id} className="hover:bg-muted/30">
                      <TableCell className="font-bold">{cert.certificateType}</TableCell>
                      <TableCell className="text-muted-foreground font-medium">{formatLongDate(cert.createdAt)}</TableCell>
                      <TableCell>
                        <Badge className={`font-bold shadow-none ${getStatusColor(cert.status)}`}>
                          {cert.status || "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-primary/10"
                            onClick={() => setSelectedActivity(cert)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleDeleteClick(cert)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-20 opacity-40 italic">
                      No document history found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!selectedActivity} onOpenChange={() => setSelectedActivity(null)}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0 border shadow-none sm:rounded-lg">
            <DialogHeader className="p-6 border-b bg-muted/30">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-primary" />
                  <div>
                    <DialogTitle className="font-headline font-bold text-2xl uppercase">Document Preview</DialogTitle>
                    <DialogDescription className="font-bold opacity-60 uppercase text-[10px] tracking-widest">
                      Reviewing your {selectedActivity?.certificateType}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>
            <div className="overflow-auto">
              <div className="relative">
                {/* RESTRICTED CONTENT UI */}
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-12 text-center">
                  <ShieldCheck className="h-16 w-16 text-primary mb-4" />
                  <h3 className="text-3xl font-bold uppercase font-headline">
                    Document Content Restricted
                    <br /><br />
                  </h3>
                  <p className="text-lg font-medium opacity-60 mt-2 max-w-sm">
                    The narrative content for your {selectedActivity?.certificateType} is secured.
                    {selectedActivity?.status === "Approved" 
                      ? " Please download the PDF version to view the final official document." 
                      : " Content is viewable only by authorized HR personnel until fully approved."
                    }
                    <br /><br />
                    Once your request has been reviewed and approved, the completed Certificate will be sent to your email address.
                    If you do not receive the email after your request has been marked as approved, kindly contact the HR Department for further assistance.
                    <br /><br />
                    Thank you.
                    <br />
                    <strong>Human Resources Department</strong>
                  </p>
                </div>
                <img src="/header.jpg" alt="Header" className="w-full" />
                <div className="flex-1 whitespace-pre-wrap font-['Times_New_Roman',_serif] text-base leading-relaxed opacity-5">
                  {selectedActivity?.narrative || "Content secured."}
                </div>
                <img src="/footer.jpg" alt="Footer" className="w-full" />
              </div>
            </div>
            <div className="p-4 border-t bg-muted/10 flex justify-end">
              <Button onClick={() => setSelectedActivity(null)} className="font-bold px-8 shadow-none">Close Preview</Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your request for the <span className="font-bold">{logToDelete?.certificateType}</span> document.
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

  // 🛡️ ADMIN VIEW
  const stats = [
    { title: "Drafts Ready", value: certificates?.length ?? 0, loading: loadingCerts, icon: Zap, href: "/dashboard/certificates" },
    { title: "Team Size", value: employees?.length ?? 0, loading: loadingEmps, icon: Users, href: "/dashboard/employees" },
    { title: "Waiting", value: waiting?.length ?? 0, loading: loadingWaiting, icon: Clock, href: "/dashboard/approvals" },
    { title: "Efficiency", value: "100%", loading: false, icon: TrendingUp, href: "/dashboard/logs" }
  ]

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-headline font-bold text-foreground tracking-tight">
            Performance <span className="text-primary">Hub</span>
          </h2>
          <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Real-time HR Operations Overview</p>
        </div>
        <Button asChild className="h-12 font-bold px-6 bg-primary text-primary-foreground transition-all shadow-none">
          <Link href="/dashboard/certificates/new">
            <Zap className="mr-2 h-4 w-4 fill-current" />
            Quick Draft
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Link key={i} href={stat.href} className="group">
            <Card className="hover:bg-primary transition-all duration-300 cursor-pointer h-full border-border hover:border-primary shadow-none">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 group-hover:text-primary-foreground">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-primary group-hover:text-white transition-colors" />
              </CardHeader>
              <CardContent>
                {stat.loading ? (
                  <div className="h-9 w-12 bg-foreground/10 animate-pulse rounded" />
                ) : (
                  <div className="text-4xl font-bold font-headline group-hover:text-primary-foreground transition-colors">{stat.value}</div>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="shadow-none border overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-6 flex flex-row items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle className="font-headline font-bold text-2xl uppercase">Activity Stream</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {loadingRecent ? (
              <div className="flex justify-center py-10"><Loader2 className="animate-spin text-primary" /></div>
            ) : recentCerts && recentCerts.length > 0 ? (
              recentCerts.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-all">
                  <div>
                    <p className="text-sm font-bold uppercase">{activity.certificateType}</p>
                    <p className="text-[10px] font-bold opacity-60 uppercase">{activity.employeeName} • {activity.status || "Pending"}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-10 opacity-40 italic">No recent activity.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
