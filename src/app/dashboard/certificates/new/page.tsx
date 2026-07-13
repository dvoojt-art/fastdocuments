"use client"

import { useState } from "react"
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Header, Footer } from "docx"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { FileText, Download, Copy, Check, Zap, Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { collection, addDoc, serverTimestamp, doc } from "firebase/firestore"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"
import { jsPDF } from "jspdf"
import { generateStaticNarrative } from "./narrative-generator"
import { cn } from "@/lib/utils"
import { createNotification } from "@/lib/notifications"

export default function NewCertificatePage() {
  const db = useFirestore()
  const [draftedNarrative, setDraftedNarrative] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const settingsRef = useMemoFirebase(() => {
      if (!db) return null
      return doc(db, "settings", "global")
    }, [db])
    const { data: systemSettings } = useDoc(settingsRef)

  const [formData, setFormData] = useState({
    salutation: "Mr.",
    employeeName: "",
    position: "",
    department: "",
    employeeAddress: "",
    certificateType: "",
    startDate: "",
    endDate: "",
    employmentStatus: "",
    purposeOfCertificate: "",
    terminationReason: "company-wide retrenchment",
    basicRate: "",
    allowance: ""
  })
  const { toast } = useToast()

  const handleDraft = () => {
    if (!formData.employeeName || !formData.position || !formData.startDate || !formData.certificateType) {
      toast({
        title: "Missing Information",
        description: "Please fill in all mandatory fields (Name, Position, Start Date, Document Type).",
        variant: "destructive"
      })
      return
    }

    setIsSaving(true)
    const result = generateStaticNarrative(formData)
    setDraftedNarrative(result)
    
    if (db) {
      const certData = {
        ...formData,
        narrative: result,
        headerImageUrl: systemSettings?.headerImageUrl || "/header.jpg",
        footerImageUrl: systemSettings?.footerImageUrl || "/footer.jpg",
        signatureImageUrl: systemSettings?.signatureImageUrl || "/sign.png",
        status: "Pending",
        createdAt: serverTimestamp()
      }

      addDoc(collection(db, "certificates"), certData)
        .then(() => {
          createNotification(db, {
            title: "New Document Drafted",
            message: `${formData.certificateType} for ${formData.employeeName} is awaiting approval.`,
            type: "Info",
            link: "/dashboard/approvals"
          });
          
          toast({
            title: "Draft Created",
            description: "Document saved and sent for approval queue.",
          })
        })
        .catch(async (err) => {
          const permissionError = new FirestorePermissionError({
            path: "certificates",
            operation: "create",
            requestResourceData: certData
          })
          errorEmitter.emit("permission-error", permissionError)
        })
        .finally(() => {
          setIsSaving(false)
        })
    }
  }

  const handleCopy = () => {
    if (!draftedNarrative) return
    navigator.clipboard.writeText(draftedNarrative)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const handleDownloadPDF = async () => {
    if (!draftedNarrative) return

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

      const headerBase64 = await getBase64Image(systemSettings?.headerImageUrl || "/header.jpg")
      const footerBase64 = await getBase64Image(systemSettings?.footerImageUrl || "/footer.jpg")
      const signBase64 = await getBase64Image(systemSettings?.signatureImageUrl || "/sign.png")

      doc.addImage(headerBase64, "JPEG", 0, 0, pageWidth, 35)

      const lines = draftedNarrative.split("\n")
      let currentY = 50;

      lines.forEach((line: string) => {
        if (line.trim() === "") {
          currentY += 5
          return;
        }

        const titles = [
          "CERTIFICATION",
          "CERTIFICATE OF EMPLOYMENT",
          "CERTIFICATE OF EMPLOYMENT (COE WITH COMPENSATION)",
          "CERTIFICATE OF TERMINATION",
          "CERTIFICATE OF RECOGNITION",
          "CERTIFICATE OF COMPLETION",
          "CLEARANCE CERTIFICATE",
          "LETTER OF RECOMMENDATION"
        ]

        const isTitle = titles.includes(line.trim().toUpperCase()) || titles.includes(line.trim())
        const isIssuedLine = line.includes("Issued this");
        const isIndentedParagraph = line.startsWith('"Confidentiality.') || line.startsWith('"Non-Competition.') || line.startsWith("Employee shall not") || line.startsWith("Neither shall employee")
        const isRecognitionNameLine = formData.certificateType === "Certificate of Recognition" && line.trim() === `${formData.salutation} ${formData.employeeName}`.toUpperCase();
        const isRecognitionPositionLine = formData.certificateType === "Certificate of Recognition" && line.trim() === formData.position.toUpperCase();
        
        const currentMargin = isIndentedParagraph ? margin + 9 : margin;
        const currentContentWidth = isIndentedParagraph ? contentWidth - 18 : contentWidth;

        if (isTitle) {
          doc.setFontSize(18);
        } else if (isIndentedParagraph) {
          doc.setFontSize(9);
        } else if (formData.certificateType === "Certificate of Employment (COE with Compensation)") {
          doc.setFontSize(12);
        } else if (isRecognitionNameLine || isRecognitionPositionLine) {
          doc.setFontSize(9);
        } else {
          doc.setFontSize(10);
        }

        const splitText = doc.splitTextToSize(line, currentContentWidth)

        if (currentY + splitText.length * 5 > pageHeight - 35) {
          doc.addPage()
          doc.addImage(headerBase64, "JPEG", 0, 0, pageWidth, 35)
          currentY = 50
        }

        if (isTitle) {
          doc.setFont("times", "bold")
          const textToRender = line.trim().toUpperCase() === "CERTIFICATION" ? "C E R T I F I C A T I O N" : line;
          doc.text(textToRender, pageWidth / 2, currentY, { align: "center" })
          currentY += 14
        } else if (isRecognitionNameLine) {
          doc.setFont("times", "bold");
          doc.setFontSize(22);
          doc.text(line, pageWidth / 2, currentY, { align: "center" });
          currentY += 10;
        } else if (isRecognitionPositionLine) {
          doc.setFont("times", "normal");
          doc.setFontSize(14);
          doc.text(line, pageWidth / 2, currentY, { align: "center" });
          currentY += 10;
        } else {
          doc.setFont("times", "normal")
          const { salutation, employeeName } = formData;
          const fullNameWithSalutation = `${salutation} ${employeeName}`;
          const highlights = [fullNameWithSalutation, "Contact DB Incorporated", "Confidentiality.", "Non-Competition.", '"Confidentiality."', '"Non-Competition."'];

          const renderTextWithHighlights = (text: string, y: number) => {
            const textLines = doc.splitTextToSize(text, currentContentWidth);
            textLines.forEach((lineText: string) => {
              let currentX = currentMargin;
              const highlightRegex = new RegExp(`(${highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
              const parts = lineText.split(highlightRegex).filter(Boolean);

              parts.forEach(part => {
                const isHighlight = highlights.includes(part);
                doc.setFont("times", isHighlight ? "bold" : "normal");
                doc.text(part, currentX, y);
                currentX += doc.getTextWidth(part);
              });
              y += 5;
            });
            return y;
          };
          currentY = renderTextWithHighlights(line, currentY);
        }
        if (isIssuedLine) currentY += 10
      })

      // Adjust signature position to avoid page breaks
      const signatureY = pageHeight - 70;
      doc.addImage(signBase64, "PNG", margin - 5, signatureY, 50, 15);
      const textY = signatureY + 15;
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.text(systemSettings?.hrLead || "Orwill Jane M. Linaza", margin, textY);
      doc.text("People Operations Officer", margin, textY + 5);
      doc.addImage(footerBase64, "JPEG", 0, pageHeight - 30, pageWidth, 23);

      const filename = `${formData.employeeName.replace(/\s+/g, "_")}_${formData.certificateType.replace(/\s+/g, "_")}.pdf`
      doc.save(filename)
      toast({ title: "PDF Exported" })
    } catch (error) {
      console.error(error)
      toast({ title: "Export Failed", variant: "destructive" })
    }
  }

  const handleDownloadWord = async () => {
    if (!draftedNarrative) return;
    const getImageBuffer = async (url: string) => {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as ArrayBuffer);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
    };

    try {
      const headerBuffer = await getImageBuffer(systemSettings?.headerImageUrl || "/header.jpg");
      const footerBuffer = await getImageBuffer(systemSettings?.footerImageUrl || "/footer.jpg");
      const signBuffer = await getImageBuffer(systemSettings?.signatureImageUrl || "/sign.png");

      const contentParagraphs = draftedNarrative.split('\n').flatMap(line => {
        if (line.trim() === "") return new Paragraph({ children: [new TextRun("")] });
        const titles = ["CERTIFICATION", "CERTIFICATE OF EMPLOYMENT", "CERTIFICATE OF TERMINATION", "CERTIFICATE OF RECOGNITION", "CERTIFICATE OF COMPLETION", "CLEARANCE CERTIFICATE", "LETTER OF RECOMMENDATION", "CERTIFICATE OF EMPLOYMENT (STANDARD COE)", "CERTIFICATE OF EMPLOYMENT (COE WITH COMPENSATION)"];
        const isTitle = titles.includes(line.trim().toUpperCase());
        const isIndentedParagraph = line.startsWith('"Confidentiality.') || line.startsWith('"Non-Competition.') || line.startsWith("Employee shall not") || line.startsWith("Neither shall employee");
        const isRecognitionNameLine = formData.certificateType === "Certificate of Recognition" && line.trim() === `${formData.salutation} ${formData.employeeName}`.toUpperCase();
        const isRecognitionPositionLine = formData.certificateType === "Certificate of Recognition" && line.trim() === formData.position.toUpperCase();

        if (isTitle) {
          return new Paragraph({
            children: [new TextRun({ text: line.trim().toUpperCase() === "CERTIFICATION" ? "C E R T I F I C A T I O N" : line, bold: true, size: 32 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 },
          });
        }
        if (isRecognitionNameLine) {
          return new Paragraph({ children: [new TextRun({ text: line, bold: true, size: 44 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } });
        }
        if (isRecognitionPositionLine) {
          return new Paragraph({ children: [new TextRun({ text: line, size: 28 })], alignment: AlignmentType.CENTER, spacing: { after: 200 } });
        }

        const { salutation, employeeName } = formData;
        const fullNameWithSalutation = `${salutation} ${employeeName}`;
        const highlights = [fullNameWithSalutation, "Contact DB Incorporated", "Confidentiality.", "Non-Competition.", '"Confidentiality."', '"Non-Competition."'];
        const highlightRegex = new RegExp(`(${highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
        const parts = line.split(highlightRegex).filter(Boolean);

        return new Paragraph({
          children: parts.map(part => new TextRun({
            text: part,
            bold: highlights.includes(part),
            size: (formData.certificateType.includes("Compensation") || formData.certificateType.includes("Termination")) ? 24 : isIndentedParagraph ? 18 : 22,
          })),
          alignment: AlignmentType.JUSTIFIED,
          indent: isIndentedParagraph ? { left: 720 } : undefined,
          spacing: { after: formData.certificateType.includes("Termination") ? 140 : 100 },
        });
      });

      const signatureParagraphs = [
        new Paragraph({
          children: [new ImageRun({ data: signBuffer, transformation: { width: 190, height: 55 } })],
          indent: { left: -288 },
          spacing: { before: 400 },
        }),
        new Paragraph({ children: [new TextRun({ text: systemSettings?.hrLead || "Orwill Jane M. Linaza", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "People Operations Officer", bold: true, size: 24 })] }),
      ];

      const docObj = new Document({
        sections: [{
          properties: {
            page: { margin: { top: 2880, right: 1440, bottom: 1000, left: 1440 } },
          },
          headers: {
            default: new Header({
              children: [new Paragraph({ children: [new ImageRun({ data: headerBuffer, transformation: { width: 835, height: 135 }, floating: { verticalPosition: { offset: 0 }, horizontalPosition: { offset: 0 } } })] })],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({ children: [new ImageRun({ data: footerBuffer, transformation: { width: 800, height: 85 }, floating: { verticalPosition: { offset: 9705525 }, horizontalPosition: { offset: 0 } } })] })],
            }),
          },
          children: [...contentParagraphs, ...signatureParagraphs],
        }],
      });

      const blob = await Packer.toBlob(docObj);
      const filename = `${formData.employeeName.replace(/\s+/g, "_")}_${formData.certificateType.replace(/\s+/g, "_")}.docx`;
      saveAs(blob, filename);
      toast({ title: "Word Document Exported" });
    } catch (error) {
      console.error(error);
      toast({ title: "Export Failed", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-4xl font-headline font-bold tracking-tight">
          Create <span className="text-primary">Document</span>
        </h2>
        <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Generate professional HR narratives instantly</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5 space-y-6">
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="font-headline text-2xl font-bold uppercase">Employee Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="salutation" className="font-bold">Title</Label>
                  <Select value={formData.salutation} onValueChange={(v) => setFormData({...formData, salutation: v})}>
                    <SelectTrigger><SelectValue placeholder="Mr." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr.">Mr.</SelectItem>
                      <SelectItem value="Ms.">Ms.</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="employeeName" className="font-bold">Full Name</Label>
                  <Input id="employeeName" placeholder="e.g., Daryl Cortes" value={formData.employeeName} onChange={(e) => setFormData({...formData, employeeName: e.target.value})} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position" className="font-bold">Position</Label>
                <Select value={formData.position} onValueChange={(v) => setFormData({ ...formData, position: v })}>
                  <SelectTrigger><SelectValue placeholder="Select position" /></SelectTrigger>
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
                  <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
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

              <div className="space-y-2">
                <Label htmlFor="employeeAddress" className="font-bold">Address</Label>
                <Input id="employeeAddress" placeholder="e.g., JP Laurel Ave., Bajada, Davao City" value={formData.employeeAddress} onChange={(e) => setFormData({...formData, employeeAddress: e.target.value})}/>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="type" className="font-bold">Document Type</Label>
                <Select value={formData.certificateType} onValueChange={(v) => setFormData({...formData, certificateType: v})}>
                  <SelectTrigger><SelectValue placeholder="Select document type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Certificate of Employment (Standard COE)">Certificate of Employment (Standard COE)</SelectItem>
                    <SelectItem value="Certificate of Employment (COE with Compensation)">Certificate of Employment (COE with Compensation)</SelectItem>
                    <SelectItem value="Certificate of Termination">Certificate of Termination</SelectItem>
                    <SelectItem value="Certificate of Recognition">Certificate of Recognition</SelectItem>
                    <SelectItem value="Certificate of Completion">Certificate of Completion</SelectItem>
                    <SelectItem value="Clearance Certificate">Clearance Certificate</SelectItem>
                    <SelectItem value="Recommendation Letter">Recommendation Letter</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.certificateType.includes("Compensation") && (
                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="basicRate" className="font-bold">Basic Rate</Label>
                    <Input id="basicRate" type="number" placeholder="e.g. 20000" value={formData.basicRate} onChange={(e) => setFormData({...formData, basicRate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="allowance" className="font-bold">Allowance</Label>
                    <Input id="allowance" type="number" placeholder="e.g. 7000" value={formData.allowance} onChange={(e) => setFormData({...formData, allowance: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="font-bold">Start Date</Label>
                  <Input id="startDate" type="date" value={formData.startDate} onChange={(e) => setFormData({...formData, startDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="font-bold">End Date</Label>
                  <div className="space-y-2">
                    <Input id="endDate" type={formData.endDate === "Present" ? "text" : "date"} disabled={formData.endDate === "Present"} value={formData.endDate === "Present" ? "Currently Employed" : formData.endDate} onChange={(e) => setFormData({...formData, endDate: e.target.value})} />
                    <div className="flex items-center space-x-2">
                      <Checkbox id="present" checked={formData.endDate === "Present"} onCheckedChange={(checked) => setFormData({...formData, endDate: checked ? "Present" : ""})} />
                      <label htmlFor="present" className="text-[10px] font-bold uppercase leading-none cursor-pointer">Present (Current Employee)</label>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status" className="font-bold">Employment Status</Label>
                <Select value={formData.employmentStatus} onValueChange={(v) => setFormData({...formData, employmentStatus: v})}>
                  <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="On Leave">On Leave</SelectItem>
                    <SelectItem value="Resigned">Resigned</SelectItem>
                    <SelectItem value="Terminated">Terminated</SelectItem>
                    <SelectItem value="End of Contract">End of Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.certificateType.includes("Termination") && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="terminationReason" className="font-bold">Reason for Termination</Label>
                  <Input id="terminationReason" placeholder="e.g., company-wide retrenchment" value={formData.terminationReason} onChange={(e) => setFormData({...formData, terminationReason: e.target.value})} />
                </div>
              )}

              {formData.certificateType !== "Certificate of Termination" && (
                <div className="space-y-2">
                  <Label htmlFor="purpose" className="font-bold">Purpose of Issuance</Label>
                  <Input id="purpose" placeholder="e.g., Bank loan application" value={formData.purposeOfCertificate} onChange={(e) => setFormData({...formData, purposeOfCertificate: e.target.value})} />
                </div>
              )}
            </CardContent>
            <CardFooter className="pt-2">
              <Button onClick={handleDraft} disabled={isSaving} className="w-full h-14 font-bold text-lg shadow-sm hover:shadow-md transition-all">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="mr-2 h-5 w-5" /> Generate & Queue
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="lg:col-span-7">
          <Card className="shadow-sm border min-h-[800px] flex flex-col overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-6 bg-muted/5">
              <CardTitle className="font-headline text-2xl font-bold uppercase">Output Preview</CardTitle>
              {draftedNarrative && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleDownloadWord} className="font-bold"><Download className="h-4 w-4 mr-2" /> DOCX</Button>
                  <Button variant="outline" size="sm" onClick={() => {
                    const data = [
                      ["Title", "Full Name", "Position", "Department", "Address", "Document Type", "Start Date", "End Date", "Employment Status", "Purpose", "Basic Rate", "Allowance"],
                      [formData.salutation, formData.employeeName, formData.position, formData.department, formData.employeeAddress, formData.certificateType, formData.startDate, formData.endDate, formData.employmentStatus, formData.purposeOfCertificate, formData.basicRate, formData.allowance]
                    ];
                    const worksheet = XLSX.utils.aoa_to_sheet(data);
                    const workbook = XLSX.utils.book_new();
                    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Data");
                    XLSX.writeFile(workbook, `${formData.employeeName.replace(/\s+/g, "_")}_data.xlsx`);
                  }} className="font-bold"><Download className="h-4 w-4 mr-2" /> XLSX</Button>
                  <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="font-bold"><Download className="h-4 w-4 mr-2" /> PDF</Button>
                  <Button variant="outline" size="sm" onClick={handleCopy} className="font-bold">{copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}{copied ? "Copied" : "Copy"}</Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-0 bg-white flex flex-col">
              {draftedNarrative ? (
                <div className="flex-1 flex flex-col">
                  <div className="p-4 space-y-4 flex-1">
                    <div className="max-w-2xl mx-auto">
                       <img src={systemSettings?.headerImageUrl || "/header.jpg"} alt="Header" className="w-full mb-8" />
                      {draftedNarrative.split('\n').map((line, i) => (
                        <p key={i} className={cn("text-[11px] leading-[1.4] font-medium font-body text-foreground", line.trim().toUpperCase() === "CERTIFICATION" ? "text-center font-bold uppercase tracking-wider mb-6 text-lg" : "text-justify")}>
                          {line.trim().toUpperCase() === "CERTIFICATION" ? "C E R T I F I C A T I O N" : line}
                        </p>
                      ))}
                      <div className="mt-12 pt-10">
                        <img src={systemSettings?.signatureImageUrl || "/sign.png"} alt="Signature" className="h-10"/>
                        <div className="w-56 pt-1">
                          <p className="font-bold text-sm">{systemSettings?.hrLead || "Orwill Jane M. Linaza"}</p>
                          <p className="text-[12px] font-bold">People Operations Officer</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <img src={systemSettings?.footerImageUrl || "/footer.jpg"} alt="Footer" className="w-full mt-auto" />
                </div>
              ) : (
                <div className="h-full min-h-[450px] flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
                  <Zap className="h-20 w-20 mb-4" />
                  <p className="font-bold text-xl uppercase tracking-widest">Enter details to generate</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
