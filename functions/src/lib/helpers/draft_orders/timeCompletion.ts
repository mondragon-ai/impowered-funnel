import * as functions from "firebase-functions";
// import * as Scheduler from "@google-cloud/scheduler";
import * as Tasks from "@google-cloud/tasks";
// import { completeDraftOrder } from "./complete";
/**
 *  Update Algolia 
 *  Send blog data  to algolia for searchablity 
 *  @param dra_uuid
 */
 export const updateAlgolia = async (upload_object: any, collection: string) => {
  // ? Toggle log 
  functions.logger.info(" ⏭️ [QUEUE] - Adding Task to Queue");
  functions.logger.info(upload_object);

  // Create a client.
  const client = new Tasks.v2.CloudTasksClient();

  const project = 'impowered-funnel';
  const queue = 'FunnelOrders';
  const location = 'us-central1';
  const url = 'https://us-central1-impowered-funnel.cloudfunctions.net/funnel/algolia/collection/sync_server';

  // Construct the fully qualified queue name.
  const parent = client.queuePath(project, location, queue);

  const task = {
    httpRequest: {
      headers: {
        'Content-Type': 'application/json',
      },
      httpMethod: 'POST',
      url,
      body: Buffer.from(JSON.stringify({
        upload_object: upload_object,
        collection: collection,
      })).toString("base64")
    },
    scheduleTime: {
      seconds: (1 * 30) + Date.now() / 1000,
    }
  };


  // Send create task request.
  functions.logger.info(task);
  const request = {parent: parent, task: task};
  const [response] = await client.createTask(request as any);
  functions.logger.info(`Created task ${response.name}`);

  

  // // Wait for x-minutes to 
  // setTimeout( async ()=> {
  //   // ? Toggle log 
  //   functions.logger.info("\n\n\n\n\n#4.a Send Order - Helper -- Inside Timer\n\n\n\n\n");
  //   functions.logger.info(dra_uuid);

  //   try {
  //     // Create Order
  //     await completeDraftOrder(dra_uuid, cus_uuid);
      
  //   } catch (error) {
  //     functions.logger.error("ERROR: Likely due to shopify.");
  //   }

  //   }, 1000*60*1);

};
/**
 *  STEP #6 
 *  Create Draft Order in 1000*60*5 minutes
 *  @param dra_uuid
 */
 export const sendOrder = async (merchant_uuid:string, dra_uuid: string, cus_uuid: string) => {
    // ? Toggle log 
    functions.logger.info(" ==> [TIMER] - Outside Timer");
    functions.logger.info(dra_uuid);
    functions.logger.info(cus_uuid);

    // Create a client.
    const client = new Tasks.v2.CloudTasksClient();

    const project = 'impowered-funnel';
    const queue = 'FunnelOrders';
    const location = 'us-central1';
    const url = 'https://us-central1-impowered-funnel.cloudfunctions.net/funnel/draft_orders/complete_server';

    // Construct the fully qualified queue name.
    const parent = client.queuePath(project, location, queue);

    const task = {
      httpRequest: {
        headers: {
          'Content-Type': 'application/json',
        },
        httpMethod: 'POST',
        url,
        body:Buffer.from(JSON.stringify({
          merchant_uuid: merchant_uuid,
          dra_uuid: dra_uuid,
          cus_uuid: cus_uuid
        })).toString("base64")
      },
      scheduleTime: {
        seconds: (7 * 60) + Date.now() / 1000,
      }
    };


    // Send create task request.
    console.log('Sending task:');
    console.log(task);
    const request = {parent: parent, task: task};
    const [response] = await client.createTask(request as any);
    console.log(`Created task ${response.name}`);
  
    

    // // Wait for x-minutes to 
    // setTimeout( async ()=> {
    //   // ? Toggle log 
    //   functions.logger.info("\n\n\n\n\n#4.a Send Order - Helper -- Inside Timer\n\n\n\n\n");
    //   functions.logger.info(dra_uuid);
  
    //   try {
    //     // Create Order
    //     await completeDraftOrder(dra_uuid, cus_uuid);
        
    //   } catch (error) {
    //     functions.logger.error("ERROR: Likely due to shopify.");
    //   }
  
    //   }, 1000*60*1);
  
  };