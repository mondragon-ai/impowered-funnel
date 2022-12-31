import * as functions from "firebase-functions";
import { getCollections } from "../lib/helpers/firestore";
import * as admin from "firebase-admin";
// import * as crypto from "crypto";
// import { createDocumentWthId, updateFunnelsDocument } from "../lib/helpers/firestore";

import * as twitter from "twitter-api-v2";
import { divinciRequests } from "../lib/helpers/requests";
const twitterClient = new twitter.TwitterApi({
  clientId: "" + process.env.TWITTER_CLIENT_ID,
  clientSecret: "" + process.env.TWITTER_CLIENT_SECRET,
});


export const hourlyCronJob = functions
  .pubsub
  .schedule("0 * * * *")
  .onRun( async (context) => {

    // ? Dynamic ?
    const MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";

    const dbRef = admin.firestore().doc(`tokens/demo`);

    // get twitter session
    const { refreshToken } = (await dbRef.get()).data() as { codeVerifier: any, state: any, accessToken: any, refreshToken: any  };

    functions.logger.debug(" ------------ REFRESH TOKEN ->");
    functions.logger.debug(refreshToken);
    const {
        client: refreshedClient,
        accessToken,
        refreshToken: newRefreshToken,
    } = await twitterClient.refreshOAuth2Token(refreshToken);
    
    await dbRef.set({ accessToken, refreshToken: newRefreshToken });
    


    try {
      // get collection of saved tweets
      const response = await getCollections(MERCHANT_UUID, "saves_tweets");

      if (response.status > 300) {
        throw new Error("Updating db");
      }

      // generate number of tweets 
      function getRandomInt(min: number, max: number) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
  
      // generate number of tweets 
      const randomInt = getRandomInt(1, 5);
      functions.logger.debug(" ------------ Random Int ");
      functions.logger.debug(randomInt);

      for (var i = 0; i < randomInt; i++) {
        functions.logger.debug(" ------------ Random Int (i) ");
        functions.logger.debug(i);
        if (response?.data && response.data.size > 0) {
          const index = getRandomInt(0, response.data.size-1);

            const list = response.data.collection as any[]

            functions.logger.debug(" ------------ PROMPT FROM DB ");
            functions.logger.debug(list[index].text);

            // Generate open Ai tweet using saved prompt: 
            const nextTweet = await divinciRequests("/completions", "POST", {
              model: "text-davinci-003",
              prompt: "required parameters:\nif links exists in the text, use the same exact link and generate a new viral tweet using the following tweet as inspiration:\n " + String(list[index].text),
              temperature: 0.9,
              max_tokens: 150,
              frequency_penalty: 0,
              presence_penalty: 0.6,
            });
            functions.logger.debug(" ------------ NEXT TWEET");
            functions.logger.debug(nextTweet);
      
            functions.logger.debug(" ------------ NEXT TWEET { DATA }");
            const { data } = await refreshedClient.v2.tweet(
                nextTweet?.data?.choices[0]?.text
            );
            functions.logger.debug(data);
        }

      }



    } catch (e) {
      throw new Error("Likley due to fetching docs");
    }
    return null;
  });