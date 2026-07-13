interface FormData {
  salutation: string;
  employeeName: string;
  position: string;
  department: string;
  employeeAddress: string;
  certificateType: string;
  startDate: string;
  endDate: string;
  employmentStatus: string;
  purposeOfCertificate: string;
  terminationReason: string;
  basicRate: string;
  allowance: string;
}

const formatDateString = (dateStr: string) => {
  if (!dateStr || dateStr.toLowerCase() === 'present') return dateStr;
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

const getOrdinalSuffix = (day: number) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1:  return "st";
    case 2:  return "nd";
    case 3:  return "rd";
    default: return "th";
  }
}

const getIssuedDateString = () => {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleDateString('en-US', { month: 'long' });
  const year = today.getFullYear();
  return `Issued this ${day}${getOrdinalSuffix(day)} day of ${month} ${year}, at Davao City, Philippines.`;
}

export const generateStaticNarrative = (data: Partial<FormData>) => {
  const { salutation = "Mr.", employeeName, position, department, certificateType, startDate, endDate, employmentStatus, purposeOfCertificate, terminationReason, basicRate, allowance, employeeAddress } = data;
  
  if (!employeeName || !position || !startDate || !endDate) {
    return "Error: Missing required fields to generate narrative.";
  }

  const formattedStart = formatDateString(startDate);
  const formattedEnd = formatDateString(endDate);
  const fullNameWithSalutation = `${salutation} ${employeeName}`;
  const lastName = employeeName.split(' ').pop() || '';
  const salutationAndLastName = `${salutation} ${lastName}`;
  const pronoun = salutation === "Mr." ? "he" : "she";
  const possessivePronoun = salutation === "Mr." ? "his" : "her";
  const objectivePronoun = salutation === "Mr." ? "him" : "her";
  const verb = endDate.toLowerCase() === 'present' ? 'is' : 'was';
  const period = endDate.toLowerCase() === 'present' ? `since ${formattedStart}` : `from ${formattedStart} to ${formattedEnd}`;
  const purpose = purposeOfCertificate || 'any legal purposes';
  const formattedBasicRate = basicRate ? `P ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(basicRate))}` : "P 0.00";
  const formattedAllowance = allowance ? `P ${new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(allowance))}` : "P 0.00";
  const issuedLine = getIssuedDateString();

  switch (certificateType) {
    case "Certificate of Employment (Standard COE)":
      return `CERTIFICATION\nThis is to certify that ${fullNameWithSalutation} ${verb} an employee of Contact DB Inc. (Callbox Inc.) ${period} as a ${position} under the ${department || '[Department]'} department, residing at ${employeeAddress || '[Employee Address]'}.\n\nThis is to further certify that ${pronoun} is cleared from all money and property accountabilities with the company.\n\nThis also serves notice that employee is bound by surviving confidentiality and non-competition provisions in ${possessivePronoun} contract with Contact DB Incorporated, quoted as follows:\n\n"Confidentiality. During the Employment Period and for an indefinite period thereafter, an employee shall not use, divulge, communicate or disclose any protected intellectual property, confidential information, trade secrets, records relating to the business, affairs, products or services of Contact DB Incorporated or its affiliates, or any Person having dealings therewith, or permit or encourage the use of such confidential information by another."\n\n"Non-Competition. During the Employment Period and within One year from the termination thereof:\nEmployee shall not promote, participate, engage or have any other interest directly or indirectly, in any other business, undertaking or activity similar or substantially similar to the business operations or activities of Contact DB Incorporated or any of its affiliates, in any jurisdiction where the company is holding office. For this purpose, "directly or indirectly engage in any business similar to or substantially similar to that of Contact DB Incorporated" shall include, but is not limited to, engaging in the same business as owner, partner, agent, representative, consultant, officer, director or as an employee of any person, firm, or corporation or other entity;\n\nNeither shall employee directly or indirectly solicit, obtain, secure or render services to any prospective or present client which has been solicited or serviced by Contact DB Incorporated. Or any of its affiliates; nor shall an employee recruits any of the employees of the Company including those of its affiliates to engage in a business similar or the same to that of Contact DB Incorporated."\n\nThis certification is issued as requested by the above-named employee for ${purpose} only.\n\n${issuedLine}`;
    case "Certificate of Employment (COE with Compensation)":
      return `CERTIFICATION\n\nThis is to certify that ${fullNameWithSalutation} ${verb} an employee of ContactDB Inc. (Callbox Inc.) ${period} as a ${position}, residing at ${employeeAddress || '[Employee Address]'}.\n\n\n${possessivePronoun.charAt(0).toUpperCase() + possessivePronoun.slice(1)} monthly compensation is as follows:\n\nBasic Rate                  ${formattedBasicRate}\nAllowance                    ${formattedAllowance}\n\n\nThis is to further certify that ${pronoun} is cleared from all money and property accountabilities with the company.\n\nThis certification is issued as requested by the above-named employee for ${purpose}.\n\n${issuedLine}`;
    case "Certificate of Termination":
      return `CERTIFICATE OF TERMINATION\n\nThis is to certify that ${fullNameWithSalutation}, holding the position of ${position}, was employed with ContactDB Inc. ${period}.\n\nAs of ${formattedEnd}, the employment of the above-named employee has been officially terminated due to ${terminationReason || 'company-wide retrenchment'}. The termination was carried out in accordance with company policies and applicable labor laws. All company property has been returned, and any final pay and benefits due have been or will be processed accordingly.\n\nThis certification is being issued upon the request of the employee for whatever legal purpose it may serve.\n\n${issuedLine}`;
    case "Certificate of Recognition":
      return `CERTIFICATE OF RECOGNITION\n\nThis certificate is proudly presented to ${fullNameWithSalutation} ${position}.\n\nIn recognition of ${possessivePronoun} dedicated service and exemplary performance during ${possessivePronoun} tenure ${period}.\n\n${issuedLine}`;
    case "Certificate of Completion":
      return `CERTIFICATE OF COMPLETION\n\nThis is to certify that ${fullNameWithSalutation} has successfully completed ${possessivePronoun} ${position} at ContactDB Inc. (Callbox Inc.) ${period}, rendering a total of 330 working hours in fulfillment of the requirements of ${possessivePronoun} academic program.\n\nDuring ${possessivePronoun} internship, ${salutationAndLastName} diligently performed the duties and responsibilities assigned to ${objectivePronoun}, consistently demonstrating professionalism, commitment, integrity, and a strong willingness to learn. ${pronoun.charAt(0).toUpperCase() + pronoun.slice(1)} successfully completed all assigned tasks and achieved the objectives and competencies expected throughout ${possessivePronoun} training period.\n\nThis certificate is awarded in recognition of ${possessivePronoun} dedication, outstanding performance, and the successful completion of all requirements of the ${position} program.\n\nIssued upon request for whatever legal purpose it may serve.\n\n${issuedLine}`;
    case "Clearance Certificate":
      return `CLEARANCE CERTIFICATE\n\nThis is to certify that ${fullNameWithSalutation}, holding the position of ${position}, has been officially cleared of all accountabilities with Callbox Davao as of ${formattedEnd}.\n\nIssued for: ${purpose || 'whatever legal purpose it may serve'}\n\n${issuedLine}`;
    case "Recommendation Letter":
      return `LETTER OF RECOMMENDATION\n\nTo Whom It May Concern,\n\nIt is my pleasure to recommend ${fullNameWithSalutation} for any professional opportunity. During their tenure as ${position} at Callbox Davao ${period}, ${salutationAndLastName} served as a valued member of our organization.\n\n${issuedLine}`;
    default:
      return `Document for ${fullNameWithSalutation}\nPosition: ${position}\nDepartment: ${department}\nStatus: ${employmentStatus}\nPurpose: ${purpose}\n\n${issuedLine}`;
  }
}