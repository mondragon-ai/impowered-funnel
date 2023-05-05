import * as functions from "firebase-functions";
import { AppMeta } from "../../types/merchants";
// import { getMerchant, searchMerchants } from "../firestore";

export const subscribeApp = async (
    micro_service: string,
    merchant_uuid: string,
) => {

    let text = ' 🎉 [SUCCESS]: Apps subscribed',
    status = 200,
    result: AppMeta[] = [],
    size = 0;


    switch (micro_service) {
        case "PLATFROM": {
            console.log("micro_service: ", micro_service);
            console.log("merchant_uuid: ", merchant_uuid);
            
            break;
        }
        case "FUNNEL": {
            console.log("micro_service: ", micro_service);
            console.log("merchant_uuid: ", merchant_uuid);
            
            break;
        }
        case "BLOG": {
            console.log("micro_service: ", micro_service);
            console.log("merchant_uuid: ", merchant_uuid);
            
            break;
        }
        case "SUBSCRIPTION": {
            console.log("micro_service: ", micro_service);
            console.log("merchant_uuid: ", merchant_uuid);
            
            break;
        }
        case "MEMBERSHIP": {
            console.log("micro_service: ", micro_service);
            console.log("merchant_uuid: ", merchant_uuid);
            
            break;
        }
        case "SUBSCRIBE": {
            console.log("micro_service: ", micro_service);
            console.log("merchant_uuid: ", merchant_uuid);
            
            break;
        }
        default: {
            console.log("micro_service: ", micro_service);
            console.log("merchant_uuid: ", merchant_uuid);
            
            break;
        }
    }

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