import { squareRequest } from "./requests";
import * as functions from "firebase-functions";
import * as crypto from "crypto";
import { Customer } from "../types/customers";
import { Address } from "../types/addresses";
import { handleSuccessPayment } from "./draft_orders/funnel_create";
// import { getMerchant } from "./firestore";
// import { Merchant } from "../types/merchants";

export const createSquareCustomer = async (
    new_customer: any
) => {

    let data = await squareRequest("/customers", "POST", new_customer);

    return data?.data ?  data?.data : null
}


export const handleSquareCharge = async (
    customer: Customer,
    price: number,
    product: any,
    shipping: Address | null,
    high_risk: boolean,
    bump: boolean,
) => {
  
    const {
      email,
      id: cus_uuid,
      addresses,
    } = customer
  
    const SQAURE_UUID = customer.square ? customer.square.UUID : "";
    const SQAURE_PM = customer.square ? customer.square.PM : "";
  
    functions.logger.info(" ===> [STRIPE] - Inputs 👇🏻")
    functions.logger.info(" ===> [STRIPE_UUID]: " + SQAURE_UUID);
    functions.logger.info(" ===> [EMAIL]: " + email);
    console.log(product);
    functions.logger.info(" ===> [CUS_UUID]: " + cus_uuid);
  
    if (cus_uuid == "" || email == "") {
      return ""
    }
  
    let LOCATION_ID = "";
    let SQR_PI = "";

    let p = Number(price) && Number(price) > 0 ? Number(price) : 0;

    // try {
    //     const response = await getMerchant(customer.merchant_uuid);
        
    //     if (response.status < 300 && response.data) {
    //         const Merchant = response.data as Merchant;
    //         LOCATION_ID = Merchant.sqaure.UUID;
    //         functions.logger.info(" 🪣 [DB] - Merchant Fetched");
    //     }

    // } catch (e) {
    //     functions.logger.error(" ===> 🚨 [ERROR]: " + "Fetching merchant Document");
    // }
  
    async function createIntent() {
      return new Promise( (resolve) => {
        return setTimeout(async () => {
  
          try {

            if (SQAURE_PM !== "" && SQAURE_UUID !== "") {
                const idempotencyKey = crypto.randomBytes(16).toString('hex');
        
                // * Make the initial Stripe charge based on product price
                const payment_response = await squareRequest("/payments", "POST", {
                    idempotency_key: idempotencyKey,
                    amount_money: {
                        amount: p,
                        currency: "USD"
                    },
                    source_id: SQAURE_PM,
                    autocomplete: true,
                    customer_id: SQAURE_UUID,
                    location_id: LOCATION_ID,
                    reference_id: customer.merchant_uuid
                });
                functions.logger.info(" 🏦 [SQAURE] - Response");
                functions.logger.info(payment_response)
                if (payment_response.status < 300 && payment_response.data) {
                    SQR_PI = payment_response.data.payment.id;
                }
            }
            
          } catch (e) {
              functions.logger.error(" ===> 🚨 [ERROR]: " + " - Charging customer - stripe 227");
          }
  
          return resolve(LOCATION_ID as string);
        }, 500);
      });
    }
  
    await createIntent()
  
    let address = shipping;
  
    if (address != null && SQR_PI !== "" && SQAURE_PM !== "") {
  
      if (addresses && addresses.length > 0) {
        addresses.map(addy => {
          if (addy.type === "SHIPPING" || addy.type === "BOTH") {
            address = address
          }
        })
      }
      functions.logger.info(" ✅ [PAYMENT] - Handling payment for order ");
      handleSuccessPayment(customer, product, SQR_PI, SQAURE_PM, shipping, high_risk, bump);
    } 
  
    return SQR_PI;
  }
  
  

/**
 * Helper Fn - STEP #3
 * Updates the strie customer wiht the billing&shipping wiht the same address
 * Primary DB created as well
 * @param email 
 * @param stripe_uuid 
 * @param shipping 
 * @returns 
 */
//  export const updateStripeCustomer = async (
//     name: string,
//     email: string,
//     stripe_uuid: string,
//     shipping: any
//   ) => {
//     // extract vars
//     const {line1, city, state, zip} = shipping;
  
//     try {
      
//       // Update Stripe Customer 
//       const stripeCustomer = await stripe.customers.update(
//         stripe_uuid,
//         {
//           email: email,
//           name: name,
//           shipping: {
//             name:  name,
//             address: {
//               line1: line1,
//               city: city,
//               state: state,
//               postal_code: zip,
//               country: "US"
//             }
//           },
//           address: {
//             city: city,
//             country: "US",
//             line1: line1,
//             postal_code: zip,
//             state: state
//           }
//         }
//       );
  
//       return {
//         status: 400,
//         text: "Stripe customer NOT created",
//         data: stripeCustomer
//     }   
  
//     } catch {
      
//         return {
//             status: 400,
//             text: "Stripe customer NOT created",
//             data: null
//         }   
//     }
  
//   };