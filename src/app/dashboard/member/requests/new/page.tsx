"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Send, ArrowLeft, Loader2, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useFirestore, useUser, useMemoFirebase, useCollection } from "@/firebase"
import { collection, addDoc, serverTimestamp, query, where, limit } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { createNotification } from "@/lib/notifications"
import { generateStaticNarrative } from "../../../certificates/new/narrative-generator"

export default function MemberRequestPage() {
  const [loading, setLoading] = useState(false)
  const db = useFirestore()
  const { user } = useUser()
  const router = useRouter()
  const { toast } = useToast()
  
  const [formData, setFormData] = useState({
    salutation: "Mr.",
    employeeName: "",
    employeeAddress: "",
    position: "",
    department: "",
    certificateType: "",
    startDate: "",
    endDate: "",
    employmentStatus: "Active",
    purposeOfCertificate: "",
    basicRate: "",
    allowance: ""
  })

  const empQuery = useMemoFirebase(() => {
    if (!db || !user?.email) return null;
    return query(collection(db, "employees"), where("email", "==", user.email.toLowerCase()), limit(1));
  }, [db, user?.email]);

  const { data: empData, loading: empLoading } = useCollection(empQuery);
  const employee = empData?.[0];

  useEffect(() => {
    if (employee) {
      setFormData(prev => ({
        ...prev,
        salutation: employee.salutation || "Mr.",
        employeeName: `${employee.firstName} ${employee.lastName}`,
        position: employee.position || "",
        department: employee.department || "",
        startDate: employee.joinDate || "",
        employmentStatus: employee.status || "Active",
        employeeAddress: employee.address || ""
      }))
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.certificateType || !formData.purposeOfCertificate || !formData.employeeName || !formData.position) {
      toast({
        title: "Missing Information",
        description: "Please fill in all mandatory fields before submitting.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    if (db) {
      const narrativeContent = generateStaticNarrative(formData);

      const requestData = {
        ...formData,
        narrative: narrativeContent,
        requestedBy: user?.email?.toLowerCase(),
        status: "Pending",
        createdAt: serverTimestamp()
      }

      addDoc(collection(db, "certificates"), requestData)
      .then(() => {
        toast({
          title: "Request Submitted",
          description: "Your request has been sent to HR for approval.",
        })
        
        createNotification(db, {
          title: "New Certificate Request",
          message: `${formData.employeeName} requested a ${formData.certificateType}.`,
          type: "Info",
          link: "/dashboard/approvals"
        });

        router.push("/dashboard")
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
          path: "certificates",
          operation: "create",
          requestResourceData: requestData
        })
        errorEmitter.emit("permission-error", permissionError)
      })
      .finally(() => setLoading(false))
    }
  }

  if (empLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin opacity-20" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="hover:bg-muted">
          <Link href="/dashboard">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight">
            Request <span className="text-primary">Certificate</span>
          </h2>
          <p className="font-bold opacity-60 uppercase text-[12px] tracking-widest mt-1">Submit a formal request for an official HR document</p>
        </div>
      </div>

      <div className="bg-muted/50 p-6 rounded-2xl border border-primary/20 flex items-start gap-4">
        <Info className="h-6 w-6 text-primary shrink-0 mt-0.5" />
        <div>
          <h3 className="font-bold text-md uppercase">HR Request Guidelines</h3>
          <p className="text-md text-muted-foreground font-medium leading-relaxed">
            Please ensure all details are accurate as they appear in your records. HR will review this request and generate the final document based on the information provided here.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-none border">
          <CardHeader className="bg-muted/30 border-b p-6">
            <CardTitle className="font-headline font-bold text-xl uppercase">Employee Information</CardTitle>
          </CardHeader>
          
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="salutation" className="font-bold">Title</Label>
                <Select value={formData.salutation} onValueChange={(v) => setFormData({...formData, salutation: v})}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Mr." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mr.">Mr.</SelectItem>
                    <SelectItem value="Ms.">Ms.</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label htmlFor="employeeName" className="font-bold">Full Name</Label>
                <Input 
                  id="employeeName" 
                  placeholder="e.g., Daryl Cortes" 
                  className="h-12"
                  value={formData.employeeName}
                  onChange={(e) => setFormData({...formData, employeeName: e.target.value})}/>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeAddress" className="font-bold">Address</Label>
              <Input 
                id="employeeAddress" 
                placeholder="e.g., JP Laurel Ave., Bajada, Davao City" 
                className="h-12"
                value={formData.employeeAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, employeeAddress: e.target.value }))}/>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="position" className="font-bold">Position</Label>
                <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select position" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Sales Development Representative">Sales Development Representative</SelectItem>
                    <SelectItem value="Client Success Manager">Client Success Manager</SelectItem>
                    <SelectItem value="IT Tech Support">IT Tech Support</SelectItem>
                    <SelectItem value="On-the-Job-Training (OJT)">On-the-Job-Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="department" className="font-bold">Department</Label>
                <Select value={formData.department} onValueChange={(v) => setFormData({ ...formData, department: v })}>
                  <SelectTrigger className="h-12"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="North America (NAM)">North America (NAM)</SelectItem>
                    <SelectItem value="Asia Pacific (APAC)">Asia Pacific (APAC)</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="HR">Human Resources (HR)</SelectItem>
                    <SelectItem value="General Services (GenServ)">General Services (GenServ)</SelectItem>
                    <SelectItem value="IT Dept.">IT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="font-bold">Document Type</Label>
              <Select value={formData.certificateType} onValueChange={(v) => setFormData({...formData, certificateType: v})}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Certificate of Employment (Standard COE)">Certificate of Employment (Standard COE)</SelectItem>
                  <SelectItem value="Certificate of Employment (COE with Compensation)">Certificate of Employment (COE with Compensation)</SelectItem>
                  <SelectItem value="Certificate of Completion">Certificate of Completion</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.certificateType.includes("Compensation") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="basicRate" className="font-bold">Basic Rate</Label>
                  <Input 
                    id="basicRate" 
                    type="number" 
                    placeholder="e.g., 20,000" 
                    className="h-12"
                    value={formData.basicRate} 
                    onChange={(e) => setFormData({...formData, basicRate: e.target.value})}/>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowance" className="font-bold">Allowance</Label>
                  <Input 
                    id="allowance" 
                    type="number" 
                    placeholder="e.g., 5,000" 
                    className="h-12"
                    value={formData.allowance} 
                    onChange={(e) => setFormData({...formData, allowance: e.target.value})} 
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="font-bold">Start Date</Label>
                <Input 
                  id="startDate" 
                  type="date" 
                  className="h-12"
                  value={formData.startDate} 
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}/>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate" className="font-bold">End Date</Label>
                <div className="space-y-3">
                  <Input 
                    id="endDate" 
                    type={formData.endDate === "Present" ? "text" : "date"} 
                    disabled={formData.endDate === "Present"} 
                    value={formData.endDate === "Present" ? "Currently Employed" : formData.endDate} 
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="h-12"/>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="present" 
                      checked={formData.endDate === "Present"} 
                      onCheckedChange={(checked) => setFormData({...formData, endDate: checked ? "Present" : ""})}/>
                    <label htmlFor="present" className="text-[10px] font-bold uppercase cursor-pointer select-none">Present (Current Employee)</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="font-bold">Employment Status</Label>
              <Select value={formData.employmentStatus} onValueChange={(v) => setFormData({...formData, employmentStatus: v})}>
                <SelectTrigger className="h-12"><SelectValue placeholder="Select status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                  <SelectItem value="Resigned">Resigned</SelectItem>
                  <SelectItem value="Terminated">Terminated</SelectItem>
                  <SelectItem value="End of Contract">End of Contract</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose" className="font-bold">Purpose of Issuance</Label>
              <Input 
                id="purpose" 
                placeholder="e.g., Bank Loan, Travel Visa" 
                className="h-12"
                value={formData.purposeOfCertificate}
                onChange={(e) => setFormData({...formData, purposeOfCertificate: e.target.value})}
                required/>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/30 p-8 border-t">
            <Button 
              type="submit"
              className="w-full h-14 font-bold text-lg shadow-none bg-[#F5D97F] hover:bg-[#F5D97F]/90 text-black" 
              disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending Request...
                </>
              ) : (
                <><Send className="mr-2 h-5 w-5" />Submit Request</>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}
