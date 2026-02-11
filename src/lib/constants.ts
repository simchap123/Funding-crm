import type { LeadStage, LeadSource } from "@/lib/db/schema/contacts";
import type { LoanStage, LoanType } from "@/lib/db/schema/loans";
import type { DocumentStatus } from "@/lib/db/schema/documents";

export const STAGE_CONFIG: Record<
  LeadStage,
  { label: string; color: string; bgColor: string }
> = {
  new: { label: "New", color: "text-blue-700", bgColor: "bg-blue-100" },
  contacted: {
    label: "Contacted",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  qualified: {
    label: "Qualified",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  proposal: {
    label: "Proposal",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  negotiation: {
    label: "Negotiation",
    color: "text-pink-700",
    bgColor: "bg-pink-100",
  },
  won: { label: "Won", color: "text-green-700", bgColor: "bg-green-100" },
  lost: { label: "Lost", color: "text-red-700", bgColor: "bg-red-100" },
};

export const SOURCE_LABELS: Record<LeadSource, string> = {
  website: "Website",
  referral: "Referral",
  social_media: "Social Media",
  cold_call: "Cold Call",
  email_campaign: "Email Campaign",
  advertisement: "Advertisement",
  trade_show: "Trade Show",
  other: "Other",
};

export const ITEMS_PER_PAGE = 10;

export const LOAN_STAGE_CONFIG: Record<
  LoanStage,
  { label: string; color: string; bgColor: string }
> = {
  application: {
    label: "Application",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
  },
  processing: {
    label: "Processing",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  underwriting: {
    label: "Underwriting",
    color: "text-purple-700",
    bgColor: "bg-purple-100",
  },
  conditional_approval: {
    label: "Conditional",
    color: "text-indigo-700",
    bgColor: "bg-indigo-100",
  },
  approved: {
    label: "Approved",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100",
  },
  closing: {
    label: "Closing",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  funded: {
    label: "Funded",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  denied: { label: "Denied", color: "text-red-700", bgColor: "bg-red-100" },
  withdrawn: {
    label: "Withdrawn",
    color: "text-gray-700",
    bgColor: "bg-gray-100",
  },
};

export const LOAN_TYPE_LABELS: Record<LoanType, string> = {
  conventional: "Conventional",
  fha: "FHA",
  va: "VA",
  usda: "USDA",
  jumbo: "Jumbo",
  heloc: "HELOC",
  refinance: "Refinance",
  construction: "Construction",
  commercial: "Commercial",
  personal: "Personal",
  auto: "Auto",
  other: "Other",
};

export const DOCUMENT_STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; color: string; bgColor: string }
> = {
  draft: { label: "Draft", color: "text-gray-700", bgColor: "bg-gray-100" },
  sent: { label: "Sent", color: "text-blue-700", bgColor: "bg-blue-100" },
  viewed: {
    label: "Viewed",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100",
  },
  partially_signed: {
    label: "Partially Signed",
    color: "text-orange-700",
    bgColor: "bg-orange-100",
  },
  completed: {
    label: "Completed",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
  declined: {
    label: "Declined",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  expired: {
    label: "Expired",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
  voided: {
    label: "Voided",
    color: "text-gray-500",
    bgColor: "bg-gray-100",
  },
};
