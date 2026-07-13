"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { doc, getDoc, updateDoc } from "firebase/firestore"
import { useFirestore } from "@/firebase"
import { ArrowLeft, UserPen, Loader2} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function EditEmployeePage() {
  const db = useFirestore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get("id")
  const [loading, setLoading] = useState(true)
  const [employee, setEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    position: "",
    department: "",
    status: "",
    joinDate: "",
  })

  useEffect(() => {
    const loadEmployee = async () => {
      if (!db || !id) return

      try {
        const snap = await getDoc(doc(db, "employees", id))

        if (snap.exists()) {
          setEmployee(snap.data() as any)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    loadEmployee()
  }, [db, id])

  const handleSave = async () => {
    if (!db || !id) return

    try {
      await updateDoc(doc(db, "employees", id), employee)

      alert("Employee updated!")

      router.push("/dashboard/employees")
    } catch (err) {
      console.error(err)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="hover:bg-muted">
          <Link href="/dashboard/employees">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-3xl font-headline font-bold tracking-tight">
            Edit <span className="text-primary">Employee</span>
          </h2>
          <p className="font-bold opacity-60 uppercase text-[10px] tracking-widest mt-1">Update team member details</p>
        </div>
      </div>
      <Card>
        <CardHeader className="bg-muted/30 border-b p-6">
            <CardTitle className="font-headline font-bold text-xl uppercase">Profile Details</CardTitle>
          </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lastName" className="font-bold">Last Name*</Label>
              <Input
                id="lastName"
                placeholder="Last name"
                value={employee.lastName}
                onChange={(e) => setEmployee({ ...employee, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="firstName" className="font-bold">First Name*</Label>
              <Input
                id="firstName"
                placeholder="First name"
                value={employee.firstName}
                onChange={(e) => setEmployee({ ...employee, firstName: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="font-bold">Email*</Label>
            <Input
              id="email"
              placeholder="Email"
              value={employee.email}
              onChange={(e) => setEmployee({ ...employee, email: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="position" className="font-bold">Position*</Label>
                <Select
                  value={employee.position || ""}
                  onValueChange={(value) =>
                    setEmployee({
                      ...employee,
                      position: value,
                    })
                  }
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select position" />
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
                <Label htmlFor="dept" className="font-bold">Department*</Label>
                <Select
                  value={employee.department || ""}
                  onValueChange={(value) =>
                    setEmployee({
                      ...employee,
                      department: value,
                    })
                  }
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
                  value={employee.joinDate || ""}
                  onChange={(e) =>
                    setEmployee({
                      ...employee,
                      joinDate: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status" className="font-bold">Employment Status*</Label>
                <Select
                  value={employee.status || ""}
                  onValueChange={(value) =>
                    setEmployee({
                      ...employee,
                      status: value,
                    })
                  }
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
          </div>
          <Button onClick={handleSave} className="w-full h-14 font-bold text-lg shadow-none">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <UserPen className="mr-2 h-5 w-5" />
                  Save Employee Changes
                </>
              )}
            </Button>
        </CardContent>
      </Card>
    </div>
  )
}