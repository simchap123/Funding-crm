"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitToLendersModal } from "./submit-to-lenders-modal";

type Lender = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  isActive: boolean;
};

type EmailAccount = {
  id: string;
  email: string;
  name: string | null;
};

type Loan = {
  id: string;
  loanType: string;
  amount: number | null;
  propertyAddress: string | null;
  propertyCity: string | null;
  propertyState: string | null;
  creditScore: number | null;
  debtToIncomeRatio: number | null;
  annualIncome: number | null;
  estimatedValue: number | null;
  downPayment: number | null;
  contact: {
    firstName: string;
    lastName: string;
  };
};

interface SubmitToLendersButtonProps {
  loan: Loan;
  lenders: Lender[];
  accounts: EmailAccount[];
}

export function SubmitToLendersButton({
  loan,
  lenders,
  accounts,
}: SubmitToLendersButtonProps) {
  const [open, setOpen] = useState(false);

  if (accounts.length === 0) return null;

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <Send className="mr-2 h-4 w-4" />
        Submit to Lenders
      </Button>
      <SubmitToLendersModal
        open={open}
        onOpenChange={setOpen}
        loan={loan}
        lenders={lenders}
        accounts={accounts}
      />
    </>
  );
}
