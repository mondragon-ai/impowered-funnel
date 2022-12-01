import { Customer, NewSession, } from "../../types/customers";
import { createDocument, simlpeSearch, updateDocument } from "../firestore";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { createStripeCustomer } from "../stripe";
import { createSquareCustomer } from "../square";
// import { Analytics } from "../../types/analytics";

export const createCustomer = async (
    MERCHAND_UUID: string,
    data: NewSession,
) => {
    let status = 500, text = "ERROR: Likley internal issue 🤡. ";

    // logic vars=
    let cus_uuid = "";
    let customers: Customer[] = [];

    // Check email first if exists else create new 👇🏻👇🏻👇🏻
    try {

        if ( data.email != "") {
            // Search the collection for existing email 
            const cusList = await simlpeSearch(MERCHAND_UUID, "customers", "email", data.email);
            
            if (cusList.status < 300) {
                cusList.data.list?.forEach((c) => {
                    const customer = c.data() as Customer;
                    customers = [
                        ...customers,
                        customer
                    ]
                });
                cus_uuid = customers[0].id;
            }
        }

    } catch (e) {
        functions.logger.error("60: " + text + " - Checking emails" )
    }

    try {

        if (customers.length == 0 && cus_uuid == "") {
            // Stripe customer created 
            const stripe = await createStripeCustomer();

            const sqaure = await createSquareCustomer({
                note: "CUSTOM FUNNEL",
                company_name: "IMPOWERED_FUNNEL"
            });
        
            // OK result & New Document
            if (stripe?.status < 300) {
                // Data to push to the primary DB
                data = {
                    ...data,
                    stripe: {
                        UUID: stripe?.data?.stripe_uuid,
                        PI_UUID: stripe?.data?.stripe_pm, 
                        CLIENT_ID: stripe?.data?.stripe_client_secret, 
                    },
                    square: {
                        UUID: sqaure?.data.id ? sqaure?.data.id  : "",
                        PI_UUID: "", 
                        CARD_UUID: "", 
                        CLIENT_ID: "", 
                    },
                    created_at: admin.firestore.Timestamp.now(),
                    updated_at: admin.firestore.Timestamp.now(),
                }

                // push to primary DB --> Creating new customer document
                const result = await createDocument(MERCHAND_UUID, "customers", "cus_", data)

                // Responses back to the client
                text = result.text + " " + stripe.text;
                status = stripe.status;

                if (result?.data?.id) {
                    cus_uuid = result.data.id;
                }
            }

        } else {
            // Stripe customer created 
            const stripe = await createStripeCustomer();

            const sqaure = await createSquareCustomer({
                note: "CUSTOM FUNNEL",
                company_name: "IMPOWERED_FUNNEL"
            });
        
            // OK result & New Document
            if (stripe?.status < 300) {

                // Data to push to the primary DB
                data = {
                    ...data,
                    stripe: {
                        UUID: stripe?.data?.stripe_uuid,
                        PI_UUID: stripe?.data?.stripe_pm, 
                        CLIENT_ID: stripe?.data?.stripe_client_secret, 
                    },
                    square: {
                        UUID: sqaure?.data.id ? sqaure?.data.id  : "",
                        PI_UUID: "", 
                        CARD_UUID: "", 
                        CLIENT_ID: "", 
                    },
                    updated_at: admin.firestore.Timestamp.now(),
                }

                // push to primary DB --> Creating new customer document
                const result = await updateDocument(MERCHAND_UUID, "customers", cus_uuid, data);
    
                // Responses back to the client
                text = result.text + " " + stripe.text;
                status = stripe.status
            }
        }
        text = text + " - Saving in primary DB. ";
    } catch {
        functions.logger.info("66: " + text + " - Saving in primary DB. ")
    }


    return {
        status: status,
        text: text,
        data: {
            id: cus_uuid,
            ...data
        }
    }

}
