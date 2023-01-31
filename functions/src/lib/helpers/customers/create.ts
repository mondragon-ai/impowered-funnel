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
    let status = 500, text = " 🚨 [ERROR]: Likley internal issue 🤡. ";

    // logic vars
    let cus_uuid = "";
    let customers: Customer[] = [];
    let update_data: Customer = data;

    // Check email first if exists else create new 👇🏻👇🏻👇🏻
    try {
        if ( data.email != "") {
            functions.logger.debug(" ❷ [SEARCHING] -  Checking if Exists with Email");
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
                update_data = {
                    ...customers[0]
                };
                text = " 🎉 [SUCCESS] Customer already exists";
                status = 200;
            }
        }
        functions.logger.debug((" ❷ [CUSTOMER CHECKED] - ") + (cus_uuid ? cus_uuid  : "DOESNT EXIST."));

    } catch (e) {
        functions.logger.error("48:  ❷ " + text + " - Checking emails" )
    }

    // Data to push to the primary DB
    update_data = {
        ...data,
        ...update_data,
        draft_orders: update_data.draft_orders ?  update_data.draft_orders : "",
        created_at: admin.firestore.Timestamp.now(),
        updated_at: admin.firestore.Timestamp.now(),
        funnel_uuid: funnel_uuid ? funnel_uuid : "",
        merchant_uuid: merchant_uuid ? merchant_uuid : ""
    }

    if (!data.email || data.email === "") {
        return {
            status: 422,
            text: " 🚨 [ERROR]: Missing email. ",
            customers: {
                cus_uuid: "",
                ...update_data
            }
        }
    }

    try {
        if (high_risk) {
            functions.logger.debug(" ❷ [HIGH_RISK] -  Creating Sqaure && Returning UUID");
            if (!customers[0].square || cus_uuid === "") {

                const square = await createSquareCustomer({
                    note: "CUSTOM FUNNEL",
                    given_name: update_data?.first_name,
                    family_name: update_data?.first_name,
                    email_address: update_data?.email
                });
                functions.logger.debug(" ❷ [SQUARE] - Customer Created 👍🏻");
    
                // Data to push to the primary DB
                update_data = {
                    ...update_data,
                    square: {
                        ...(update_data?.square ? update_data?.square : {}),
                        UUID: square?.customer && square?.customer?.id ? square?.customer.id  : "",
                        PM: ""
                    },
                }
                text = " 🎉 [SUCCESS] Square Created";
                status = 201;
            } else {

            }
        } else {
            functions.logger.debug(" ❷ ![HIGH_RISK]- Stripe Data && Returning UUID");
            // Stripe customer created 
            if (customers.length === 0 && cus_uuid === "") {
                functions.logger.debug(" ❷ [STRIPE] -  Create Stripe Customer 🕺🏼");
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
                functions.logger.debug(" ❷ [PRE_FLIGHT] -> ");
                functions.logger.debug(update_data);
                const stripe = await createSripeClientSecret(update_data.stripe?.UUID as string);
            
                functions.logger.debug(" ❷ [STRIPE] - Created Stripe Client Secret 🔑");
                functions.logger.debug(stripe);
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

            text = " 🎉 [SUCCESS] Stripe Created";
            status = 201;
        }

    } catch (e) {
        functions.logger.info("109: " + text + " - Generating payment keys 🚨 ");
    }

    try {
        if (customers.length !== 0 && cus_uuid !== "")  {
            functions.logger.debug(" ❷ [CUSTOMER] - Exists - ONLY UPDATE 👍🏻");

            // push to primary DB --> Creating new customer document
            const response = await updateDocument(merchant_uuid, "customers", cus_uuid, update_data)
            functions.logger.debug(" ❷ [CUSTOMER] - Updated");

            if (response.status < 300 && response.data) {
                const c = response.data as Customer
                update_data = {
                    ...update_data,
                    id: c.id
                };
            }

            // Responses back to the client
            text = " 🎉 [SUCCESS] Stripe Created - Updated document";
            status = 201;
        } else {
            functions.logger.debug(" ❷ [CUSTOMER] - Creaete New Customer 🆕");
            const response = await createDocument(merchant_uuid, "customers", "cus_", update_data);
            functions.logger.debug(" ❷ [CUSTOMER] - Created Response");
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
