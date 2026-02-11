"use client";

import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoanStageBadge } from "./loan-stage-badge";
import { LOAN_TYPE_LABELS } from "@/lib/constants";
import type { LoanWithDetails } from "@/lib/types";
import type { LoanType } from "@/lib/db/schema/loans";
import {
  DollarSign,
  Percent,
  Calendar,
  Building2,
  User,
  MapPin,
  CreditCard,
  TrendingUp,
} from "lucide-react";

function formatCurrency(value: number | null) {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-center gap-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium truncate">{value || "-"}</p>
      </div>
    </div>
  );
}

export function LoanDetailCard({ loan }: { loan: LoanWithDetails }) {
  const ltv =
    loan.amount && loan.estimatedValue
      ? ((loan.amount / loan.estimatedValue) * 100).toFixed(1)
      : null;

  const monthlyPayment =
    loan.amount && loan.interestRate && loan.termMonths
      ? calculateMonthlyPayment(
          loan.amount,
          loan.interestRate,
          loan.termMonths
        )
      : null;

  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Loan Summary</CardTitle>
          <LoanStageBadge stage={loan.stage as any} />
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow
            icon={Building2}
            label="Loan Type"
            value={LOAN_TYPE_LABELS[loan.loanType as LoanType]}
          />
          <InfoRow
            icon={DollarSign}
            label="Loan Amount"
            value={formatCurrency(loan.amount)}
          />
          <InfoRow
            icon={Percent}
            label="Interest Rate"
            value={loan.interestRate ? `${loan.interestRate}%` : null}
          />
          <InfoRow
            icon={Calendar}
            label="Term"
            value={
              loan.termMonths ? `${loan.termMonths} months` : null
            }
          />
          {loan.loanNumber && (
            <InfoRow
              icon={CreditCard}
              label="Loan Number"
              value={loan.loanNumber}
            />
          )}
          {loan.lender && (
            <InfoRow
              icon={Building2}
              label="Lender"
              value={loan.lender}
            />
          )}
          {monthlyPayment && (
            <InfoRow
              icon={DollarSign}
              label="Est. Monthly Payment"
              value={formatCurrency(monthlyPayment)}
            />
          )}
          {ltv && (
            <InfoRow icon={TrendingUp} label="LTV Ratio" value={`${ltv}%`} />
          )}
        </CardContent>
      </Card>

      {/* Borrower Card */}
      <Card>
        <CardHeader>
          <CardTitle>Borrower</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <InfoRow
            icon={User}
            label="Name"
            value={`${loan.contact.firstName} ${loan.contact.lastName}`}
          />
          {loan.contact.email && (
            <InfoRow
              icon={User}
              label="Email"
              value={loan.contact.email}
            />
          )}
          {loan.contact.phone && (
            <InfoRow
              icon={User}
              label="Phone"
              value={loan.contact.phone}
            />
          )}
          {loan.creditScore && (
            <InfoRow
              icon={CreditCard}
              label="Credit Score"
              value={loan.creditScore}
            />
          )}
          {loan.annualIncome && (
            <InfoRow
              icon={DollarSign}
              label="Annual Income"
              value={formatCurrency(loan.annualIncome)}
            />
          )}
          {loan.debtToIncomeRatio && (
            <InfoRow
              icon={Percent}
              label="DTI Ratio"
              value={`${loan.debtToIncomeRatio}%`}
            />
          )}
        </CardContent>
      </Card>

      {/* Property Card */}
      {(loan.propertyAddress || loan.estimatedValue) && (
        <Card>
          <CardHeader>
            <CardTitle>Property</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {loan.propertyAddress && (
              <InfoRow
                icon={MapPin}
                label="Address"
                value={`${loan.propertyAddress}${
                  loan.propertyCity ? `, ${loan.propertyCity}` : ""
                }${loan.propertyState ? `, ${loan.propertyState}` : ""} ${
                  loan.propertyZip || ""
                }`}
              />
            )}
            {loan.estimatedValue && (
              <InfoRow
                icon={DollarSign}
                label="Estimated Value"
                value={formatCurrency(loan.estimatedValue)}
              />
            )}
            {loan.downPayment && (
              <InfoRow
                icon={DollarSign}
                label="Down Payment"
                value={formatCurrency(loan.downPayment)}
              />
            )}
            {loan.closingDate && (
              <InfoRow
                icon={Calendar}
                label="Closing Date"
                value={format(new Date(loan.closingDate), "MMM d, yyyy")}
              />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function calculateMonthlyPayment(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  const monthlyRate = annualRate / 100 / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1)
  );
}
