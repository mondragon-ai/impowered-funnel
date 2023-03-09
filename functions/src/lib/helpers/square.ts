import { squareRequest } from "./requests";
import * as functions from "firebase-functions";
import * as crypto from "crypto";
import { Customer } from "../types/customers";
import { Address } from "../types/addresses";
import { handleSuccessPayment } from "./draft_orders/funnel_create";
import { LineItem } from "../types/draft_rders";
// import { getMerchant } from "./firestore";
// import { Merchant } from "../types/merchants";

export const createSquareCustomer = async (
  new_customer: any
) => {

  console.log(new_customer);
  let data = await squareRequest("/customers", "POST", new_customer);

  return data?.data ?  data?.data : null
}


export const handleSquareCharge = async (
    customer: Customer,
    price: number,
    product: LineItem,
    shipping: Address | null,
    high_risk: boolean,
    bump: boolean,
    external?: "" | "SHOPIFY" | "BIG_COMMERCE" | "SHINEON" | undefined,
    draft_order_id?: string,
    sourceId?: string,
    cus_UUID?: string,
) => {
  
    const {
      email,
      id,
      addresses,
    } = customer
  
    const SQAURE_UUID = customer.square ? customer.square.UUID : "";
    const SQAURE_PM = customer.square ? customer.square.PM : "";
  
    functions.logger.info(" ❸ [STRIPE] - Inputs 👇🏻 ------------------------------ ")
    functions.logger.info(" ❸ [STRIPE_UUID]: " + SQAURE_UUID);
    functions.logger.info(" ❸ [EMAIL]: " + email);
    console.log(product);
    functions.logger.info(" ❸ [CUS_UUID]: " + id);
    functions.logger.info(" ❸ [SOURCE_UUID]: " + sourceId);
    functions.logger.info(" ❸ [SQAURE_UUID]: " + SQAURE_UUID);
  
    if (id == "" || email == "") {
      return ""
    };

    let SQURE_PM = "";
  
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
    // const cardReq = {
    //     idempotency_key: "" + idempotencyKey,
    //     amount_money: {
    //       amount: 100,
    //       currency: "USD"
    //     },
    //     source_id: "" + sourceId,
    //     autocomplete: true,
    //     customer_id: "N1TH0YGN3HH8GF9BWH7BVXG9CC",
    //     location_id: "" + locationId,
    //     reference_id: "123456",
    //     note: "TEST",
    //     app_fee_money: {
    //       amount: 10,
    //       currency: "USD"
    //     }
    //   };
  
    async function createPM() {
      return new Promise( (resolve) => {
        return setTimeout(async () => {
  
          try {
              const idempotencyKey = crypto.randomBytes(16).toString('hex');
              const cardReq = {
                idempotency_key: "" + idempotencyKey,
                source_id: "" + sourceId ? sourceId : "",
                card: {
                  billing_address: {
                      address_line_1: shipping?.line1 ?  shipping.line1 : "",
                      address_line_2: shipping?.line2 ?  shipping.line2 : "",
                      locality: shipping?.city ?  shipping?.city : "",
                      administrative_district_level_1: shipping?.state ?  shipping?.state : "",
                      postal_code: shipping?.zip && shipping?.zip !== "" ? shipping?.zip : "10003",
                      country: shipping?.country ?  shipping?.country : "CA",
                  },
                  cardholder_name: (customer.first_name ? customer.first_name : "") + " " + (customer.last_name ? customer.last_name : ""),
                  customer_id: customer.square?.UUID ? customer.square?.UUID : "",
                  reference_id: customer.merchant_uuid ? customer.merchant_uuid : ""
                }
            };
            functions.logger.debug(cardReq);

            if (customer.square?.UUID !== "") {
              functions.logger.info(" ❸ [SQAURE_UUID]: " + customer.square?.UUID );
              // Store user card POSTing to /cards -> new source_id
              const {text, status, data} = await squareRequest("/cards", "POST", cardReq);

              // Logging
              functions.logger.debug(' 🎉 [SUCCESS] => Stored Card Details ', { text, status, data});
              console.log(data);

              SQURE_PM = data?.card?.id ? data.card.id : ""
            }
            
          } catch (e) {
              functions.logger.error(" ===> 🚨 [ERROR]: " + " - Charging customer - stripe 227");
          }
  
          return resolve(LOCATION_ID as string);
        }, 100);
      });
    }
  
    await createPM()
  
    async function createIntent() {
      return new Promise( (resolve) => {
        return setTimeout(async () => {
  
          try {

            if (SQAURE_UUID !== "") {
                const idempotencyKey = crypto.randomBytes(16).toString('hex');
        
                // * Make the initial square charge based on product price
                const payment_response = await squareRequest("/payments", "POST", {
                    idempotency_key: idempotencyKey,
                    amount_money: {
                        amount: (p < 10000 ? (p + 599) : p),
                        currency: "USD"
                    },
                    source_id: (SQAURE_PM ? SQAURE_PM : SQURE_PM ? SQURE_PM : ""),
                    autocomplete: true,
                    customer_id: SQAURE_UUID,
                    location_id: LOCATION_ID,
                    reference_id: customer.merchant_uuid
                });
                functions.logger.info(" ❸ [SQAURE] - Payemnt Response  🏦");
                console.log(payment_response);
                if (payment_response.status < 300 && payment_response.data) {
                    SQR_PI = payment_response.data.payment.id;
                }
            }
            
          } catch (e) {
              functions.logger.error(" ===> 🚨 [ERROR]: " + " - Charging customer - stripe 227");
          }
  
          return resolve(LOCATION_ID as string);
        }, 100);
      });
    }
  
    await createIntent()
  
    let address = shipping;
  
    if (
        address != null &&
        SQR_PI !== "" &&
        typeof product.price == "number" &&
        product.title !== "" &&
        (Number(product.variant_id) > 0 || product.variant_id  !== "")
    ) {
        if (addresses && addresses.length > 0) {
          addresses.map(addy => {
            if (addy.type === "SHIPPING" || addy.type === "BOTH") {
              address = addy
            }
          })
        }
        functions.logger.info(" ❷ [EXTERNAL] ", external);
        handleSuccessPayment(customer, product, SQR_PI, (SQAURE_PM ? SQAURE_PM : SQURE_PM ? SQURE_PM : ""), shipping, high_risk, bump, external, draft_order_id);
        functions.logger.info(" ❷ [DRAFT ORDER] - Created 👍🏻");
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