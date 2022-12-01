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
      // TODO: Return format
      for (var i = 0; i < ln; i++) {
        if (typeof(line_items[i].variant_id) == "number") {
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