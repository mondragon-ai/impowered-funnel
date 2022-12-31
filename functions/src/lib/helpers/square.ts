import { impoweredRequest } from "./requests";

export const createSquareCustomer = async (
    new_customer: any
) => {

    let data = await impoweredRequest("/customers", "POST", new_customer);

    return data?.data ?  data?.data : null
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