"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, ArrowLeft, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"
import { useFirestore } from "@/firebase"
import { collection, addDoc, serverTimestamp } from "firebase/firestore"
import { createNotification } from "@/lib/notifications"

export default function NewEmployeePage() {
  const [loading, setLoading] = useState(false)
  const db = useFirestore()
  const router = useRouter()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    position: "",
    department: "",
    status: "Active",
    joinDate: "",
    email: ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.position) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields marked with *.",
        variant: "destructive"
      })
      return
    }
    setLoading(true)
    if (db) {
      addDoc(collection(db, "employees"), {
        ...formData,
        createdAt: serverTimestamp()
      })
      .then(() => {
        toast({
          title: "Employee Registered",
          description: `${formData.firstName} ${formData.lastName} has been added to the hub.`,
        })

        // Trigger Notification
        createNotification(db, {
          title: "New Employee Registered",
          message: `${formData.firstName} ${formData.lastName} was added to ${formData.department} department.`,
          type: "Success",
          link: "/dashboard/employees"
        });
        router.push("/dashboard/employees")
      })
      .catch((err) => {
        console.error("Firestore Error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
    }
    }
  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="hover:bg-muted">
          <Link href="/dashboard/employees">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight">
            Add New <span className="text-primary">Employee</span>
          </h2>
          <p className="font-bold opacity-60 uppercase text-[10px] tracking-widest mt-1">Register a new team member to the hub</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="shadow-none border">
          <CardHeader className="bg-muted/30 border-b p-6">
            <CardTitle className="font-headline font-bold text-xl uppercase">Profile Details</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="lastName" className="font-bold">Last Name*</Label>
                <Input 
                  id="lastName" 
                  placeholder="e.g., Cortes" 
                  className="h-12"
                  value={formData.lastName}
                  onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName" className="font-bold">First Name*</Label>
                <Input 
                  id="firstName" 
                  placeholder="e.g., Daryl" 
                  className="h-12"
                  value={formData.firstName}
                  onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="font-bold">Email*</Label>
              <Input 
                id="email" 
                type="email"
                placeholder="daryl@callboxinc.com" 
                className="h-12"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="position" className="font-bold">Position*</Label>
                <Select 
                  value={formData.position}
                  onValueChange={(v) => setFormData({...formData, position: v})}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select position"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SDR">Sales Development Representative</SelectItem>
                    <SelectItem value="CSM">Client Success Manager</SelectItem>
                    <SelectItem value="IT">IT Tech Support</SelectItem>
                    <SelectItem value="On-the-Job-Training (OJT)">On-The-Job-Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="deparment" className="font-bold">Department*</Label>
                <Select 
                  value={formData.department}
                  onValueChange={(v) => setFormData({...formData, department: v})}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NAM">North America</SelectItem>
                    <SelectItem value="APAC">Asia Pacific</SelectItem>
                    <SelectItem value="Finance">Finance</SelectItem>
                    <SelectItem value="HR">Human Resources</SelectItem>
                    <SelectItem value="GenServ">General Services</SelectItem>
                    <SelectItem value="IT">IT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="joinDate" className="font-bold">Join Date*</Label>
                <Input 
                  id="joinDate" 
                  type="date"
                  className="h-12"
                  value={formData.joinDate}
                  onChange={(e) => setFormData({...formData, joinDate: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="employment status" className="font-bold">Employment Status*</Label>
                <Select 
                  value={formData.status}
                  onValueChange={(v) => setFormData({...formData, status: v})}
                >
                  
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select employment status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Probationary">Probationary</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                    <SelectItem value="End of Contract">End of Contract</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
          </CardContent>
          <CardFooter className="bg-muted/30 p-8 border-t">
            <Button 
              type="submit"
              className="w-full h-14 font-bold text-lg shadow-none" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving Record...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-5 w-5" />
                  Save Employee Record
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </div>
  )
}