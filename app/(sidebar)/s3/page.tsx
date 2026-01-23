"use client";

import CustomTabs from "@/components/custom/custom-tab";
import AnnualIncomeList from "@/components/main/AnnualIncomeStatement/AnnualIncomeList";
import BankStatementList from "@/components/main/BankStatementPdf/BankStatementList";
import CdrExcelDataList from "@/components/main/CdrExcelData/CdrExcelDataList";

export default function S3Page() {
  const tabs = [
    {
      value: "cdrexceldata",
      label: "CDR Excel Data",
      component: <CdrExcelDataList />,
    },
    {
      value: "pdf",
      label: "PDF Bank Statement",
      component: <BankStatementList />,
    },
    {
      value: "annualincome",
      label: "Annual Income (AI) Statement",
      component: <AnnualIncomeList />,
    },
  ];

  return (
    <div className="p-6">
      <CustomTabs tabs={tabs} defaultValue="cdrexceldata" />
    </div>
  );
}
