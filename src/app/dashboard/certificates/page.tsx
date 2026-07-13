"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Header, Footer } from "docx"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Eye, Loader2, FileText, Download, Users } from "lucide-react"
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase"
import { collection, query, orderBy } from "firebase/firestore"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { jsPDF } from "jspdf"
import { saveAs } from "file-saver"
import { useToast } from "@/hooks/use-toast"

const FOOTER_DATA = [
  { city: "California", address: "4249 Balboa Blvd, #353, Encino CA 91316 USA", phone: "+1 (888) 810-7464" },
  { city: "Singapore", address: "1 Scotts Road #24-10, Shaw Centre Singapore 228208", phone: "+1 (888) 810-7464" },
  { city: "Australia", address: "Suite 33, 89-97 Jones St, Ultimo, NSW 2007 Australia", phone: "+61 (02) 9037 2248" },
  { city: "Iloilo", address: "2nd and 3rd Flr, Avancena Bldg, M.H. Del Pilar St, Molo, 5000 Iloilo City, Philippines", phone: "+63 33 337 6833" },
  { city: "Davao", address: "9th and 10th Flr, Landco Corp, Center, J.P. Laurel Ave, Bajada, 8000 Davao City, Philippines", phone: "+63 82 224 2035" },
  { city: "Siargao", address: "Tourism Rd, Brgy. Catangnan, Gen. Luna, 8419, Surigao Del Norte, Philippines", phone: "" }
]
export default function CertificatesPage() {
  const db = useFirestore()
  const { toast } = useToast()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCert, setSelectedCert] = useState<any>(null)
  const certsQuery = useMemoFirebase(() => {
    if (!db) return null
    return query(collection(db, "certificates"), orderBy("createdAt", "desc"))
  }, [db])
  const { data: certificates, loading } = useCollection(certsQuery)
  const filteredCerts = certificates?.filter(cert => 
    cert.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificateType?.toLowerCase().includes(searchTerm.toLowerCase())
  )
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved": return "bg-green-500 text-white"
      case "Rejected": return "bg-destructive text-destructive-foreground"
      case "Pending": return "bg-primary text-primary-foreground"
      default: return "bg-muted text-muted-foreground"
    }
  }
  const formatLongDate = (date: any) => {
    if (!date || typeof date.toDate !== 'function') {
      return "N/A";
    }
    return date.toDate().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }
  const handleDownloadPDF = async (cert: any) => {
    if (!cert?.narrative) return
    try {
      const doc = new jsPDF("p", "mm", "a4")
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 25
      const contentWidth = pageWidth - margin * 2

      // CONVERT IMAGE TO BASE64
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
  
      // LOAD IMAGES
      const headerBase64 = await getBase64Image("/header.jpg")
      const footerBase64 = await getBase64Image("/footer.jpg")
      const signBase64 = await getBase64Image("/sign.png")
  
      // ADD HEADER
      doc.addImage( headerBase64, "JPEG", 0, 0, pageWidth, 35 )
  
      // CONTENT
      const lines = cert.narrative.split("\n")
      let currentY = 50;
      for (const line of lines) {
        if (line.trim() === "") {
          currentY += 5
          continue;
        }
        const titles = ["CERTIFICATION", "CERTIFICATE OF EMPLOYMENT", "CERTIFICATE OF EMPLOYMENT (COE WITH COMPENSATION)", "CERTIFICATE OF TERMINATION", "CERTIFICATE OF RECOGNITION", "CERTIFICATE OF COMPLETION", "CLEARANCE CERTIFICATE", "LETTER OF RECOMMENDATION" ]
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
  
        // AUTO PAGE BREAK
        if (currentY + splitText.length * 5 > pageHeight - 35) {
          doc.addPage()
          doc.addImage( headerBase64, "JPEG", 0, 0, pageWidth, 35 )
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
          const companyNames = [ "Contact DB Incorporated", "Confidentiality.", "Non-Competition." ];
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
        if (isIssuedLine) {
          currentY += 10
        }
      }
  
      // SIGNATURE
      const signatureY = pageHeight - 60;
      
      // --- E-Signature (Image) ---
      const signatureWidth = 50;
      const signatureHeight = 15; // Adjust as needed for aspect ratio
      doc.addImage(signBase64, "PNG", margin - 5, signatureY, signatureWidth, signatureHeight);
      
      // Printed name and title below the signature
      const textY = signatureY + signatureHeight;
      doc.setFont("times", "normal");
      doc.setFontSize(12);
      doc.text("Orwill Jane M. Linaza", margin, textY);
      doc.text("People Operations Officer", margin, textY + 5);
 
      // ADD FOOTER
      doc.addImage(footerBase64, "JPEG", 0, pageHeight - 30, pageWidth, 23);

      // SAVE
      const filename = `${cert.employeeName.replace(/\s+/g, "_")}_${cert.certificateType.replace(/\s+/g, "_")}.pdf`
      doc.save(filename)
      toast({
        title: "PDF Exported",
        description: "Your document is ready for download.",
      })
    } catch (error) {
      console.error(error)
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
      const headerBuffer = await getImageBuffer("/header.jpg");
      const footerBuffer = await getImageBuffer("/footer.jpg");
      const signBuffer = await getImageBuffer("/sign.png");
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
        new Paragraph({ children: [new TextRun({ text: "Orwill Jane M. Linaza", bold: true, size: 24 })] }),
        new Paragraph({ children: [new TextRun({ text: "People Operations Officer", bold: true, size: 24 })] }),
      ];
      const doc = new Document({
        sections: [{
          properties: { page: { margin: { top: 2880, right: 1440, bottom: 0, left: 1440 } } },
          headers: { default: new Header({ children: [new Paragraph({ children: [new ImageRun({ data: headerBuffer, transformation: { width: 835, height: 135 }, floating: { verticalPosition: { offset: 0 }, horizontalPosition: { offset: 0 } } })] })] }) },
          footers: { default: new Footer({ children: [new Paragraph({ children: [new ImageRun({ data: footerBuffer, transformation: { width: 800, height: 85 }, floating: { verticalPosition: { offset: 9705525 }, horizontalPosition: { offset: 0 } } })] })] }) },
          children: [...contentParagraphs, ...signatureParagraphs],
        }],
      });
      const blob = await Packer.toBlob(doc);
      const filename = `${cert.employeeName.replace(/\s+/g, "_")}_${cert.certificateType.replace(/\s+/g, "_")}.docx`;
      saveAs(blob, filename);
      toast({ title: "Word Document Exported", description: "The .docx file has been generated successfully." });
    } catch (error) {
      console.error(error);
      toast({ title: "Export Failed", description: "Failed to generate .docx file.", variant: "destructive" });
    }
  };
  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-headline font-bold tracking-tight">
            Document <span className="text-primary">Vault</span>
          </h2>
          <p className="font-bold opacity-60 uppercase text-xs tracking-widest mt-1">Manage generated HR documents</p>
        </div>
      </div>

      <Card className="shadow-none overflow-hidden border">
        <CardHeader className="border-b bg-muted/30 pb-6">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <div className="relative flex-1 max-w-md ml-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search employee name..." 
                className="pl-10 h-10 bg-background"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}/>
            </div>
          </div>
        </CardHeader>
         <p className="text-right font-bold opacity-60 text-xs tracking-widest mt-1">Only Approved Documents Can Be Downloaded.</p>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="font-bold uppercase text-xs">Full Name</TableHead>
                <TableHead className="font-bold uppercase text-xs">Document Type</TableHead>
                <TableHead className="font-bold uppercase text-xs">Generated Date</TableHead>
                <TableHead className="font-bold uppercase text-xs">Status</TableHead>
                <TableHead className="text-right font-bold uppercase text-xs">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" />
                  </TableCell>
                </TableRow>
              ) : filteredCerts && filteredCerts.length > 0 ? (
                filteredCerts.map((cert) => (
                  <TableRow key={cert.id} className="hover:bg-muted/30">
                    <TableCell className="font-bold">{cert.employeeName}</TableCell>
                    <TableCell className="font-medium">{cert.certificateType}</TableCell>
                    <TableCell className="text-muted-foreground font-medium">
                      {formatLongDate(cert.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={`font-bold shadow-none ${getStatusColor(cert.status)}`}>
                        {cert.status || "Pending"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="hover:bg-primary/10"
                          onClick={() => setSelectedCert(cert)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {cert.status === 'Approved' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="font-bold h-9"
                              onClick={() => handleDownloadWord(cert)}>
                              <Download className="h-4 w-4 mr-1" /> DOCX
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="font-bold h-9"
                              onClick={() => handleDownloadPDF(cert)}>
                              <Download className="h-4 w-4 mr-1" /> PDF
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-20 opacity-40 italic">
                    {searchTerm ? "No documents match your search criteria." : "No documents found in the vault."}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selectedCert} onOpenChange={() => setSelectedCert(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border shadow-none sm:rounded-lg">
          <DialogHeader className="p-6 border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-6 w-6 text-primary" />
                <div>
                  <DialogTitle className="font-headline font-bold text-2xl uppercase">Document Preview</DialogTitle>
                  <DialogDescription className="font-bold opacity-60 uppercase text-[10px] tracking-widest">
                    Reviewing {selectedCert?.certificateType} for {selectedCert?.employeeName}
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-8 bg-white">
            <div className="max-w-2xl mx-auto">
              <img src="/header.jpg" alt="Document Header" className="w-full mb-8"/>
              <div className="space-y-4">
                {selectedCert?.narrative?.split('\n').map((line: string, i: number) => {
                  if (line.trim() === "") return <div key={i} className="h-2"/>;
                  const titles = ["CERTIFICATION", "CERTIFICATE OF EMPLOYMENT", "CERTIFICATE OF EMPLOYMENT (COE WITH COMPENSATION)", "CERTIFICATE OF TERMINATION", "CERTIFICATE OF RECOGNITION", "CERTIFICATE OF COMPLETION", "CLEARANCE CERTIFICATE", "LETTER OF RECOMMENDATION", "CERTIFICATE OF EMPLOYMENT (STANDARD COE)"]
                  const isTitle = titles.includes(line.trim().toUpperCase()) || titles.includes(line.trim());
                  const isIssuedLine = line.includes("Issued this");
                  const isFirstParagraph = line.startsWith("This is to certify that");
                  return (
                    <p key={i} 
                      className={cn(
                        "text-[12px] leading-[1.6] font-medium font-body text-foreground",
                        isTitle ? "text-center font-bold uppercase tracking-wider my-6 text-xl" : (isFirstParagraph ? "" : "text-justify"),
                        isIssuedLine ? "mt-8 font-semibold" : ""
                      )}>
                      {line}
                    </p>
                  );
                })}

                {/* Signature Simulation */}
                <div className="mt-12 pt-6">
                  <div className="w-64 border-t border-muted-foreground/30 pt-2">
                    <p className="font-bold text-lg">Orwill Jane M. Linaza</p>
                    <p className="text-[10px] opacity-80">People Operations Officer</p>
                  </div>
                </div>
              </div>
              <img src="/footer.jpg" alt="Document Footer" className="w-full mt-12" />
            </div>
          </div>
          <div className="p-4 border-t bg-muted/10 flex justify-end">
            <Button onClick={() => setSelectedCert(null)} className="font-bold px-8 shadow-none">Close Preview</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
