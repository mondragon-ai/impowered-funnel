import algoliasearch from "algoliasearch";

const algoliaClient = algoliasearch(
    process.env.X_ALGOLGIA_APPLICATION_ID as string,
    process.env.X_ALGOLGIA_API_KEY as string,
);

// Function to create an Algolia index for a merchant's sub-collection
export const createAlgoliaIndex = async (merchantId: string, indexName: string, data: any) =>{
  
    // Map sub-collection data to Algolia records
    const records = [{
        ...data,
        objectID: data.id
    }];
  
    // Create Algolia index
    const index = algoliaClient.initIndex(`${merchantId}_${indexName}`);
    await index.saveObjects(records);
  
    console.log(`Algolia index ${indexName} successfully created for merchant ${merchantId}.`);
  }