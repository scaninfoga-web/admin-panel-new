import { Loader } from "@/components/custom/custom-loader";
import UserDetails from "@/components/pages/users/UserDetails";
import { Suspense } from "react";

export default function Page({ params }: { params: { user_id: string } }) {
  return (
    <Suspense fallback={<Loader />}>
      <UserDetails userId={params.user_id} />
    </Suspense>
  );
}
