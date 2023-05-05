import * as functions from "firebase-functions";
import { AppMeta } from "../../types/merchants";
// import { getMerchant, searchMerchants } from "../firestore";

export const fetchApps = async (
    micro_service: string,
    merchant_uuid: string,
) => {

    let text = ' 🎉 [SUCCESS]: Apps(s) fetched',
    status = 200,
    result: AppMeta[] = [],
    size = 0;

    console.log("micro_service: ", micro_service);
    console.log("merchant_uuid: ", merchant_uuid);

    try {
    } catch (error) {
        // Log the error and return a server error response
        status = 500;
        text = " 🚨 [ERROR]: Could not fetch merchant" ;
        functions.logger.error(text);
        result = [];
    }

    return {status,text,result, size}
}