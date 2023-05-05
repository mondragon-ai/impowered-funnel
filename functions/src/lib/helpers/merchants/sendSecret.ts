import { Merchant } from "../../types/merchants";
import { getMerchant } from "../firestore";
import { createSripeClientSecret } from "../stripe";

interface MerchantSecret {
    secret: string;
    status: number;
}
/**
 * Send Merchant Secret
 * @param merchant_uuid - UUID of the merchant
 * @returns Promise with object containing secret and status code
 */
export const sendMerchantSecret = async (
    merchant_uuid: string,
): Promise<MerchantSecret> => {
    const merchants = [] as Merchant[];
    let status = 400;
  
    if (merchant_uuid !== "") {
      const response = await getMerchant(merchant_uuid);
      if (response.status < 300 && response.data) {
        merchants.push(response.data as Merchant);
        status = 201;
      }
    }
  
    const stripeSecret = merchants[0]?.stripe?.secret ?? "";
    const stripeUUID = merchants[0]?.stripe?.UUID ?? "";
  
    let secret = stripeSecret;
  
    if (stripeSecret === "") {
      const new_secret = await createSripeClientSecret(stripeUUID);
  
      if (new_secret.data !== "") {
        secret = new_secret.data;
      }
    }
  
    return {secret, status}
}