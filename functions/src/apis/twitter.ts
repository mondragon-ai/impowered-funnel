import * as express from "express";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
// import * as cheerio from "cheerio";
// import fetch from "node-fetch";
// import puppeteer from "puppeteer";
// import { createDocument, getCollections, getDocument } from "../lib/helpers/firestore";
// import { validateKey } from "./auth";
// import { Fulfillment } from "../lib/types/fulfillments";const express = require('express');
// import * as fs from "fs"
// import { openAPIRequests } from "../lib/helpers/requests";



const dbRef = admin.firestore().doc('tokens/demo');

// Twitter API init
// const TwitterApi = require('twitter-api-v2').default;
import * as twitter from "twitter-api-v2";


import { divinciRequests, twitterRequest } from "../lib/helpers/requests";
import { createDocumentWthId } from "../lib/helpers/firestore";
import { validateKey } from "../routes/auth";

// import { create } from "domain";
const twitterClient = new twitter.TwitterApi({
  clientId: "" + process.env.TWITTER_CLIENT_ID,
  clientSecret: "" + process.env.TWITTER_CLIENT_SECRET,
});


const callbackURL = 'https://us-central1-impowered-funnel.cloudfunctions.net/funnel/twitter/callback';


export const twitterRoutes = (app: express.Router) => {

    // STEP 1 - Auth URL
    app.get("/twitter/login", async (req: express.Request, res: express.Response) => {

        functions.logger.debug(" ====> Ready to get initial token for generating oAuth link on apps behalf 👽 ");

        const { url, codeVerifier, state } = twitterClient.generateOAuth2AuthLink(
            callbackURL,
            { scope: ['tweet.read', 'tweet.write', 'users.read', 'offline.access'] }
        );

        // store verifier

        functions.logger.debug(" --------- ");
        functions.logger.debug(url);

        await dbRef.set({ codeVerifier: codeVerifier, state: state });

        const redirectURI = decodeURIComponent(url);
        res.redirect(redirectURI);
    });


    // STEP ## - callback
    app.get("/twitter/callback", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" --------- ");
        functions.logger.debug(" ====> Ready get offline access and tweet on users behalf  👽 ");
        let status = 200,
            text = "SUCCESS: Uploaded data to train a model for imPowered 👽",
            ok = true;

        const { state, code } = req.query;

        functions.logger.debug(" --------- ");
        functions.logger.debug(state);
        functions.logger.debug(code);


        const dbSnapshot = await dbRef.get();
        const { codeVerifier, state: storedState } = dbSnapshot.data() as { codeVerifier: any, state: any };
      
        if (state !== storedState) {
            text = "ERROR: Stored tokens do not match!",
            ok = false;
            status = 400;
        }
      
        const {
          client: loggedClient,
          accessToken,
          refreshToken,
        } = await twitterClient.loginWithOAuth2({
          code: code as string,
          codeVerifier,
          redirectUri: callbackURL,
        });
      
        await dbRef.set({ accessToken, refreshToken });
      
        const { data } = await loggedClient.v2.me(); // start using the client if you want
      
        res.status(status).json({
            ok: ok,
            text: text,
            result: data
        })
    });


    // STEP ## - Tweet using GPT-3 (already preselected prompt from tweet)
    app.post("/twitter/tweet", async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to tweet on users behalf  😈 ");
        let status = 200,
            text = "SUCCESS: Tweeted on users behalf  😈",
            ok = true;

        const { refreshToken } = (await dbRef.get()).data() as { codeVerifier: any, state: any, accessToken: any, refreshToken: any  };

        functions.logger.debug(" ------------ ");
        functions.logger.debug(refreshToken);
        const {
            client: refreshedClient,
            accessToken,
            refreshToken: newRefreshToken,
        } = await twitterClient.refreshOAuth2Token(refreshToken);
        
        await dbRef.set({ accessToken, refreshToken: newRefreshToken });
        
        const nextTweet = await divinciRequests("/completions", "POST", {
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 0.9,
            max_tokens: 150,
            frequency_penalty: 0,
            presence_penalty: 0.6,
        });
        functions.logger.debug(" ------------ ");
        functions.logger.debug(nextTweet);
        

        functions.logger.debug(" ------------ ");
        const { data } = await refreshedClient.v2.tweet(
            nextTweet?.data?.choices[0]?.text
        );
        functions.logger.debug(data);
      
        res.status(status).json({
            ok: ok,
            text: text,
            data: data
        })
    });




    // STEP ## - Scraper
    app.post("/twitter/scraper", validateKey, async (req: express.Request, res: express.Response) => {
        functions.logger.debug(" ====> Ready to scrape tweet(s) on bots behalf  😈 ");
        let status = 200,
            text = "SUCCESS: Scraped tweet(s) on bots behalf 😈",
            ok = true,
            data: any = null;

        // from validation
        const merchant_uuid = req.body.merchant_uuid;

        // from input
        const tweetId = req.body.tweetId;
        const tweetUrl = `/tweets/${tweetId}`;
        
        try {
            // Set up the request options
            functions.logger.debug(tweetUrl);
            let response: any | null;

            response = await twitterRequest(tweetUrl, "GET", null)
        
            if (response.status < 300) {
                functions.logger.debug(response);
                data = await response.data.data.text;
                text = " - Fetched tweet(s)"
                status = 200;
            }

        
        } catch (error) {
            status = 500;
            text = "ERROR: Error scraping tweet 🤡";
            ok = false;
        }

        try {
            const response = await createDocumentWthId(merchant_uuid, "saves_tweets", tweetId, {
                created_at: admin.firestore.Timestamp.now(),
                updated_at: admin.firestore.Timestamp.now(),
                text: data,
                user: "hodgetwins",
                used: false
            })

            if (response.status > 300) {
                throw new Error("Updating db");
                
            }
        } catch (e) {
            status = 500;
            text = "ERROR: Error saving tweet 🤡";
            ok = false;
        }
      
        res.status(status).json({
            ok: ok,
            text: text,
            data: data
        })
    });
// // Set your Twitter API credentials
//     const TWITTER_CONSUMER_KEY = 'YOUR_CONSUMER_KEY';
//     const TWITTER_CONSUMER_SECRET = 'YOUR_CONSUMER_SECRET';

//     // Set the callback URL for the OAuth flow
//     const TWITTER_CALLBACK_URL = 'http://localhost:3000/callback';

//     // Initialize the Twitter client with your consumer key and secret
//     const client = new Twitter({
//         consumer_key: TWITTER_CONSUMER_KEY,
//         consumer_secret: TWITTER_CONSUMER_SECRET
//     });
//     // Define the routes for your app
    
//     // This route will redirect the user to the Twitter authorization page
//     app.get("/login", async (req: express.Request, res: express.Response) => {
//         functions.logger.debug(" ====> Ready to upload data to train a model for imPowered. 👽 ");

//         // Request a request token from the Twitter API
//         client.getRequestToken((err, requestToken, requestTokenSecret, results) => {
//             if (err) {
//                 console.error(err);
//                 res.send('An error occurred while trying to authenticate with Twitter');
//                 return;
//             }
    
//             // Store the request token and secret in the session so we can use them later
//             req.session.requestToken = requestToken;
//             req.session.requestTokenSecret = requestTokenSecret;
    
//             // Redirect the user to the Twitter authorization page
//             res.redirect(`https://api.twitter.com/oauth/authenticate?oauth_token=${requestToken}`);
//         });
//     });
    
//     // This route will handle the callback from the Twitter authorization page
//     app.get('/callback', (req: express.Request, res: express.Response) => {
//       // Get the request token and verifier code from the query string
//       const requestToken = req.query.oauth_token;
//       const verifier = req.query.oauth_verifier;
    
//       // Get the request token secret from the session
//       const requestTokenSecret = req.session.requestTokenSecret;
    
//       // Exchange the request token and verifier code for an access token and secret
//       client.getAccessToken(requestToken, requestTokenSecret, verifier, (err, accessToken, accessTokenSecret, results) => {
//         if (err) {
//           console.error(err);
//           res.send('An error occurred while trying to authenticate with Twitter');
//           return;
//         }
    
//         // Store the access token and secret in the session so we can use them later
//         req.session.accessToken = accessToken;
//         req.session.accessTokenSecret = accessTokenSecret;
    
//         // Redirect the user to the home page
//         res.redirect('/');
//       });
//     })
    
}

// });
// const callbackURL = 'http://127.0.0.1:5000/faxnow-app/us-central1/callback';

// // STEP 2 - Verify callback code, store access_token 
// exports.callback = functions.https.onRequest((request, response) => {
//   const { state, code } = request.query;

//   const dbSnapshot = await dbRef.get();
//   const { codeVerifier, state: storedState } = dbSnapshot.data();

//   if (state !== storedState) {
//     return response.status(400).send('Stored tokens do not match!');
//   }

//   const {
//     client: loggedClient,
//     accessToken,
//     refreshToken,
//   } = await twitterClient.loginWithOAuth2({
//     code,
//     codeVerifier,
//     redirectUri: callbackURL,
//   });

//   await dbRef.set({ accessToken, refreshToken });

//   const { data } = await loggedClient.v2.me(); // start using the client if you want

//   response.send(data);
// });

// // STEP 3 - Refresh tokens and post tweets
// exports.tweet = functions.https.onRequest((request, response) => {
//   const { refreshToken } = (await dbRef.get()).data();

//   const {
//     client: refreshedClient,
//     accessToken,
//     refreshToken: newRefreshToken,
//   } = await twitterClient.refreshOAuth2Token(refreshToken);

//   await dbRef.set({ accessToken, refreshToken: newRefreshToken });

//   const nextTweet = await openai.createCompletion('text-davinci-001', {
//     prompt: 'tweet something cool for #techtwitter',
//     max_tokens: 64,
//   });

//   const { data } = await refreshedClient.v2.tweet(
//     nextTweet.data.choices[0].text
//   );

//   response.send(data);