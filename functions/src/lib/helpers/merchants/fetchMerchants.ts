import * as functions from "firebase-functions";
import { Merchant } from "../../types/merchants";
import { getMerchant, searchMerchants } from "../firestore";

export const fetchMerchant = async (
    merchant_shop: string,
    merchant_uuid: string,
) => {

    let text = ' 🎉 [SUCCESS]: Merchant(s) fetched',
    status = 200,
    result: Merchant[] = [],
    size = 0;

    console.log("merchant_shop: ", merchant_shop);
    console.log("merchant_uuid: ", merchant_uuid);

    try {
        if (merchant_shop !== '') {
            // Get all products if product_uuid is not provided
            const response = await searchMerchants("shop", merchant_shop.toLocaleLowerCase());
            console.log(response)
        
            if (response.status < 300 && response.data) {
                const search_result = response.data.list;

                search_result?.forEach(v => {
                    if (v.exists) {
                        const merchant = v.data();
                        console.log(merchant);
                        result?.push(merchant as Merchant);
                    }
                })
                size = response.data?.list?.size || 0;
            };
            if (response.status == 420) {
                // Return the response
                status = 201;
                text = response.text;
                size = 0;
                result = [];
            }
        } 
        
        if (merchant_shop === '' && merchant_uuid !== "") {
            // Get a single product if product_uuid is provided
            const response = await getMerchant(merchant_uuid);
        
            if (response.status < 300 && response.data !== undefined) {
                result = [response.data as Merchant];
                status = 201;
            }
        }
    } catch (error) {
        // Log the error and return a server error response
        status = 500;
        text = " 🚨 [ERROR]: Could not fetch merchant" ;
        functions.logger.error(text);
        result = [];
    }

    return {status,text,result, size}
}