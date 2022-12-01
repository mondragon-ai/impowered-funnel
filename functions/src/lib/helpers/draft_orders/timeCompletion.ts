import * as functions from "firebase-functions";
import { completeDraftOrder } from "./complete";
/**
 *  STEP #6 
 *  Create Draft Order in 1000*60*5 minutes
 *  @param dra_uuid
 */
 export const sendOrder = async (dra_uuid: string, cus_uuid: string) => {
    // ? Toggle log 
    functions.logger.info("\n\n\n\n\n#4.a Send Order - Helper -- Outside Timer\n\n\n\n\n");
    
    // Wait for x-minutes to 
    setTimeout( async ()=> {
      // ? Toggle log 
      functions.logger.info("\n\n\n\n\n#4.a Send Order - Helper -- Inside Timer\n\n\n\n\n");
      functions.logger.info(dra_uuid);
  
      try {
        // Create Order
        await completeDraftOrder(dra_uuid, cus_uuid);
        
      } catch (error) {
        functions.logger.error("ERROR: Likely due to shopify.");
      }
  
      }, 1000*60*1);
  
  };