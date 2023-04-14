import { Merchant } from "../../types/merchants";
import { getMerchant } from "../firestore";
import { createSripeClientSecret } from "../stripe";

export const sendMerchantSecret = async (
    merchant_uuid: string,
): Promise<{secret: string, status: number}> => {

    console.log(merchant_uuid);

    let merchants = [] as Merchant[];
    let status = 400;

    if (merchant_uuid !== "") {
        // Get a single product if product_uuid is provided
        const response = await getMerchant(merchant_uuid);
    
        if (response.status < 300 && response.data !== undefined) {
            merchants = [response.data as Merchant];
            status = 201;
        }
    }

    let secret = "";
    let STRIPE_UUID = "";

    if (merchants[0] && merchants[0].stripe) {
        secret = merchants[0].stripe.secret;
        STRIPE_UUID =  merchants[0].stripe.UUID;
    }


    if (secret === "") {

        const new_secret = await createSripeClientSecret(STRIPE_UUID);

        if (new_secret.data !== "") {
            secret = new_secret.data;
        }

    }
    return {secret, status}
}