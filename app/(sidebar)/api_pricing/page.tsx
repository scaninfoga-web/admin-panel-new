import { Loader } from "@/components/custom/custom-loader";
import API_Pricing from "@/components/pages/api_pricing/API_Pricing";
import { Suspense } from "react";

export default function Page() {
  return (
    <Suspense fallback={<Loader />}>
      <API_Pricing />
    </Suspense>
  );
}
