'use client';

import CustomTabs from '@/components/custom/custom-tab';
import ExcelDataS3 from '@/components/main/ExcelDataS3';
import BankStatementList from '@/components/main/BankStatementList';

export default function S3Page() {
  const tabs = [
    {
      value: 'excel',
      label: 'Excel',
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
      <CustomTabs tabs={tabs} defaultValue="excel" />
    </div>
  );
}
