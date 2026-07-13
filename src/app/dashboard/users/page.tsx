"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { UserPlus, ShieldCheck, Trash2, Loader2, Search, Mail, MoreHorizontal } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogDescription} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy, addDoc, serverTimestamp, doc, deleteDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

export default function UserManagementPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [isAdding, setIsAdding] = useState(false)
  const [open, setOpen] = useState(false)
  const [newAdmin, setNewAdmin] = useState({
    displayName: "",
    email: "",
    role: "Admin"
  })

  useEffect(() => {
    if (open) {
      setNewAdmin({ displayName: "", email: "", role: "Admin" })
      setIsAdding(false)
    }
  }, [open])

  const adminsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "adminUsers"), orderBy("createdAt", "desc"))
  }, [db])

  const { data: admins, loading } = useCollection(adminsQuery)

  const filteredAdmins = admins?.filter(admin => 
    admin.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddAdmin = async () => {
    if (!db || !newAdmin.email || !newAdmin.displayName) return

    const cleanEmail = newAdmin.email.trim().toLowerCase();

    setIsAdding(true)
    try {
      await addDoc(collection(db, "adminUsers"), {
        ...newAdmin,
        email: cleanEmail,
        createdAt: serverTimestamp()
      })
      toast({
        title: "Admin Authorized",
        description: `${newAdmin.displayName} has been whitelisted.`,
      })
      setOpen(false)
    } catch (err: any) {
      const permissionError = new FirestorePermissionError({
        path: "employees",
        operation: "delete",
        requestResourceData: {},
      });
      errorEmitter.emit("permission-error", permissionError)
    } finally {
      setIsAdding(false)
    }
  }

  const handleDeleteAdmin = (id: string, name: string) => {
    if (!db) return
    const docRef = doc(db, "adminUsers", id)
    deleteDoc(docRef)
      .then(() => {
        toast({
          title: "Admin Removed",
          description: `${name} has been removed from administration.`,
        })
      })
      .catch(async (err) => {
        const permissionError = new FirestorePermissionError({
        path: "employees",
        operation: "delete",
        requestResourceData: {},
      });
        errorEmitter.emit("permission-error", permissionError)
      })
  }

  const formatDate = (date: any) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-headline font-bold tracking-tight">
            User <span className="text-primary">Management</span>
          </h2>
          <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Manage platform administrators and access roles</p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="h-12 font-bold px-6 bg-primary text-primary-foreground transition-all shadow-none">
              <UserPlus className="mr-2 h-4 w-4" />
              Add Admin User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="font-headline font-bold uppercase">New Admin User</DialogTitle>
              <DialogDescription className="text-xs font-bold opacity-60 uppercase tracking-widest">Provide administrative access to the platform</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name" className="font-bold text-xs uppercase">Full Name</Label>
                <Input 
                  id="name" 
                  value={newAdmin.displayName}
                  onChange={(e) => setNewAdmin({...newAdmin, displayName: e.target.value})}
                  placeholder="e.g., Daryl Cortes" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email" className="font-bold text-xs uppercase">Work Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({...newAdmin, email: e.target.value})}
                  placeholder="admin@callboxinc.com" 
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role" className="font-bold text-xs uppercase">Access Role</Label>
                <Select 
                  value={newAdmin.role}
                  onValueChange={(v) => setNewAdmin({...newAdmin, role: v})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Super Admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button 
                onClick={handleAddAdmin} 
                disabled={isAdding || !newAdmin.email || !newAdmin.displayName}
                className="w-full font-bold h-12"
              >
                {isAdding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                Authorize Admin
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="shadow-none border overflow-hidden">
        <CardHeader className="border-b bg-muted/30 pb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search administrators..." 
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
                <TableHead className="font-bold uppercase text-[10px] tracking-wider">Admin Name</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-wider">Email Address</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-wider">Access Role</TableHead>
                <TableHead className="font-bold uppercase text-[10px] tracking-wider">Created</TableHead>
                <TableHead className="text-right font-bold uppercase text-[10px] tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                    <p className="mt-4 font-bold opacity-30 uppercase text-[10px] tracking-widest">Loading permissions...</p>
                  </TableCell>
                </TableRow>
              ) : filteredAdmins && filteredAdmins.length > 0 ? (
                filteredAdmins.map((admin) => (
                  <TableRow key={admin.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold">{admin.displayName}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium text-sm">{admin.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`font-bold ${
                          admin.role === 'Super Admin' ? 'border-primary text-primary' : ''
                        }`}
                      >
                        {admin.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-medium text-xs">
                      {formatDate(admin.createdAt)}
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
                            onClick={() => handleDeleteAdmin(admin.id, admin.displayName)}
                            className="font-bold cursor-pointer text-destructive focus:bg-destructive focus:text-destructive-foreground"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Revoke Access
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 opacity-40 italic">
                    {searchTerm ? "No administrators match your search." : "No administrator records found."}
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
