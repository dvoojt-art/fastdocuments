"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Save, Bell, Shield, UserCog, Loader2, Building2, CheckCircle2, Image as ImageIcon } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useUser, useAuth, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { updateProfile, updateEmail } from "firebase/auth"
import { doc, setDoc, serverTimestamp } from "firebase/firestore"
import { cn } from "@/lib/utils"

type Tab = 'organization' | 'assets' | 'account' | 'notifications' | 'security'

export default function SettingsPage() {
  const { toast } = useToast()
  const auth = useAuth()
  const { user } = useUser()
  const db = useFirestore()
  const [isAdmin, setIsAdmin] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('account')
  const [saving, setSaving] = useState(false)
  const [checkingRole, setCheckingRole] = useState(true)

  // Detect Admin Status
  useEffect(() => {
    if (user?.email) {
      const cleanEmail = user.email.toLowerCase()
      const cachedRole = sessionStorage.getItem(`fd_role_${cleanEmail}`)
      if (cachedRole) {
        const isAdm = cachedRole === 'admin'
        setIsAdmin(isAdm)
        setActiveTab(isAdm ? 'organization' : 'account')
        setCheckingRole(false)
      } else {
        const checkInterval = setInterval(() => {
          const role = sessionStorage.getItem(`fd_role_${cleanEmail}`)
          if (role) {
            const isAdm = role === 'admin'
            setIsAdmin(isAdm)
            setActiveTab(isAdm ? 'organization' : 'account')
            setCheckingRole(false)
            clearInterval(checkInterval)
          }
        }, 500)
        return () => clearInterval(checkInterval)
      }
    }
  }, [user])

  // System Settings Fetching (Admin Only)
  const settingsRef = useMemoFirebase(() => {
    if (!db || !isAdmin) return null
    return doc(db, "settings", "global")
  }, [db, isAdmin])
  const { data: systemSettings, loading: loadingSettings } = useDoc(settingsRef)

  const [orgData, setOrgData] = useState({
    companyName: "",
    address: "",
    hrLead: "",
    supportEmail: "",
    headerImageUrl: "/header.jpg",
    footerImageUrl: "/footer.jpg",
    signatureImageUrl: "/sign.png",
    autoSaveDrafts: true,
    emailNotifications: false,
    auditTrail: true
  })

  const [accountData, setAccountData] = useState({
    displayName: "",
    email: ""
  })

  // Sync data
  useEffect(() => {
    if (user) {
      setAccountData({
        displayName: user.displayName || "",
        email: user.email || ""
      })
    }
  }, [user])

  useEffect(() => {
    if (systemSettings) {
      setOrgData({
        companyName: systemSettings.companyName || "",
        address: systemSettings.address || "",
        hrLead: systemSettings.hrLead || "",
        supportEmail: systemSettings.supportEmail || "",
        headerImageUrl: systemSettings.headerImageUrl || "/header.jpg",
        footerImageUrl: systemSettings.footerImageUrl || "/footer.jpg",
        signatureImageUrl: systemSettings.signatureImageUrl || "/sign.png",
        autoSaveDrafts: systemSettings.autoSaveDrafts ?? true,
        emailNotifications: systemSettings.emailNotifications ?? false,
        auditTrail: systemSettings.auditTrail ?? true
      })
    }
  }, [systemSettings])

  const handleAccountSave = async () => {
    if (!auth.currentUser) return
    setSaving(true)
    try {
      if (accountData.displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName: accountData.displayName })
      }
      if (accountData.email !== auth.currentUser.email) {
        await updateEmail(auth.currentUser, accountData.email)
      }
      toast({ title: "Profile Updated", description: "Your account details have been updated." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Update Failed", description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!db || !settingsRef) return
    setSaving(true)
    try {
      await setDoc(settingsRef, {
        ...orgData,
        updatedAt: serverTimestamp()
      }, { merge: true })
      toast({ title: "Settings Saved", description: "Global configuration has been updated." })
    } catch (error: any) {
      toast({ variant: "destructive", title: "Save Failed", description: error.message })
    } finally {
      setSaving(false)
    }
  }

  const NavButton = ({ tab, icon: Icon, label }: { tab: Tab, icon: any, label: string }) => {
    const isActive = activeTab === tab
    return (
      <Button variant="ghost" onClick={() => setActiveTab(tab)} className={cn( "justify-start font-bold transition-all duration-300 group h-12 w-full shadow-none", isActive ? "bg-[#F5D97F] text-black hover:bg-[#F5D97F]" : "hover:bg-muted" )}>
        <Icon className={cn("mr-2 h-4 w-4", isActive ? 'text-black' : 'opacity-60')} />
        {label}
      </Button>
    )
  }

  if (checkingRole || (isAdmin && loadingSettings)) {
    return (
      <div className="h-[400px] w-full flex flex-col items-center justify-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
        <p className="font-bold uppercase text-[10px] tracking-widest opacity-40">Syncing Settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-headline font-bold tracking-tight">
            System <span className="text-primary">Settings</span>
          </h2>
          <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Configure FastDocs for your organization</p>
        </div>      
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-3 space-y-4">
          <nav className="flex flex-col gap-2">
            {isAdmin && <NavButton tab="organization" icon={Building2} label="Organization" />}
            {isAdmin && <NavButton tab="assets" icon={ImageIcon} label="Asset Management" />}
            <NavButton tab="account" icon={UserCog} label="Account" />
            <NavButton tab="notifications" icon={Bell} label="Notifications" />
            <NavButton tab="security" icon={Shield} label="Security" />
          </nav>
        </div>

        <div className="md:col-span-9 space-y-8">
          {activeTab === 'organization' && isAdmin ? (
            <div className="space-y-8">
              <Card className="shadow-none border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-6">
                  <CardTitle className="font-headline font-bold text-sm uppercase tracking-widest">Company Information</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-bold text-[10px] uppercase opacity-60">Organization Name</Label>
                      <Input value={orgData.companyName} onChange={(e) => setOrgData({...orgData, companyName: e.target.value})} placeholder="Callbox Inc. Davao" className="h-12"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-[10px] uppercase opacity-60">Office Address</Label>
                      <Input value={orgData.address} onChange={(e) => setOrgData({...orgData, address: e.target.value})} placeholder="9th Floor, Landco Bldg. JP Laurel Ave., Bajada, Davao City" className="h-12" />
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-[10px] uppercase opacity-60">HR Lead Name</Label>
                      <Input value={orgData.hrLead} onChange={(e) => setOrgData({...orgData, hrLead: e.target.value})} placeholder="Orwill Jane Linaza" className="h-12"/>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-bold text-[10px] uppercase opacity-60">Support Email</Label>
                      <Input value={orgData.supportEmail} onChange={(e) => setOrgData({...orgData, supportEmail: e.target.value})} placeholder="admin@callboxinc.com" className="h-12" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-6">
                  <CardTitle className="font-headline font-bold text-sm uppercase tracking-widest">Preferences</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Auto-Save Drafts</p>
                      <p className="text-xs opacity-60">Automatically save generated narratives to your vault.</p>
                    </div>
                    <Switch checked={orgData.autoSaveDrafts} onCheckedChange={(v) => setOrgData({...orgData, autoSaveDrafts: v})} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Email Notifications</p>
                      <p className="text-xs opacity-60">Send an email alert whenever a document is generated.</p>
                    </div>
                    <Switch checked={orgData.emailNotifications} onCheckedChange={(v) => setOrgData({...orgData, emailNotifications: v})}/>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-bold text-sm">Audit Trail</p>
                      <p className="text-xs opacity-60">Keep a detailed record of all document activities for compliance.</p>
                    </div>
                    <Switch checked={orgData.auditTrail} onCheckedChange={(v) => setOrgData({...orgData, auditTrail: v})}/>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 p-8 border-t">
                  <Button onClick={handleSaveSettings} disabled={saving} className="w-full h-14 font-bold text-lg shadow-none bg-[#F5D97F] hover:bg-[#F5D97F]/90 text-black">
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Save Changes Now
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ) : activeTab === 'assets' && isAdmin ? (
            <div className="space-y-8">
              <Card className="shadow-none border overflow-hidden">
                <CardHeader className="bg-muted/30 border-b p-6">
                  <CardTitle className="font-headline font-bold text-sm uppercase tracking-widest">Document Assets</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-8">
                  <div className="space-y-4">
                    <Label className="font-bold text-[10px] uppercase opacity-60">Header Image URL</Label>
                    <div className="flex gap-4">
                      <Input value={orgData.headerImageUrl} onChange={(e) => setOrgData({...orgData, headerImageUrl: e.target.value})} placeholder="/header.jpg" className="h-12 flex-1"/>
                      <div className="h-12 w-32 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {orgData.headerImageUrl ? <img src={orgData.headerImageUrl} alt="Header Preview" className="h-full w-full object-contain" /> : <ImageIcon className="opacity-20" />}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-bold text-[10px] uppercase opacity-60">Footer Image URL</Label>
                    <div className="flex gap-4">
                      <Input value={orgData.footerImageUrl} onChange={(e) => setOrgData({...orgData, footerImageUrl: e.target.value})} placeholder="/footer.jpg" className="h-12 flex-1"/>
                      <div className="h-12 w-32 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {orgData.footerImageUrl ? <img src={orgData.footerImageUrl} alt="Footer Preview" className="h-full w-full object-contain" /> : <ImageIcon className="opacity-20" />}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label className="font-bold text-[10px] uppercase opacity-60">Signature Image URL</Label>
                    <div className="flex gap-4">
                      <Input value={orgData.signatureImageUrl} onChange={(e) => setOrgData({...orgData, signatureImageUrl: e.target.value})} placeholder="/sign.png" className="h-12 flex-1"/>
                      <div className="h-12 w-32 border rounded-md overflow-hidden bg-muted flex items-center justify-center">
                        {orgData.signatureImageUrl ? <img src={orgData.signatureImageUrl} alt="Signature Preview" className="h-full w-full object-contain" /> : <ImageIcon className="opacity-20" />}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/30 p-8 border-t">
                  <Button onClick={handleSaveSettings} disabled={saving} className="w-full h-14 font-bold text-lg shadow-none bg-[#F5D97F] hover:bg-[#F5D97F]/90 text-black">
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Save Assets Now
                  </Button>
                </CardFooter>
              </Card>
            </div>  
          ) : activeTab === 'account' ? (
            <Card className="shadow-none border">
              <CardHeader className="bg-muted/30 border-b p-6">
                <CardTitle className="font-headline font-bold text-sm uppercase tracking-widest">Account Profile</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase opacity-60">Full Name</Label>
                  <Input value={accountData.displayName} onChange={(e) => isAdmin && setAccountData(prev => ({...prev, displayName: e.target.value}))} className="h-12 opacity-60" placeholder="e.g., Daryl Cortes" readOnly={!isAdmin}/>
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-[10px] uppercase opacity-60">Email Address</Label>
                  <Input value={accountData.email} onChange={(e) => isAdmin && setAccountData(prev => ({...prev, email: e.target.value}))} className="h-12 opacity-60" placeholder="name@callboxinc.com" readOnly={!isAdmin}/>
                </div>
              </CardContent>
              {isAdmin && (
                <CardFooter className="bg-muted/30 p-8 border-t">
                  <Button onClick={handleAccountSave} disabled={saving} className="w-full h-14 font-bold text-lg shadow-none bg-[#F5D97F] hover:bg-[#F5D97F]/90 text-black">
                    {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                    Update Profile
                  </Button>
                </CardFooter>
              )}
            </Card>
          ) : (
            <Card className="shadow-none border">
              <CardContent className="p-20 text-center opacity-40 italic font-medium">
                The {activeTab} is now available. Additional features will be added in future updates.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}