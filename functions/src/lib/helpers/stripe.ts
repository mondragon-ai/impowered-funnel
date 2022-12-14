const Stripe = require("stripe");
export const stripe = Stripe(process.env.STRIPE_SECRET);
import * as functions from "firebase-functions";
// import * as admin from "firebase-admin";
import { Address } from "../types/addresses";
// import { DailyFunnel } from "../types/analytics";
import { DraftOrder, LineItem, Order } from "../types/draft_rders";
// import { getToday } from "./date";
import { createFunnelDraftOrder } from "./draft_orders/funnel_create";
import { updateDocument } from "./firestore";
import { shopifyRequest } from "./shopify";

/**
 *  Helper Fn - STEP #1 
 *  Create a stripe customer and a payment intent secrete key to receive card and store in the vault 
 *  @returns {stripe_data} 200 || 400
 */
 export const createStripeCustomer = async () => {
    console.log(process.env.STRIPE_SECRET);
    try {

        // Craete Stripe customer
        const stripeCustomer = await stripe.customers.create({
            description: "CUSTOM CLICK FUNNEL",
        });
    
        // Create a SetUp Intent to get client side secrete key
        const paymentIntent = await stripe.setupIntents.create({
            customer: stripeCustomer.id,
            payment_method_types: ['card']
        });

        // TODO: Follow same return formate and assign to data key
        return {
            status: 200,
            text: "Stripe customer created",
            data: 
                {
                    stripe_uuid: stripeCustomer.id,
                    stripe_pm: paymentIntent.id,
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
    email: string,
    stripe_uuid: string,
    shipping: any
  ) => {
    // extract vars
    const {line1, city, state, zip} = shipping;
  
    try {
      
      // Update Stripe Customer 
      const stripeCustomer = await stripe.customers.update(
        stripe_uuid,
        {
          email: email,
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
  
      return {
        status: 400,
        text: "Stripe customer NOT created",
        data: stripeCustomer
    }   
  
    } catch {
      
        return {
            status: 400,
            text: "Stripe customer NOT created",
            data: null
        }   
    }
  
  };

  export const handleStripeCharge = async (
    MERCHAND_UUID: string,
    STRIPE_UUID: string,
    price: number, 
    email: string,
    text: string,
    product: any,
    shipping: Address | null,
    cus_uuid: string,
  ) => {

    functions.logger.info("\n\n\n\n129:  ===> Handle Stripe Charge ");
    functions.logger.info(STRIPE_UUID);
    functions.logger.info(email);
    functions.logger.info(product);
    functions.logger.info(cus_uuid);

    let STRIPE_PM = "";
    let STRIPE_PI = "";


    setTimeout(async () => {

    try {
            // * Get payment Method
          const paymentMethods = await stripe.paymentMethods.list({
            customer: STRIPE_UUID,
            type: "card"
          });
          functions.logger.info("PAYMENT_METHOD:\n", paymentMethods);
      
          // * Make the initial Stripe charge based on product price
          const paymentIntent = await stripe.paymentIntents.create({
              amount: price,
              currency: 'USD',
              customer: STRIPE_UUID,
              payment_method: paymentMethods.data[0].id ? paymentMethods.data[0].id : "",
              off_session: true,
              confirm: true,
              receipt_email: email, 
          });
          functions.logger.info("PAYMENT_INTENT:\n", paymentIntent);

          STRIPE_PM = paymentMethods.data[0].id ? paymentMethods.data[0].id : "";
          STRIPE_PI = paymentIntent.id ? paymentIntent.id : "";
          
        
    } catch (e) {
        functions.logger.info("ERROR: " + " - charging customer - stripe 140");
    }

    if (shipping != null) {
      // create funnel draft
      const draftOrder = await createFunnelDraftOrder(
        MERCHAND_UUID,
        STRIPE_PI,
        STRIPE_PM,
        product,
        shipping,
        cus_uuid,
        email);


        functions.logger.info("129:  ===> Draft Order ");
        functions.logger.info(draftOrder);
    }


  }, 1000);

    return {
        STRIPE_PI: STRIPE_PI,
        STRIPE_PM: STRIPE_PM
    };
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
  MERCHANT_UUID: string,
  FB_UUID: string ,
  SHOPIFY_UUID: string, 
  STRIPE_UUID: string, 
  STRIPE_PM: string, 
  draft_order: DraftOrder
) => {
  //Create Sub with customer
  const subResponse = await createSubscription(STRIPE_UUID, STRIPE_PM);

  if (subResponse === undefined) {
    return {
      status: 400,
      text: "ERROR: Coudln't create subscription",
      data: undefined
    }
  }
  
  // ADD Tags to Shopify
  const shopifyCustomer = await shopifyRequest("/graphql.json", "POST", {
    query: "mutation addTags($id: ID!, $tags: [String!]!) { tagsAdd(id: $id, tags: $tags) { node { id } userErrors { message } } }",
    variables: {
      id: `gid://shopify/Customer/${SHOPIFY_UUID}`,
      tags: "VIP_MEMBER"
    }
  });

  // Check if Shopify Request == OK
  if (shopifyCustomer.status >= 300) {
    return {
      status: shopifyCustomer.status,
      text: "ERROR: Likely an issue with Shopify.",
      data: undefined
    }
  } else {
    // Create Sub JSON
    const subscription = JSON.parse(JSON.stringify(subResponse));
    console.log("\n\n\n240: HANDLE STRIPE CHARGE - SUBSCRIPTION (strpe) ==>\n");
    console.log(subscription);
  
    // Update FB Doc 
    const customerDoc = await updateDocument(MERCHANT_UUID, "customers", FB_UUID, {
      subscriptions: [subscription.id]
    });


    let update_order = {
      ...draft_order,
      line_items: [...draft_order?.line_items] as LineItem[],
      current_total_price: draft_order?.current_total_price + 4000,
      current_subtotal_price: draft_order?.current_subtotal_price ? draft_order?.current_subtotal_price + 4000 : 0,
    } as Order

    if (draft_order != undefined) {
      update_order = {
        ...update_order,
        line_items: [
          ...draft_order?.line_items,
          {
            variant_id: subscription.id,
            product_id: subscription.id,
            title: "SUBSCRIPTIONS PRODUCT",
            sku: "sub_item", 
            handle: "subscription_product",
            price: 4000,
            high_risk: false,
            options1: "",
            options2: "",
            options3: "",
            weight: 0,
            compare_at_price: 0,
            quantity: 1
          }
        ]
      }
    } else {
      update_order = {
        ...update_order,
        line_items: [
          {
            variant_id: subscription.id,
            product_id: subscription.id,
            title: "SUBSCRIPTIONS PRODUCT",
            sku: "sub_item", 
            handle: "subscription_product",
            price: 4000,
            high_risk: false,
            options1: "",
            options2: "",
            options3: "",
            weight: 0,
            compare_at_price: 0,
            quantity: 1
          }
        ]
      }
    }

    // Update FB Doc 
    const order = await updateDocument(MERCHANT_UUID, "draft_orders", draft_order?.id as string, update_order);
    console.log("\n\n\n303: HANDLE STRIPE CHARGE - Order (FB doc) ==>\n");
    console.log(order);
  
    // Check if Sub to Stripe was OK
    if (customerDoc === undefined || order === undefined) {
      return {
        status: 400, 
        text: "ERROR: Likely an issue with Stripe.",
        data: undefined
      }
    }
  
    // const giftCard = await giveGiftCard(SHOPIFY_UUID);

    return {
      status: 200,
      text: "SUCCESS: Subscription createCustomerDoc.",
      data: undefined
    }
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

