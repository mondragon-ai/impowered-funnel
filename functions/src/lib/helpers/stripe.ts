const Stripe = require("stripe");
export const stripe = Stripe(process.env.STRIPE_SECRET);
import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
import { Address } from "../types/addresses";
import { Customer } from "../types/customers";
// import { DailyFunnel } from "../types/analytics";
import { DraftOrder, LineItem, Order } from "../types/draft_rders";
// import { getToday } from "./date";
import { handleSuccessPayment } from "./draft_orders/funnel_create";
import { updateDocument } from "./firestore";
import { shopifyRequest } from "./shopify";

/**
 *  Helper Fn - STEP #1 
 *  Create a stripe customer and a payment intent secrete key to receive card and store in the vault 
 *  @returns {stripe_data} 200 || 400
 */
 export const createStripeCustomer = async (
  email: string,
  first_name: string,
  last_name: string
) => {
  
    try {

      // Craete Stripe customer
      const stripeCustomer = await stripe.customers.create({
          description: "CUSTOM CLICK FUNNEL",
          email: (email ? email : ""),
          name: (first_name ? first_name : "") + " " + (last_name ? last_name : "") 
      });
  
      functions.logger.debug(" ==> [CREATE] - Stripe Intent 🤫");
      // Create a SetUp Intent to get client side secrete key
      const paymentIntent = await stripe.setupIntents.create({
          customer: stripeCustomer.id,
          payment_method_types: ['card']
      });

      // TODO: Follow same return formate and assign to data key
      return {
          status: 200,
          text: "Stripe customer created",
          data: {
            stripe_uuid: stripeCustomer.id,
            stripe_client_secret: paymentIntent.client_secret
          }
      }   
    } catch (e) {
        return {
            status: 400,
            text: "Stripe customer NOT created",
            data: null
        }   
    }
};

/**
 *  Helper Fn - STEP #1 
 *  Create a stripe customer and a payment intent secrete key to receive card and store in the vault 
 *  @returns {stripe_data} 200 || 400
 */
 export const createSripeClientSecret = async (
  stripe_UUID: string,
  ) => {
  
    try {
      functions.logger.debug(" ==> [CREATE] - Stripe Intent 🤫");
      // Create a SetUp Intent to get client side secrete key
      const paymentIntent = await stripe.setupIntents.create({
          customer: stripe_UUID,
          payment_method_types: ['card']
      });

      return {
          status: 200,
          text: "Stripe client secret created",
          data: paymentIntent.client_secret as string
      }   
    } catch (e) {
        return {
            status: 400,
            text: "Stripe client secret NOT created",
            data: ""
        }   
    }
};

     

/**
 * Helper Fn - STEP #3
 * Updates the strie customer wiht the billing&shipping wiht the same address
 * Primary DB created as well
 * @param email 
 * @param stripe_uuid 
 * @param shipping 
 * @returns 
 */
 export const updateStripeCustomer = async (
    name: string,
    stripe_uuid: string,
    shipping: any
  ) => {
    // extract vars
    const {line1, city, state, zip} = shipping;
  
    try {
      // Update Stripe Customer 
      const stripe_customer = await stripe.customers.update(
        stripe_uuid,
        {
          name: name,
          shipping: {
            name:  name,
            address: {
              line1: line1,
              city: city,
              state: state,
              postal_code: zip,
              country: "US"
            }
          },
          address: {
            city: city,
            country: "US",
            line1: line1,
            postal_code: zip,
            state: state
          }
        }
      );
      functions.logger.info(" ===> [STRIPE] - Update Customer");
      return {
        status: 200,
        text: "Stripe customer updated successfully 🤑",
        data: stripe_customer
      };
  
    } catch {
      return {
        status: 400,
        text: "Stripe customer NOT created",
        data: null
      } 
    };
  
  };

  export const handleStripeCharge = async (
    customer: Customer,
    price: number,
    product: any,
    shipping: Address | null,
    high_risk: boolean
  ) => {

    const {
      email,
      id: cus_uuid,
      addresses,
    } = customer

    const STRIPE_UUID = customer.stripe ? customer.stripe.UUID : ""

    functions.logger.info(" ===> [STRIPE] - Inputs 👇🏻")
    functions.logger.info(" ===> [STRIPE_UUID]: " + STRIPE_UUID);
    functions.logger.info(" ===> [EMAIL]: " + email);
    console.log(product);
    functions.logger.info(" ===> [CUS_UUID]: " + cus_uuid);

    if (cus_uuid == "" || email == "") {
      return ""
    }

    let STRIPE_PI = "";
    let STRIPE_PM = "";

    async function getMethod() {
      return new Promise( (resolve) => {
        return setTimeout(async () => {

          try {
            // * Get payment Method
            const paymentMethods = await stripe.paymentMethods.list({
              customer: STRIPE_UUID,
              type: "card"
            });
            functions.logger.info(" ===> [PAYMENT_METHOD]");
      
            STRIPE_PM = paymentMethods.data[0].id ? paymentMethods.data[0].id : "";
            functions.logger.info(STRIPE_PM);
                
          } catch (e) {
            functions.logger.info(" ===> 🚨 [ERROR]: " + " - GETTING PM for customer - stripe 198");
          }
          return resolve(STRIPE_PM as string);
        }, 1000);
      });
    }

    await getMethod()

    async function createIntent() {
      return new Promise( (resolve) => {
        return setTimeout(async () => {

          try {
        
            // * Make the initial Stripe charge based on product price
            const paymentIntent = await stripe.paymentIntents.create({
              amount: price,
              currency: 'USD',
              customer: STRIPE_UUID,
              payment_method: STRIPE_PM,
              off_session: true,
              confirm: true,
              receipt_email: email, 
            });
            functions.logger.info(" ===> [PAYMENT_INTENTION]");
      
            STRIPE_PI = paymentIntent.id ? paymentIntent.id : "";
            functions.logger.info(STRIPE_PI);
            
          } catch (e) {
              functions.logger.info(" ===> 🚨 [ERROR]: " + " - Charging customer - stripe 227");
          }

          return resolve(STRIPE_PI as string);
        }, 500);
      });
    }

    await createIntent()

    let address = shipping;

    if (address != null) {

      if (addresses && addresses.length > 0) {
        addresses.map(addy => {
          if (addy.type === "SHIPPING" || addy.type === "BOTH") {
            address = address
          }
        })
      }
      handleSuccessPayment(customer, product, STRIPE_PI, STRIPE_PM, shipping, high_risk);
      functions.logger.info(" ===> [DRAFT ORDER] - Create");
    } 

    return STRIPE_PI;
}


/**
 * Helper Fn - STEP 4.b
 * Create the subscription obeject and assign the customer based n the received payment method 
 * @param FB_UUID 
 * @param SHOPIFY_UUID 
 * @param STRIPE_UUID 
 * @param STRIPE_PM 
 * @param line_items 
 * @returns 
 */
 export const handleSubscription = async (
  customer: Customer,
  merchant_uuid: string, 
  draft_order: DraftOrder,
  price: number
) => {
  // Logging
  functions.logger.info(" => [HANDLE SUBSCRIPTION] - Start");

  // Set vars for subs
  const shopify_uuid = customer.shopify_uuid ? customer.shopify_uuid  : ""
  const stripe_uuuid = customer.stripe?.UUID ? customer.stripe?.UUID : "";
  const stripe_pm = customer.stripe?.PM ? customer.stripe?.PM : "";
  const cus_uuid = customer.id ? customer?.id : "";
    
  //Create Sub with customer
  const subResponse = await createSubscription(stripe_uuuid, stripe_pm);

  if (subResponse === undefined) {
    return {
      status: 400,
      text: "[ERROR]: Coudln't create subscription",
      data: undefined
    }
  }

  if (stripe_uuuid && stripe_uuuid !== "") {
    // ADD Tags to Shopify
    const shopifyCustomer = await shopifyRequest("graphql.json", "POST", {
      query: "mutation addTags($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { node { id } userErrors { message } } }",
      variables: {
        id: `gid://shopify/Customer/${shopify_uuid}`,
        tags: "VIP_MEMBER"
      }
    });

    // Check if Shopify Request == OK
    if (shopifyCustomer.status >= 300) {
      // throw new Error("[ERROR]: Likely an issue with Shopify.");
      return {
        status: shopifyCustomer.status,
        text: "[ERROR]: Likely an issue with Shopify.",
        data: undefined
      }
    }
  }
  
  // Create Sub JSON
  const subscription = JSON.parse(JSON.stringify(subResponse));
  console.log(" => [RESULT SUBSCRIPTION]:");
  console.log(subscription);

  const subs: string [] = customer.subscriptions ? customer.subscriptions : []

  // Update FB Doc 
  const customerDoc = await updateDocument(merchant_uuid, "customers", cus_uuid, {
    subscriptions: [...subs, subscription.id]
  });
  console.log(" => [UPDATED DOCUMENT] - Customer:");
  console.log(customerDoc);

  let update_order = {
    ...draft_order,
    line_items: [...draft_order?.line_items] as LineItem[],
    current_total_price: draft_order?.current_total_price ? draft_order?.current_total_price + price : 0,
    current_subtotal_price: draft_order?.current_subtotal_price ? draft_order?.current_subtotal_price + price : 0,
  } as Order

  const product = {
    variant_id: subscription.id,
    product_id: subscription.id,
    title: "SUBSCRIPTIONS PRODUCT",
    sku: "sub_item", 
    handle: "subscription_product",
    price: price,
    high_risk: false,
    options1: "",
    options2: "",
    options3: "",
    weight: 0,
    compare_at_price: 0,
    quantity: 1
  }

  if (draft_order != undefined) {
    update_order = {
      ...update_order,
      line_items: [
        ...draft_order?.line_items,
        product
      ]
    }
  } else {
    update_order = {
      ...update_order,
      line_items: [product]
    }
  }

  // Update FB Doc 
  const order = await updateDocument(merchant_uuid, "draft_orders", draft_order?.id as string, update_order);
  console.log(" => [UPDATED DOCUMENT] - Order:");
  console.log(order);

  // Check if Sub to Stripe was OK
  if (customerDoc === undefined || order === undefined) {
    return {
      status: 400, 
      text: "[ERROR]: Likely an issue with Stripe Or updating order",
      data: undefined
    }
  }
  // const giftCard = await giveGiftCard(SHOPIFY_UUID);

  return {
    status: 200,
    text: "[SUCCESS]: Subscription createCustomerDoc.",
    data: undefined
  }
}

/**
 * Helper Fn - STEP 4.b
 * Create subscription based on the 
 * @param STRIPE_UUID 
 * @param STRIPE_PM 
 * @returns 
 */
export const createSubscription = async (STRIPE_UUID: string, STRIPE_PM: string) => {
  console.log("34: CREATE SUBS ==>");
  console.log(STRIPE_UUID,STRIPE_PM);

  try {
    const subscription = await stripe.subscriptions.create({
      customer: STRIPE_UUID,
      items: [
        {
          price_data: {
            currency: "usd",
            product: "prod_M5BDYb70j19Und",
            recurring: {
              interval: "month"
            },
            unit_amount: 4000
          }
        },
      ],
      default_payment_method: STRIPE_PM,
    });

    // Handle results
    if (subscription) {
      // TODO: Follow same return format 
      return new Object(subscription); 
    } else { 
      // TODO: Follow same return format 
      return undefined 
    }

  } catch (err) {
    // TODO: Follow same return format
    return undefined
  }
};


