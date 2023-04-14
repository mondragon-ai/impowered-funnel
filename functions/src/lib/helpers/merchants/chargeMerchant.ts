import { Merchant } from "../../types/merchants";
import { updateMerchant } from "../firestore";
import { chargeMerchant } from "../stripe";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

export const chargeMerchantStripe = async (
    merchant_uuid: string,
    amount: number
) => {
    console.log(merchant_uuid);

    let status = 400;

    // Charge the Merchant
    const charge_response = await chargeMerchant(merchant_uuid, amount);
    
    let STRIPE_PI_ID = "";

    console.log("RESPONSE FROM CHARGE")
    console.log(charge_response)

    if (charge_response.STRIPE_PI !== "") {
        status = 200;
        STRIPE_PI_ID = charge_response.STRIPE_PI;

        const payments = charge_response.merchant?.payment_history ? charge_response.merchant?.payment_history : [];
        const email = charge_response.merchant?.owner ? charge_response.merchant?.owner.email : "";

        await updateMerchant(merchant_uuid, {
            ...charge_response.merchant,
            stripe: {
                ...charge_response.merchant?.stripe,
                PM: charge_response.STRIPE_PM,
                secret: ""
            },
            payment_history: [
                ...payments,
                {
                    date: admin.firestore.Timestamp.now(),
                    amount: amount,
                    email:  email,
                    id: "txt_" + crypto.randomBytes(10).toString('hex').substring(0,10)
                    
                }
            ]
        } as Merchant)
    } else {
        await updateMerchant(merchant_uuid, {
            ...charge_response.merchant,
            stripe: {
                ...charge_response.merchant?.stripe,
                secret: ""
            }
        } as Merchant)
        status = 200;
    }

    return {STRIPE_PI_ID, status};
}