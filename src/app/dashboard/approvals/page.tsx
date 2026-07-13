"use client"

import { useState, useEffect } from "react"
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Header, Footer } from "docx"
import { saveAs } from "file-saver"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Check, X, Loader2, Clock, CheckCircle, XCircle, Users, Edit, Trash2 } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase, useDoc } from "@/firebase"
import { collection, query, where, orderBy, doc, updateDoc, deleteDoc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { jsPDF } from "jspdf"
import { createNotification } from "@/lib/notifications";

export default function ApprovalsPage() {
const db = useFirestore()
const settingsRef = useMemoFirebase(() => {
    if (!db) return null
    return doc(db, "settings", "global")
  }, [db])
const { data: systemSettings } = useDoc(settingsRef)
const handleApproveRequest = async (certificate: any) => {
  if (!db) return;
  try {
    const certRef = doc(db, "certificates", certificate.id);
    await updateDoc(certRef, {
      status: "Approved",
    });
    if (certificate.requestedByUid) {
      await createNotification(db, {
        targetUid: certificate.requestedByUid,
        title: "Request Approved",
        message: `Your request for a ${certificate.certificateType} has been approved.`,
        type: "Success",
        link: "/dashboard",
      });
    }

    toast({
      title: "Request Approved",
      description: "The member has been notified.",
    });

    setLocalPendingCerts(prev =>
      prev.filter(c => c.id !== certificate.id)
    );

  } catch (error) {
    console.error("APPROVAL ERROR:", error);

    toast({
      title: "Approval Failed",
      description: "Unable to approve the request.",
      variant: "destructive",
    });
  }
};
    
    const handleRejectRequest = async (certificate: any, reason: string) => {
    if (!db) return;
    try {
    const certRef = doc(db, "certificates", certificate.id);

    await updateDoc(certRef, {
      status: "Rejected",
      rejectionReason: reason,
    });

    if (certificate.requestedByUid) {
      await createNotification(db, {
        targetUid: certificate.requestedByUid,
        title: "Request Rejected",
        message: `Your request for a ${certificate.certificateType} was rejected. Reason: ${reason}`,
        type: "Error",
        link: "/dashboard",
      });
    }

    toast({
      title: "Request Rejected",
      description: "The member has been notified.",
    });

    setLocalPendingCerts(prev =>
      prev.filter(c => c.id !== certificate.id)
    );

  } catch (error) {
    console.error("REJECTION ERROR:", error);

    toast({
      title: "Error",
      description: "Unable to reject request.",
      variant: "destructive",
    });
  }
};
  const { toast } = useToast()
  const [editingCert, setEditingCert] = useState<any>(null)
  const [editedNarrative, setEditedNarrative] = useState("")
  const [localPendingCerts, setLocalPendingCerts] = useState<any[]>([])

  // Queries for status cards
  const passwordResetQuery = useMemoFirebase(() => {
  if (!db) return null

  return query(
    collection(db, "passwordResetRequests"),
    where("status", "==", "Pending")
  )
  }, [db])

  const { data: passwordResetRequests } = useCollection(passwordResetQuery)
  const pendingCountQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "certificates"), where("status", "==", "Pending"))
  }, [db])

  const approvedCountQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "certificates"), where("status", "==", "Approved"))
  }, [db])

  const rejectedCountQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "certificates"), where("status", "==", "Rejected"))
  }, [db])

  const activeEmployeesQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "employees"), where("status", "==", "Active"))
  }, [db])

  const pendingQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(
      collection(db, "certificates"),
      where("status", "==", "Pending"),
      orderBy("createdAt", "desc")  
    )
  }, [db])

  const { data: pendingCerts, loading } = useCollection(pendingQuery)
  useEffect(() => {
  if (pendingCerts) {
    setLocalPendingCerts(pendingCerts)
  }
}, [pendingCerts])
  const { data: pendingCountData } = useCollection(pendingCountQuery)
  const { data: approvedCountData } = useCollection(approvedCountQuery)
  const { data: rejectedCountData } = useCollection(rejectedCountQuery)
  const { data: activeEmpData } = useCollection(activeEmployeesQuery)

  const stats = [
    {
      title: "Pending",
      value: pendingCountData?.length ?? 0,
      icon: Clock,
      color: "text-primary",
      bg: "bg-primary/10"
    },
    {
      title: "Approved",
      value: approvedCountData?.length ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50"
    },
    {
      title: "Rejected",
      value: rejectedCountData?.length ?? 0,
      icon: XCircle,
      color: "text-destructive",
      bg: "bg-destructive/10"
    },
    {
      title: "Active Staff",
      value: activeEmpData?.length ?? 0,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-50"
    }
  ]

  const handleDelete = async (id: string) => {
  if (!db) return;

  try {
    const docRef = doc(db, "certificates", id);

    await deleteDoc(docRef);

    toast({
      title: "Request Deleted",
      description: "The certificate request has been removed from the queue.",
    });

    setLocalPendingCerts(prev =>
      prev.filter(cert => cert.id !== id)
    );

  } catch (error) {
    console.error("DELETE ERROR:", error);

    toast({
      title: "Delete Failed",
      description: "Unable to delete the request.",
      variant: "destructive",
    });
  }
};

  const handleEditSave = async () => {
  if (!db || !editingCert) return

  try {
    const docRef = doc(db, "certificates", editingCert.id)

    console.log("PATH:", docRef.path)

    await updateDoc(docRef, {
      narrative: editedNarrative,
    })

    console.log("DOCUMENT ID:", editingCert.id)
    console.log("UPDATED NARRATIVE:", editedNarrative)

    setLocalPendingCerts(prev =>
      prev.map(cert =>
        cert.id === editingCert.id
          ? {
              ...cert,
              narrative: editedNarrative,
            }
          : cert
      )
    )

    toast({
      title: "Narrative Updated",
      description: "The certificate content has been modified.",
    })

    setEditingCert(null)
    } catch (err) {
    console.error("UPDATE ERROR:", err)

    toast({
      title: "Update Failed",
      description: "Unable to update narrative.",
      variant: "destructive",
    })
  }
}
      
  const openEditDialog = (cert: any) => {
    setEditingCert(cert)
    setEditedNarrative(cert.narrative || "")
  }

  const formatLongDate = (date: any) => {
    if (!date) return "N/A";
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  const handleDownloadPDF = async (cert: any) => {
    if (!cert.narrative) return

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
          reader.onloadend = () => {
            resolve(reader.result as string)
          }
          reader.readAsDataURL(blob)
        })
      }
  
      const headerBase64 = await getBase64Image(cert.headerImageUrl || systemSettings?.headerImageUrl || "/header.jpg")
      const footerBase64 = await getBase64Image(cert.footerImageUrl || systemSettings?.footerImageUrl || "/footer.jpg")
      const signBase64 = await getBase64Image(cert.signatureImageUrl || systemSettings?.signatureImageUrl || "/sign.png")
  
      doc.addImage(headerBase64, "JPEG", 0, 0, pageWidth, 35)
  
      const lines = cert.narrative.split("\n")
      let currentY = 50;

      lines.forEach((line: string) => {
        if (line.trim() === "") {
          currentY += 5
          return;
        }
  
        const titles = [
          "CERTIFICATION", "CERTIFICATE OF EMPLOYMENT", "CERTIFICATE OF EMPLOYMENT (COE WITH COMPENSATION)",
          "CERTIFICATE OF TERMINATION", "CERTIFICATE OF RECOGNITION", "CERTIFICATE OF COMPLETION",
          "CLEARANCE CERTIFICATE", "LETTER OF RECOMMENDATION"
        ]
  
        const isTitle = titles.includes(line.trim().toUpperCase()) || titles.includes(line.trim())
        const isIssuedLine = line.includes("Issued this");
        const isIndentedParagraph = line.startsWith('"Confidentiality.') || line.startsWith('"Non-Competition.') || line.startsWith("Employee shall not") || line.startsWith("Neither shall employee")
        const isRecognitionNameLine = cert.certificateType === "Certificate of Recognition" && line.trim() === `${cert.salutation} ${cert.employeeName}`.toUpperCase();
        const isRecognitionPositionLine = cert.certificateType === "Certificate of Recognition" && line.trim() === cert.position.toUpperCase();
        const possessivePronoun = cert.salutation === "Mr." ? "his" : "her";
        const compensationIntroLine = `${possessivePronoun.charAt(0).toUpperCase() + possessivePronoun.slice(1)} monthly compensation is as follows:`;
        const isCompensationIntro = line.trim() === compensationIntroLine;
        const currentMargin = isIndentedParagraph ? margin + 9 : margin;
        const currentContentWidth = isIndentedParagraph ? contentWidth - 18 : contentWidth;
  
        if (isTitle) doc.setFontSize(18);
        else if (isIndentedParagraph) doc.setFontSize(9);
        else if (cert.certificateType === "Certificate of Employment (COE with Compensation)") doc.setFontSize(12);
        else if (isRecognitionNameLine || isRecognitionPositionLine) doc.setFontSize(9);
        else doc.setFontSize(10);
  
        const splitText = doc.splitTextToSize(line, currentContentWidth)
  
        if (currentY + splitText.length * 5 > pageHeight - 45) {
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
        } else if (isCompensationIntro) {
          doc.setFont("times", "bolditalic");
          doc.text(line, currentMargin, currentY);
          currentY += 7;
          currentY += 10;
        } else {
          doc.setFont("times", "normal");

          const { salutation, employeeName } = cert;
          const fullNameWithSalutation = `${salutation} ${employeeName}`;
          const companyNames = [
            "Contact DB Incorporated",
            "Confidentiality.",
            "Non-Competition."
          ];
          const legalTerms = ['"Confidentiality."', '"Non-Competition."'];
          const highlights = [fullNameWithSalutation, ...companyNames, ...legalTerms];

          const renderJustifiedLineWithHighlights = (text: string, y: number) => {
            const textLines = doc.splitTextToSize(text, currentContentWidth);

            textLines.forEach((lineText: string, lineIndex: number) => {
              const isLastLine = lineIndex === textLines.length - 1;
              let currentX = currentMargin;
              const words = lineText.split(' ');
              const totalWordsWidth = doc.getTextWidth(lineText.replace(/\s/g, ''));
              const spaceWidth = (words.length > 1 && !isLastLine)
                ? (currentContentWidth - totalWordsWidth) / (words.length - 1)
                : doc.getTextWidth(' ');

              const highlightRegex = new RegExp(`(${highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
              const parts = lineText.split(highlightRegex).filter(Boolean);

              parts.forEach(part => {
                const isHighlight = highlights.includes(part);
                doc.setFont("times", isHighlight ? "bold" : "normal");

                const wordsInPart = part.split(' ');
                wordsInPart.forEach((word, wordIndex) => {
                  doc.text(word, currentX, y);
                  currentX += doc.getTextWidth(word);
                  if (wordIndex < wordsInPart.length - 1) {
                    currentX += doc.getTextWidth(' ');
                  }
                });

                if (parts.length > 1) {
                   currentX += doc.getTextWidth(' ');
                }
              });

              if (!isLastLine && parts.length === 1) {
                 // Fallback for standard justification on non-highlighted lines
                 doc.setFont("times", "normal");
                 doc.text(lineText, currentMargin, y, { align: 'justify', maxWidth: currentContentWidth });
              }
              
              y += 5;
            });
            return y;
          };

          currentY = renderJustifiedLineWithHighlights(line, currentY);
        }
  
        if (isIssuedLine) currentY += 10
      })
  
      // Adjust signature position to avoid page breaks
      const signatureY = pageHeight - 70;
      const signatureWidth = 50;
      const signatureHeight = 15;
      doc.addImage(signBase64, "PNG", margin - 5, signatureY, signatureWidth, signatureHeight);
      
      const textY = signatureY + signatureHeight;
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.text(systemSettings?.hrLead || "Orwill Jane M. Linaza", margin, textY);
      doc.text("People Operations Officer", margin, textY + 5);
      doc.addImage(footerBase64, "JPEG", 0, pageHeight - 30, pageWidth, 23);
  
      const filename = `${cert.employeeName.replace(/\s+/g, "_")}_${cert.certificateType.replace(/\s+/g, "_")}.pdf`
      doc.save(filename)
  
      toast({
        title: "PDF Exported",
        description: "Your document is ready for download.",
      })
      } catch (error) {
        console.error("PDF EXPORT ERROR:", error)
        toast({
          title: "Export Failed",
          description: "Failed to generate PDF.",
          variant: "destructive",
        })
      }
    }

  const handleDownloadWord = async (cert: any) => {
    if (!cert.narrative) return;

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
      const headerBuffer = await getImageBuffer(cert.headerImageUrl || systemSettings?.headerImageUrl || "/header.jpg");
      const footerBuffer = await getImageBuffer(cert.footerImageUrl || systemSettings?.footerImageUrl || "/footer.jpg");
      const signBuffer = await getImageBuffer(cert.signatureImageUrl || systemSettings?.signatureImageUrl || "/sign.png");

      const contentParagraphs = cert.narrative.split('\n').flatMap((line: string) => {
        if (line.trim() === "") {
          return new Paragraph({ children: [new TextRun("")] });
        }

        const isIndentedParagraph = line.startsWith('"Confidentiality.') || line.startsWith('"Non-Competition.') || line.startsWith("Employee shall not") || line.startsWith("Neither shall employee");
        const isRecognitionNameLine = cert.certificateType === "Certificate of Recognition" && line.trim() === `${cert.salutation} ${cert.employeeName}`.toUpperCase();
        const isRecognitionPositionLine = cert.certificateType === "Certificate of Recognition" && line.trim() === cert.position.toUpperCase();
        const possessivePronoun = cert.salutation === "Mr." ? "his" : "her";
        const compensationIntroLine = `${possessivePronoun.charAt(0).toUpperCase() + possessivePronoun.slice(1)} monthly compensation is as follows:`;
        const isCompensationIntro = line.trim() === compensationIntroLine;
        const titles = ["CERTIFICATION", "CERTIFICATE OF EMPLOYMENT", "CERTIFICATE OF TERMINATION", "CERTIFICATE OF RECOGNITION", "CERTIFICATE OF COMPLETION", "CLEARANCE CERTIFICATE", "LETTER OF RECOMMENDATION", "CERTIFICATE OF EMPLOYMENT (STANDARD COE)", "CERTIFICATE OF EMPLOYMENT (COE WITH COMPENSATION)"];
        const isTitle = titles.includes(line.trim().toUpperCase());

        if (isTitle) {
          return new Paragraph({
            children: [new TextRun({ 
              text: line.trim().toUpperCase() === "CERTIFICATION" ? "C E R T I F I C A T I O N" : line, 
              bold: true, 
              size: 32 
            })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 280 },
          });
        }
        if (isRecognitionNameLine) {
          return new Paragraph({
            children: [new TextRun({ text: line, bold: true, size: 44 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          });
        }
        if (isRecognitionPositionLine) {
          return new Paragraph({
            children: [new TextRun({ text: line, size: 28 })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          });
        }
        if (isCompensationIntro) {
          return new Paragraph({
            children: [new TextRun({ text: line, bold: true, italics: true, size: 24 })],
            alignment: AlignmentType.JUSTIFIED,
            spacing: { after: 100 },
          });
        }

        const { salutation, employeeName } = cert;
        const fullNameWithSalutation = `${salutation} ${employeeName}`;
        const companyNames = ["Contact DB Incorporated", "Confidentiality.", "Non-Competition."];
        const legalTerms = ['"Confidentiality."', '"Non-Competition."'];
        const highlights = [fullNameWithSalutation, ...companyNames, ...legalTerms];
        const highlightRegex = new RegExp(`(${highlights.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'g');
        const parts = line.split(highlightRegex).filter(Boolean);

        return new Paragraph({
          children: parts.map(part => new TextRun({
            text: part,
            bold: highlights.includes(part),
            size:
              cert.certificateType === "Certificate of Employment (COE with Compensation)" ||
              cert.certificateType === "Certificate of Termination"
                ? 24
                : isIndentedParagraph
                ? 18
                : 22,
          })),
          alignment: AlignmentType.JUSTIFIED,
          indent: isIndentedParagraph ? { left: 720 } : undefined,
          spacing: { after: cert.certificateType === "Certificate of Termination" ? 140 : 100 },
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

      const doc = new Document({
        sections: [{
          properties: {
            page: {
              margin: { top: 2880, right: 1440, bottom: 0, left: 1440 },
            },
          },
          headers: {
            default: new Header({
              children: [new Paragraph({
                children: [new ImageRun({
                  data: headerBuffer,
                  transformation: { width: 835, height: 135 },
                  floating: { verticalPosition: { offset: 0 }, horizontalPosition: { offset: 0 } },
                })],
              })],
            }),
          },
          footers: {
            default: new Footer({
              children: [new Paragraph({
                children: [new ImageRun({
                  data: footerBuffer,
                  transformation: { width: 800, height: 85 },
                  floating: { verticalPosition: { offset: 9705525 }, horizontalPosition: { offset: 0 } },
                })],
              })],
            }),
          },
          children: [...contentParagraphs, ...signatureParagraphs],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const filename = `${cert.employeeName.replace(/\s+/g, "_")}_${cert.certificateType.replace(/\s+/g, "_")}.docx`;
      saveAs(blob, filename);

      toast({
        title: "Word Document Exported",
        description: "The .docx file has been generated successfully.",
      });
    } catch (error) {
      console.error("WORD EXPORT ERROR:", error)
      toast({
        title: "Export Failed",
        description: "Failed to generate .docx file.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-4xl font-headline font-bold tracking-tight">
          Approval <span className="text-primary">Queue</span>
        </h2>
        <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Review and authorize HR document requests</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="shadow-none border overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">{stat.title}</p>
                  <p className="text-3xl font-bold font-headline">{stat.value}</p>
                </div>
                <div className={`p-3 rounded-full ${stat.bg}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm border overflow-hidden">
        <CardHeader className="bg-muted/50 border-b p-6">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-primary" />
            <CardTitle className="font-headline font-bold text-2xl uppercase">Pending Requests</CardTitle>
          </div>
          <CardDescription className="opacity-80 font-medium">Items requiring your immediate attention</CardDescription>  
        </CardHeader>
        <p className="text-right font-bold opacity-60 text-xs tracking-widest mt-1">Documents can be edited or deleted before approval or rejection.</p>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="font-bold uppercase text-xs">Full Name</TableHead>
                <TableHead className="font-bold uppercase text-xs">Document Type</TableHead>
                <TableHead className="font-bold uppercase text-xs">Request Date</TableHead>
                <TableHead className="text-right font-bold uppercase text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                  </TableCell>
                </TableRow>
              ) : localPendingCerts.length > 0 ? (
                localPendingCerts.map((cert) => (
                  <TableRow key={cert.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold">{cert.employeeName}</TableCell>
                    <TableCell className="font-medium">{cert.certificateType}</TableCell>
                    <TableCell className="text-muted-foreground font-medium">
                      {formatLongDate(cert.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" className="font-bold h-9" onClick={() => openEditDialog(cert)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="outline" size="sm" className="font-bold h-9 text-destructive hover:bg-destructive hover:text-white" onClick={() => handleDelete(cert.id)}>
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                        <div className="w-[1px] h-9 bg-border" />
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-bold h-9 hover:bg-green-500 hover:text-white hover:border-green-500 transition-colors"
                          onClick={() => handleApproveRequest(cert)}
                        >
                          <Check className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="font-bold h-9 hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
                          onClick={() => handleRejectRequest(cert, "Your request did not meet the requirements.")}
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-20 opacity-40 italic">
                    All clear! No pending approvals.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingCert} onOpenChange={() => setEditingCert(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 border shadow-none sm:rounded-lg">
          <DialogHeader className="p-6 border-b bg-muted/30">
            <DialogTitle className="font-headline font-bold text-2xl uppercase">Edit Document Narrative</DialogTitle>
            <DialogDescription className="text-xs font-bold opacity-60 uppercase tracking-widest">
              Review and modify the content before approval
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
            <div className="max-w-2xl mx-auto bg-white shadow-lg relative min-h-[1122px]">
              {/* Header */}
              <div className="absolute top-0 z-10 bg-white">
                <img src={editingCert?.headerImageUrl || systemSettings?.headerImageUrl || "/header.jpg"} alt="Document Header" className="w-full mb-8" />
              </div>

              {/* Content */}
              <div className="px-[25mm] pt-20 pb-40">
                <Textarea
                  value={editedNarrative}
                  onChange={(e) => setEditedNarrative(e.target.value)}
                  className="min-h-[700px] font-['Times_New_Roman',_serif]
                            leading-relaxed bg-transparent border-none
                            shadow-none resize-none focus-visible:ring-0"
                />

                {/* Signature */}
                <div className="mt-10">
                   <img src={editingCert?.signatureImageUrl || systemSettings?.signatureImageUrl || "/sign.png"} alt="Signature" className="h-12 mb-2" />
                 <p className="font-bold text-base font-['Times_New_Roman',_serif]">{systemSettings?.hrLead || "Orwill Jane M. Linaza"}</p>
                  <p className="text-[12px] font-bold">
                    People Operations Officer
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="absolute bottom-0 left-0 right-0">
                <img src={editingCert?.footerImageUrl || systemSettings?.footerImageUrl || "/footer.jpg"} alt="Document Footer" className="w-full mt-20" />
              </div>

            </div>
          </div>
          <DialogFooter className="p-6 border-t bg-muted/20">
            <Button variant="outline" onClick={() => setEditingCert(null)} className="font-bold h-12 shadow-none">Cancel</Button>
            <Button onClick={handleEditSave} className="font-bold h-12 px-8 shadow-none">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
