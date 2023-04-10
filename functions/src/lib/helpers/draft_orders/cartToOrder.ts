import * as functions from "firebase-functions";
import { LineItem } from "../../types/draft_rders";

/**
 *  Helper Fn - completeOrder()
 *  Get primary DB customer document && create a new cart obj to return to complete order
 *  @param FB_DOC 
 *  @returns cart[product] || []
 */
 export const cartToOrder = (line_items: LineItem[]) => {
    functions.logger.log("\n\n\n\n\n#5.a Order Created - Helper\n\n\n\n\n");
    console.log('61 - helpers: ', line_items);

    // Create vars
    const ln = line_items.length
    var cart: any = []
  
    if (ln == 0 ) { 
      // TODO: Return format
      functions.logger.log('160 - Helper Fn: ', cart);
      return cart
    } else {
      for (var i = 0; i < ln; i++) {
        if (typeof(line_items[i].variant_id) == "number") {
          // TODO: ADD PROPERTIES FOR SHINE_ON
          cart = [
            ...cart,
            {
              variant_id: line_items[i].variant_id,
              quantity: line_items[i].quantity
            }
          ];
        }
      }
      functions.logger.log('167 - Helper Fn: ', cart);
      return cart
    };
  };

/**
 *  Helper Fn - completeOrder() ONLY FOR CSV --> JSON
 *  Get primary DB customer document && create a new cart obj to return to complete order
 *  @param FB_DOC 
 *  @returns cart[product] || []
 */
 export const cartToOrderCSV = (line_items: LineItem[]) => {
  functions.logger.log("\n\n\n\n\n#5.a Order Created - Helper\n\n\n\n\n");
  console.log('61 - helpers: ', line_items);

  // Create vars
  const ln = line_items.length
  var cart: any = []

  if (ln == 0 ) { 
    // TODO: Return format
    functions.logger.log('160 - Helper Fn: ', cart);
    return cart
  } else {
    for (var i = 0; i < ln; i++) {

      if (typeof(line_items[i].variant_id) == "number") {
        // TODO: ADD PROPERTIES FOR SHINE_ON
        cart = [
          ...cart,
          {
            variant_id: line_items[i].variant_id,
            quantity: line_items[i].quantity
          }
        ];
      }
      
      if (line_items[i].title == "2 Products (1 Wristband/1 Decal)") {
        cart = [
          ...cart,
          {
            variant_id: 42513995202732,
            quantity: line_items[i].quantity
          }
        ];
      }

      if (line_items[i].title == "6 products (3 wristbands/3 decals) save 30%") {
        cart = [
          ...cart,
          {
            variant_id: 42513995235500,
            quantity: line_items[i].quantity
          }
        ];
      }

      if (line_items[i].title == "10 Products (5 Wristbands/5 Decals) Save 40%") {
        cart = [
          ...cart,
          {
            variant_id: 42513995268268,
            quantity: line_items[i].quantity
          }
        ];
      }

      if (line_items[i].title == "20 products (10 wristbands/10 decals) save 50%") {
        cart = [
          ...cart,
          {
            variant_id: 42513995301036,
            quantity: line_items[i].quantity
          }
        ];
      }
    }
    console.log('[CART] Current Cart for Shopify: ', {cart});
    return cart
  };
};