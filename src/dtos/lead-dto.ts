import { Lead } from "../entities/Lead";
import { decryptPersonalData } from "../utils/encryption";

function decryptField(
  encryptedBuffer: Buffer | null,
  keyVersion: number,
): string | null {
  return encryptedBuffer
    ? decryptPersonalData(encryptedBuffer, keyVersion)
    : null;
}

// Serializes a Lead for API responses: decrypts the *Enc PII fields for
// authorized staff and NEVER exposes the raw *Enc/*Hash buffers, encKeyVersion,
// or soft-delete/DPDP-internal columns.
export function toLeadDto(lead: Lead) {
  const keyVersion = lead.encKeyVersion;
  return {
    id: lead.id,
    publicId: lead.publicId,
    name: lead.name,
    phone: decryptField(lead.phoneEnc, keyVersion),
    altPhone: decryptField(lead.altPhoneEnc, keyVersion),
    whatsappNumber: decryptField(lead.whatsappNumberEnc, keyVersion),
    email: decryptField(lead.emailEnc, keyVersion),
    city: lead.city,
    state: lead.state,
    country: lead.country,
    area: lead.area,
    pincode: lead.pincode,
    address: decryptField(lead.addressEnc, keyVersion),
    timezone: lead.timezone,
    treatment: lead.treatment,
    dentalProblem: decryptField(lead.dentalProblemEnc, keyVersion),
    message: decryptField(lead.messageEnc, keyVersion),
    budget: lead.budget,
    preferredDate: lead.preferredDate,
    preferredTime: lead.preferredTime,
    channel: lead.channel,
    source: lead.source,
    campaign: lead.campaign,
    adId: lead.adId,
    adSetId: lead.adSetId,
    adName: lead.adName,
    landingPage: lead.landingPage,
    formName: lead.formName,
    utmMedium: lead.utmMedium,
    ownerUserId: lead.ownerUserId,
    assignedAt: lead.assignedAt,
    stage: lead.stage,
    isCalled: lead.isCalled,
    isWhatsappCalled: lead.isWhatsappCalled,
    isWhatsappMessaged: lead.isWhatsappMessaged,
    isEmailed: lead.isEmailed,
    contactMade: lead.contactMade,
    doNotCall: lead.doNotCall,
    doNotSms: lead.doNotSms,
    doNotEmail: lead.doNotEmail,
    doNotWhatsapp: lead.doNotWhatsapp,
    isInternational: lead.isInternational,
    leadScore: lead.leadScore,
    contactCount: lead.contactCount,
    reEnquiryCount: lead.reEnquiryCount,
    missedCallCount: lead.missedCallCount,
    consultationDate: lead.consultationDate,
    consultationBranchId: lead.consultationBranchId,
    followUpDate: lead.followUpDate,
    isTreatmentBooked: lead.isTreatmentBooked,
    firstActivityAt: lead.firstActivityAt,
    lastActivityAt: lead.lastActivityAt,
    lastContactedAt: lead.lastContactedAt,
    lastCallRemark: decryptField(lead.lastCallRemarkEnc, keyVersion),
    lastVisitAt: lead.lastVisitAt,
    isPatient: lead.isPatient,
    patientId: lead.patientId,
    isDuplicate: lead.isDuplicate,
    duplicateOfLeadId: lead.duplicateOfLeadId,
    qualityScore: lead.qualityScore,
    tags: lead.tags,
    reEnquiryStatus: lead.reEnquiryStatus,
    createdByUserId: lead.createdByUserId,
    updatedByUserId: lead.updatedByUserId,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };
}

export type LeadDto = ReturnType<typeof toLeadDto>;
