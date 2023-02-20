import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import fetch from "node-fetch";
// import { updateAnalyticsOnOrderSuccess } from "../lib/helpers/analytics/update";
// import { getToday } from "../lib/helpers/date";
// import { createDocument, getDocument, getFunnelDocument, updateDocument } from "../lib/helpers/firestore";
// import { Customer } from "../lib/types/customers";
// import { Order } from "../lib/types/draft_rders";
import { Fulfillment } from "../lib/types/fulfillments";
import { shipEngineAPIRequests } from "../lib/helpers/requests";
import { Address } from "../lib/types/addresses";
import { updateDocument } from "../lib/helpers/firestore";
import { writeFileSync } from "fs";
// import { SubscriptionAgreement} from "../lib/types/products";
// import { Fulfillment } from "../lib/types/fulfillments";
import * as fs from "fs"


import { exec } from "child_process";
import * as util from "util";
export const execAsync = util.promisify(exec);

export default async function customPrint(
    file: string,
    printer?: string,
    options?: string[]
  ): Promise<{ stdout: string; stderr: string; [any: string]: any}> {
    if (!file) throw "No file specified";
    if (!fs.existsSync(file)) throw "No such file";
    
    const args = [];
    if (printer) {
      args.push(`-d "${printer}"`);
    }
    if (options) {
      if (!Array.isArray(options))
        throw "options should be an array";
      options.forEach((arg) => args.push(arg));
    }
    args.push('"' + file +'"');
    console.log("🖨️ -> ");
    console.log(`lp ${args.join(" ")}`);
  
    return execAsync(`lp ${args.join(" ")}`);
}

export const fulfillmentCreated = functions.firestore
.document('merchants/{merhcantId}/fulfillments/{fulfillmentId}')
.onCreate(async (snap) => {

    // ? Dynamic how? 
    const MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";

    // Get & cast document
    const fulfillment = snap.data() as Fulfillment;

    const {
        customer,
        id,
    } = fulfillment;
    functions.logger.debug(" ====> FULFILLMENT ORDER CREATED TRIGGER");
    functions.logger.debug(fulfillment);

    let label_url = "";

    let shipping_address = {} as Address;

    if (customer.addresses && customer.addresses.length > 0) {
        customer.addresses.map(address => {
            if (address.type == "BOTH" || address.type == 'SHIPPING') {
                shipping_address = address;
            }
        })
    }

    try {
        // TODO: Calculate SUM(wt) && unit
        // TODO: Case switch based dimentions || "se-3347170"
        const response = await shipEngineAPIRequests("/labels", "POST", {
            shipment: {
                carrier_id: "se-3347170",
                service_code: "usps_priority_mail_express",
                ship_to: {
                    name: (customer?.first_name ? customer?.first_name : "") + " " + (customer?.last_name ? customer?.last_name : ""),
                    address_line1: shipping_address?.line1 ? shipping_address?.line1 : "",
                    city_locality: shipping_address?.city ? shipping_address?.city : "",
                    state_province: shipping_address?.state ? shipping_address?.state : "",
                    postal_code: shipping_address?.zip ? shipping_address?.zip : "",
                    country_code: shipping_address?.country ? shipping_address?.country : "US",
                    address_residential_indicator: "yes"
                },
                ship_from: {
                    name: "Bigly Bear",
                    company_name: "Going Bigly, Inc",
                    phone: "419-555-5555",
                    address_line1: "3049 North College Avenue",
                    city_locality: "Fayetville",
                    state_province: "AR",
                    postal_code: "72704",
                    country_code: "US",
                    address_residential_indicator: "no"
                },
                is_return_label: true,
                test_label: false,
                validate_address: "no_validation",
                label_download_type: "url",
                label_format: "png",
                display_scheme: "label",
                label_layout: "4x6",
                packages: [
                    {
                        weight: {
                            value: 20,
                            unit: "ounce"
                        },
                        dimensions: {
                            height: 6,
                            width: 12,
                            length: 24,
                            unit: "inch"
                        }
                    }
                ]
            }
        });
        functions.logger.debug(" ====> LABEL CREATOR RESPONSE");
        functions.logger.debug(response);
        functions.logger.debug(response?.data?.label_download);

        if (response?.data?.label_download) {
            label_url = response?.data?.label_download?.png
        }
        
    } catch (e) {
        
    }

    try {
        const response = await updateDocument(MERCHANT_UUID, "fulfillments", (id as string), {
            ...fulfillment,
            updated_at: admin?.firestore?.Timestamp?.now(),
            label_url: label_url !== "" ? label_url : "",
            status: label_url !== "" ? true : false,
        })

        functions.logger.debug(" ====> FULFILLMENT UPDATED");
        functions.logger.debug(response);
    } catch (e) {
        
    }

    if (label_url !== "") {

        const response = await fetch(label_url);
        const buffer = await response.arrayBuffer();
        const file = Buffer.from(buffer);


        const filePath = "./label_file.png";
        writeFileSync(filePath, file);
        functions.logger.debug(" ====> WROTE FILE  🎉 ");
        
        const printes_response = await customPrint(filePath, "Printer_ThermalPrinter", ["-n 1", "-o media=4x6in ", "-o orientation-requested=1", "-o fit-to-page "]);
        functions.logger.debug(" ====> FULFILLMENT PRINTED.");
        console.log(printes_response);
    }
});
