import { Customer, } from "../../types/customers";
import { createDocument, simlpeSearch, updateDocument } from "../firestore";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createSripeClientSecret, createStripeCustomer } from "../stripe";
import { createSquareCustomer } from "../square";
// import { Analytics } from "../../types/analytics";

export const createCustomerPayment = async (
    merchant_uuid: string,
    funnel_uuid: string,
    data: Customer,
    high_risk: boolean
) => {
    let status = 500, text = "[ERROR]: Likley internal issue 🤡. ";

    // logic vars
    let cus_uuid = "";
    let customers: Customer[] = [];
    let update_data: Customer = data;

    // Check email first if exists else create new 👇🏻👇🏻👇🏻
    try {
        if ( data.email != "") {
            functions.logger.debug(" ===> [EMAIL]");
            // Search the collection for existing email 
            const cusList = await simlpeSearch(merchant_uuid, "customers", "email", data.email);
            
            if (cusList.status < 300 && cusList.data.list) {
                cusList.data.list?.forEach((c) => {
                    const customer = c.data() as Customer;
                    customers = [
                        ...customers,
                        customer
                    ]
                });
                cus_uuid = customers[0].id;
                update_data = customers[0];
                text = "[SUCCESS] Customer already exists";
                status = 200;
            }
        }
        functions.logger.debug(" ===> [CUSTOMER CHECKED] - " + cus_uuid);

    } catch (e) {
        functions.logger.error("46: " + text + " - Checking emails" )
    }


    // Data to push to the primary DB
    update_data = {
        ...data,
        created_at: admin.firestore.Timestamp.now(),
        updated_at: admin.firestore.Timestamp.now(),
        funnel_uuid: funnel_uuid ? funnel_uuid : "",
        merchant_uuid: merchant_uuid ? merchant_uuid : ""
    }

    try {
        if (high_risk && high_risk) {
            functions.logger.debug(" ===> [HIGH_RISK]");

            const square = await createSquareCustomer({
                note: "CUSTOM FUNNEL",
                given_name: update_data?.first_name,
                family_name: update_data?.first_name,
                email_address: update_data?.email
            });
            functions.logger.debug(" ===> [SQUARE]");

            // Data to push to the primary DB
            update_data = {
                ...update_data,
                square: {
                    ...(update_data?.square ? update_data?.square : {}),
                    UUID: square?.customer && square?.customer?.id ? square?.customer.id  : "",
                    PI_UUID: "", 
                    CARD_UUID: "", 
                    CLIENT_ID: "", 
                },
            }
            functions.logger.debug(" ===> [SQAURE UDPATE]");

            text = "[SUCCESS] Square Created";
            status = 201;
        } else {
            functions.logger.debug(" ===> ![HIGH_RISK]");
            // Stripe customer created 
            if (customers.length === 0 && cus_uuid === "") {
                functions.logger.debug(" ===> [CREATE] - Stripe Customer 🕺🏼");
                const stripe = await createStripeCustomer(update_data?.email, update_data?.first_name, update_data?.last_name);
            
                // OK result & New Document
                if (stripe?.status < 300) {
                    // Data to push to the primary DB
                    update_data = {
                        ...update_data,
                        stripe: {
                            ...update_data.stripe,
                            UUID: stripe?.data?.stripe_uuid as string,
                            CLIENT_ID: stripe?.data?.stripe_client_secret  as string, 
                        } as any
                    }
                }
            } else {
                functions.logger.debug(" ===> [CREATE] - Stripe Client Secret 🔑");
                const stripe = await createSripeClientSecret(update_data.stripe?.UUID as string);
            
                // OK result & New Document
                if (stripe?.status < 300) {
                    // Data to push to the primary DB
                    update_data = {
                        ...update_data,
                        stripe: {
                            ...update_data.stripe,
                            CLIENT_ID: stripe?.data as string, 
                        } as any
                    }
                }
            }
            functions.logger.debug(" ===> [STRIPE UDPATE]");

            text = "[SUCCESS] Stripe Created";
            status = 201;
        }

    } catch (e) {
        functions.logger.info("109: " + text + " - Generating payment keys 🚨 ");
    }

    try {
        if (customers.length !== 0 && cus_uuid !== "")  {
            functions.logger.debug(" ===> [CUSTOMER EXISTS] 😮‍💨");

            // push to primary DB --> Creating new customer document
            const response = await updateDocument(merchant_uuid, "customers", cus_uuid, update_data)
            functions.logger.debug(" ===> [UPDATE RESPONSE] - Customer");

            if (response.status < 300 && response.data) {
                const c = response.data as Customer
                update_data = {
                    ...update_data,
                    id: c.id
                };
            }

            // Responses back to the client
            text = "[SUCCESS] Stripe Created - Updated document";
            status = 201;
        } else {
            functions.logger.debug(" ===> [CUSTOMER CREATE] 😮");
            const response = await createDocument(merchant_uuid, "customers", "cus_", update_data);
            functions.logger.debug(" ====> [CREATE RESPONSE] - Customer");
            functions.logger.debug(response);

            if (response.status < 300 && response.data) {
                update_data = {
                    ...update_data,
                    id: response.data.id
                };
            }
        }

    } catch (e) {
        functions.logger.info("160: " + text + " - Saving in primary DB ⏎. ");
        
    }

    return {
        status: status,
        text: text,
        customers: {
            cus_uuid: cus_uuid,
            ...update_data
        }
    }

}
