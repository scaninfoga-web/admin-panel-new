import ExcelDataS3 from '@/components/main/ExcelDataS3';
import BankPdfS3 from '@/components/main/BankPdfS3';

export default function S3Page() {
  return (
    <div className="p-6">
      <div className="flex flex-wrap gap-10">
        <ExcelDataS3 />
        <BankPdfS3 />
      </div>
    </div>
  );
}
