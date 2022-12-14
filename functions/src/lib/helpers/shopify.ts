import { DraftOrder } from "../types/draft_rders";
import { cartToOrder } from "./draft_orders/cartToOrder";
// import { getFunnelDocument } from "./firestore";
import fetch, { Response } from "node-fetch";
import * as functions from "firebase-functions";
import { getDocument } from "./firestore";
import { Customer } from "../types/customers";
import { Address } from "../types/addresses";
// import * as admin from "firebase-admin";

// Admin Headers 
export const HEADERS_ADMIN = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": process.env.SHOPIFY_ADMIN_ACCESS_TOKEN || "",
};

// Create URL
export const URL = "https://shophodgetwins.myshopify.com/admin/api/2022-07/"; 
  
/**
 * Initial request function for the 
 * @param resource 
 * @param method 
 * @param data 
 * @returns Response from fetch
 */
export const shopifyRequest = async (resource: string, method?: string, data?: any) => {

  // Make request to shopify 
  const response = await fetch(URL + resource, {
    method: method || "POST",
    body:  JSON.stringify(data) ,
    headers: HEADERS_ADMIN
  });
  return response;
};

export const createShopifyOrder =  async (
    draft_order: DraftOrder,
    cus_uuid: string,
) => {

    const MERCHAND_UUID = "50rAgweT9PoQKs5u5o7t";

    const response = await getDocument(MERCHAND_UUID, "customers", cus_uuid);

    const customer: Customer = response.data as Customer;

    const data = {
        order: {
            line_items: draft_order ? await cartToOrder(draft_order.line_items) : null ,
            currency:"USD",
            financial_status: "paid",
            customer:{
                id: customer?.shopify_uuid
            },
            use_customer_default_address:true,
            tags: "CUSTOM_CLICK_FUNNEL",
            shipping_line: {
            custom: "STANDARD_SHIPPING",
            price: 5.99,
            title: "Standard Shipping"
            }
        }
    }

    console.log(data);
    const result = await shopifyRequest( "orders.json", "POST", data);
    console.log(result);

    return
}

/**
 * Helper Fn - STEP #3\
 * Creates a customer object in shopify and return the customer.id || undefined
 * @param shipping 
 * @param email 
 */
export const createShopifyCustomer = async (shipping: Address, email:string) => {
  functions.logger.info(" ==> [SHOPIFY] - Start Update")

  // Define vars
  const {line1, city, state, zip, name} = shipping;

  // TODO: Validate address --> Helper fns???
  
  // Customer Data
  const customer_data = {
    customer:{ 
      first_name: name,
      last_name:"",
      email: email,
      phone:"",
      verified_email:true,
      addresses:[
        {
          address1:line1,
          city: city,
          province: state,
          phone: "",
          zip: zip,
          last_name:"",
          first_name: name,
          country:"US",
          country_name:"United States", 
          default: true
        }
      ]
    }
  };

  try {
    // Create New Customer 
    const response = await shopifyRequest( `customers.json`, "POST", customer_data);

    // ? Log to BE 
    functions.logger.log(" ==> #3 [SHOPIFY] - Request Made ");

    // Check if exists && retrun {[customers: {id: customer.id}]}
    const status = await checkStatus(response, email); 

    // handle result
    if (status === undefined) {
      // ? Log to BE 
      functions.logger.error(`\n\n\n\n
        #3 SHOPIFY ERROR: Likely internal server`,
        status
      );
      return undefined;
    } else {
      return status;
    }
  } catch (err) {
    // ? Log to BE 
    functions.logger.error(`\n\n\n\n
      #3 SHOPIFY ERROR: Likely internal server`,
      err
    );
    return undefined
  }
};

/**
 * Helper Fn - createShopifyCustomer()
 * handle response and fetch existing user or return JSON repsonse of new 
 * @param r - Response
 * @param e - email
 * @returns - {customer: [{id: customer.id}]} || undefined
 */
async function checkStatus(r: any, e: string) {
  // If 200 >= x < 300 &&
  // Return {customer: [{id: customer.id}]}
  if (r.ok) { 
    // Await json response and return data
    const doc = await r.json();

    console.log(" ====> [SHOPIFY] -> 200 resonse");
    const d = new Object({
        customers: [{
            id: doc.customer.id
        }] 
    });
    return d;

  } else if ( r.status == 422 ) { 
    try {
      // If email is with an existing user, then search the email 
      const response:Response = await shopifyRequest(
        `customers/search.json?query=email:"${e}"&fields=id,email`, 
        "GET"
      );

      const customer = await response.json()

      console.log(" ====> [SHOPIFY] -> 422 resonse");
      return new Object(customer);
      
    } catch (error) { return undefined; }
  } else { return undefined; }
};

// /**
//  *  Helper Fn - STEP #5
//  * Create Draft Order for Shopify && 
//  * POST Complete in x-minutes
//  * @param FB_UUID 
//  * @returns underfined && 200 || 400 || other
//  */
// export const createOrder = async (FB_UUID: string) => {

//     const MERCHANT_UUID = "";
//     try {
//         // Fetch data with UUID
//         const data = await getFunnelDocument(MERCHANT_UUID, "customers", FB_UUID);
    
//         console.log("152: shopify.js - data: \n",data);

//         // Order Data (SHOPIFY)
//         const draft_order_data = {
//         draft_order:{
//             line_items: data ? await cartToOrder(data) : null,
//             customer:{
//                 id: data?.SHOPIFY_UUID
//             },
//             use_customer_default_address:true,
//             tags: "CUSTOM_CLICK_FUNNEL",
//             shipping_line: {
//             custom: "STANDARD_SHIPPING",
//             price: 5.99,
//             title: "Standard Shipping"
//             }
//         }
//         };
        
//         // setTimeout( async () => {
//         // Create Order & Get Price

//         const shopify_order = await shopifyRequest(`draft_orders.json`, "POST", draft_order_data) 

//         console.log("195: shopify.js - shopify_order: \n", shopify_order);

//         if (!shopify_order.ok) {
//         functions.logger.error("176: shopify.ts \n", shopify_order.statusText)
//         return {
//             text: "ERROR: Likley Shopify - " + shopify_order.statusText,
//             status: shopify_order.status,
//             data: undefined
//         }
//         } else {
//         functions.logger.log("183: shopify.ts. Complete Order. \n", )
//         // Complete Draft Order --> Order
//         // TODO: Turn into cron job with pubsub
//         completeDraftOrder(await shopify_order.json());
    
//         return {
//             text: "SUCCESS: Shopify craft order created && TTC 15 min. ",
//             status: 200,
//             data: undefined
//         }
//         }

//     } catch {
//         return {
//         text: "ERROR: Likley issue with shopify. Check Logs - shopify.js",
//         status: 400,
//         data: undefined
//         }
//     }
// };




// /**
//  *  STEP #6 
//  *  Create Draft Order in 1000*60*5 minutes
//  *  @param FB_UUID
//  */
//  export const sendOrder = async (FB_UUID: string, ) => {
//     // ? Toggle log 
//     functions.logger.log("\n\n\n\n\n#4.a Send Order - Helper -- Outside Timer\n\n\n\n\n");
    
//     // Wait for x-minutes to 
//     setTimeout( async ()=> {
//       // ? Toggle log 
//       functions.logger.log("\n\n\n\n\n#4.a Send Order - Helper -- Inside Timer\n\n\n\n\n");
  
//       try {
//         // Create Order
//         const result = await createOrder(FB_UUID);
  
//         // Create Order & Return result
//         if ( result.status < 300) {
//           return // SUCCESS
//         } else {
//           functions.logger.error("ERROR: Likely due to shopify.");
//           return 
//           // res.status(400).json({
//           //   m: "ERROR: Likely due to shopify.",
//           // })
//         }
        
//       } catch (error) {
//         functions.logger.error("ERROR: Likely due to shopify.");
//         return
//       }
  
//       }, 1000*60*7);
  
//   };
  
  
//   /**
//    *  STEP #7 COMPLETE FUNNEL ORDER
//    *  Draft -> Order status fulfilled
//    *  Complete Draft Order --> Order
//    *  @param o 
//    */
//    export const completeOrder = async (o: any) => {
//     // ? Toggle logs
//     functions.logger.log('#7 Shopify DRAFT_ORDER Complete: ', o.draft_order);
  
//     // Check the status of the Shopify Create Customer Call
//     async function checkStatus(r: any) {
  
//       // If 200 >= x < 300, & return customer ID
//       if (r.ok) { 
//         // ? Toggle logs
//         functions.logger.log('SUCCESS: #7 Shopify DRAFT_ORDER Complete: ', o.draft_order);
//         return  await r.json()
//       } else { 
//         // ? Toggle logs
//         functions.logger.error('ERROR: #7 Shopify DRAFT_ORDER. ');    
//         return await r.json();
//       } 
//     };
  
//     // Complete Order
//     const result = await fetch(`https://shophodgetwins.myshopify.com/admin/api/2022-07/draft_orders/${o.draft_order.id}/complete.json`, {
//         method: 'put',
//         headers: HEADERS_ADMIN
//     })
//     .then(r =>  checkStatus(r))
//     .then(json => json);
  
  
//     functions.logger.log('#7 Shopify DRAFT_ORDER Complete: ', result);
  
//     return
//   };