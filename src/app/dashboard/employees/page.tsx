"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, UserPlus, MoreHorizontal, Loader2, Copy, Edit, Trash2, Users, FileUp } from "lucide-react"
import Link from "next/link"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, doc, deleteDoc, writeBatch, serverTimestamp } from "firebase/firestore"
import { useState, useRef } from "react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

export default function EmployeesPage() {
  const router = useRouter()
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const employeesQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "employees"), orderBy("lastName", "asc"))
  }, [db])

  const { data: employees, loading } = useCollection(employeesQuery)
  const filteredEmployees = employees?.filter(emp => 
    `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.position?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return dateStr;
    }
  }
  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email)
    toast({
      title: "Email Copied",
      description: "Work email copied to clipboard.",
    })
  }
  const handleDelete = (id: string, name: string) => {
    if (!db) return
    const permissionError = new FirestorePermissionError({
      path: "employees",
      operation: "delete",
      requestResourceData: {},
    });
    errorEmitter.emit("permission-error", permissionError)
    deleteDoc(doc(db, "employees", id))
    toast({
      title: "Record Deleted",
      description: `Employee ${name} has been removed from the hub.`,
    })
  }
  const handleImportClick = () => {
    fileInputRef.current?.click()
  }
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !db) return

    setIsImporting(true)
    const reader = new FileReader()

    reader.onload = async (event) => {
      try {
        const csvText = event.target?.result as string
        const lines = csvText.split(/\r?\n/)
        if (lines.length < 2) throw new Error("File is empty or missing data.")

        const headers = lines[0].split(',').map(h => h.trim())
        const rows = lines.slice(1).filter(line => line.trim() !== "")

        const batch = writeBatch(db)
        let successCount = 0

        rows.forEach((row) => {
          const values = row.split(',').map(v => v.trim())
          const employee: any = {}
          
          headers.forEach((header, index) => {
            if (values[index] !== undefined) {
              employee[header] = values[index]
            }
          })

          if (employee.firstName && employee.lastName && employee.email) {
            const docRef = doc(collection(db, "employees"))
            batch.set(docRef, {
              ...employee,
              createdAt: serverTimestamp()
            })
            successCount++
          }
        })

        await batch.commit()

        toast({
          title: "Import Successful",
          description: `Successfully imported ${successCount} employee records.`,
        })
      } catch (error: any) {
        toast({
          variant: "destructive",
          title: "Import Failed",
          description: error.message || "An error occurred while parsing the CSV file.",
        })
      } finally {
        setIsImporting(false)
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
    }

    reader.readAsText(file)
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-headline font-bold tracking-tight">
            Employee Insight <span className="text-primary">Hub</span>
          </h2>
          <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Manage your centralized employee database</p>
        </div>
        <div className="flex gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".csv" 
            className="hidden" 
          />
          <Button 
            variant="outline" 
            className="h-12 font-bold px-6 shadow-none"
            onClick={handleImportClick}
            disabled={isImporting}
          >
            {isImporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-2 h-4 w-4" />
            )}
            Import CSV
          </Button>
          <Button asChild className="h-12 font-bold px-6 bg-primary text-primary-foreground transition-all shadow-none">
            <Link href="/dashboard/employees/new">
              <UserPlus className="mr-2 h-4 w-4" />
              Add New Employee
            </Link>
          </Button>
        </div>
      </div>

      <Card className="shadow-none border overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div className="relative flex-1 max-w-md ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search employee name..." 
                className="pl-10 h-10 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-bold uppercase text-[15px] tracking-wider">Full Name</TableHead>
                <TableHead className="font-bold uppercase text-[15px] tracking-wider">Email</TableHead>
                <TableHead className="font-bold uppercase text-[15px] tracking-wider">Position</TableHead>
                <TableHead className="font-bold uppercase text-[15px] tracking-wider">Department</TableHead>
                <TableHead className="font-bold uppercase text-[15px] tracking-wider">Status</TableHead>
                <TableHead className="font-bold uppercase text-[15px] tracking-wider">Join Date</TableHead>
                <TableHead className="font-bold uppercase text-[15px] tracking-wider text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                    <p className="mt-4 font-bold opacity-30 uppercase text-[10px] tracking-widest">Syncing team records...</p>
                  </TableCell>
                </TableRow>
              ) : filteredEmployees && filteredEmployees.length > 0 ? (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-muted/30">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">{emp.lastName}, {emp.firstName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{emp.email}</TableCell>
                    <TableCell className="font-medium">{emp.position}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-bold text-[12px] uppercase">
                        {emp.department}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn("font-bold", {
                          "bg-green-500 text-white": emp.status === "Active",
                          "bg-yellow-500 text-white": emp.status === "On Leave",
                          "bg-blue-500 text-white": emp.status === "Probationary",
                          "bg-red-500 text-white": emp.status === "Resigned",
                          "bg-gray-500 text-white": emp.status === "End of Contract",
                          "bg-gray-400 text-white": emp.status === "Inactive",
                        })}
                      >
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium">
                      {formatLongDate(emp.joinDate)}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => router.push(`/dashboard/employees/edit?id=${emp.id}`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Profile
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleCopyEmail(emp.email)} className="font-bold cursor-pointer">
                            <Copy className="mr-2 h-4 w-4" /> Copy Email
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDelete(emp.id, `${emp.firstName} ${emp.lastName}`)} className="font-bold cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 opacity-40 italic">
                    {searchTerm ? "No employees match your search criteria." : "No employees found in the database."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
