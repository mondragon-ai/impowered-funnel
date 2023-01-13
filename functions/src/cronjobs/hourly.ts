import * as functions from "firebase-functions";
// import { getCollections } from "../lib/helpers/firestore";
import * as admin from "firebase-admin";
// import * as crypto from "crypto";
// import { createDocumentWthId, updateFunnelsDocument } from "../lib/helpers/firestore";

import * as twitter from "twitter-api-v2";
// import { divinciRequests } from "../lib/helpers/requests";
const twitterClient = new twitter.TwitterApi({
  clientId: "" + process.env.TWITTER_CLIENT_ID,
  clientSecret: "" + process.env.TWITTER_CLIENT_SECRET,
});


export const hourlyCronJob = functions
  .pubsub
  .schedule("0 * * * *")
  .onRun( async (context) => {

    // ? Dynamic ?
    // const MERCHANT_UUID = "50rAgweT9PoQKs5u5o7t";
    functions.logger.debug(" =====> [CRON JOB] - Started Hourly ✅");

    const dbRef = admin.firestore().doc(`tokens/demo`);

    // get twitter session
    const { refreshToken } = (await dbRef.get()).data() as { codeVerifier: any, state: any, accessToken: any, refreshToken: any  };

    functions.logger.debug(" 🐦 [TWITTER] - Refresh Token ");
    functions.logger.debug(refreshToken);
    const {
        client: refreshedClient,
        accessToken,
        refreshToken: refreshTokenNew,
    } = await twitterClient.refreshOAuth2Token(refreshToken);

    //   functions.logger.debug(" 🏦 Update w/ new Token");
      await dbRef.set({ accessToken, refreshToken: refreshTokenNew });

    let mentions: {id: string, text: string}[] = []

    try {
      functions.logger.debug(" 🐦 [TWITTER] - Get Mentions ");
      const usersMentions = await refreshedClient.v2.userMentionTimeline("1538698201473159168");
      functions.logger.debug(usersMentions.data.data.forEach(t => {
        console.log(t)
        if (t && 1541942319745798144 !== Number(t.id)) {
          mentions = [...mentions, {id: t.id, text: t.text}]
        }
      }));
    } catch (error) {
      console.error(error);
    }

    // try {
    //   // get collection of saved tweets
    //   const response = await getCollections(MERCHANT_UUID, "saves_tweets");

    //   if (response.status > 300) {
    //     throw new Error("Updating db");
    //   }

    //   // generate number of tweets 
    //   function getRandomInt(min: number, max: number) {
    //     min = Math.ceil(min);
    //     max = Math.floor(max);
    //     return Math.floor(Math.random() * (max - min + 1)) + min;
    //   }
  
    //   // generate number of tweets 
    //   const randomInt = getRandomInt(1, 5);
    //   functions.logger.debug(" 🏦 [DB] - Generate ran int from DB list ");
    //   functions.logger.debug(randomInt);

    //   functions.logger.debug(" 🐦 [TWITTER] - Refresh Token ");
    //   functions.logger.debug(refreshTokenNew);
    //   const {
    //       client: refreshedClientNew,
    //       accessToken,
    //       refreshToken: newRefreshToken,
    //   } = await twitterClient.refreshOAuth2Token(refreshTokenNew as string);
      
    //   functions.logger.debug(" 🏦 Update w/ new Token");
    //   await dbRef.set({ accessToken, refreshToken: newRefreshToken });

    //   for (var i = 0; i < mentions.length; i++) {
    //     functions.logger.debug(" 🏦 [DB] - Random int - " + i);
    //     if (response?.data && mentions.length > 0) {
    //       // const index = getRandomInt(0, mentions.length-1);

    //       // const list = response.data.collection as any[]

    //       functions.logger.debug(" 🏦 [DB] - Prompt from DB  ");
    //       functions.logger.debug(mentions[i].text);
    //       functions.logger.debug(mentions[i].id);

    //       // Generate open Ai tweet using saved prompt: 
    //       const nextTweet = await divinciRequests("/completions", "POST", {
    //         model: "davinci:ft-bigly:collinrugg-2023-01-08-23-40-22",
    //         prompt: "" + String(mentions[i].text) + " ->",
    //         temperature: 0.4,
    //         max_tokens: 70,
    //         stop: "<-"
    //       });
    //       functions.logger.debug(" 🎨 [DAVINCI] - New Tweet");
    //       functions.logger.debug(nextTweet);
    
    //       const { data } = await refreshedClientNew.v2.reply(
    //           nextTweet?.data?.choices[0]?.text,
    //           mentions[i].id
    //       );
    //       functions.logger.debug(" 🐦 [TWITTER] - Tweeted Successfully");
    //       functions.logger.debug(data);
    //     }

    //   }


    // } catch (e) {
    //   throw new Error("Likley due to fetching docs");
    // }
    return null;
  });