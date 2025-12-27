'use client';

import CustomTabs from '@/components/custom/custom-tab';
import BankStatementList from '@/components/main/BankStatementPdf/BankStatementList';
import ExcelDataS3 from '@/components/main/ExcelDataS3';

export default function S3Page() {
  const tabs = [
    {
      value: 'cdrexceldata',
      label: 'CDR Excel Data',
      component: <ExcelDataS3 />,
    },
    {
      value: 'pdf',
      label: 'PDF Bank Statement',
      component: <BankStatementList />,
    },
  ];

  return (
    <div className="p-6">
      <CustomTabs tabs={tabs} defaultValue="cdrexceldata" />
    </div>
  );
}
