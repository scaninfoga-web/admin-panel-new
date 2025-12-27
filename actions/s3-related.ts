import { post } from "@/lib/api";

export async function getSignedUrlS3(s3_key: string): Promise<string | null> {
  try {
    const res = await post("/api/upload/s3/signed-url", {
      s3_key,
    });
    console.log("res", res);
    if (res?.responseStatus && res?.responseData?.signed_url) {
      return res?.responseData?.signed_url;
    }
    return null;
  } catch (error) {
    return null;
  }
}
