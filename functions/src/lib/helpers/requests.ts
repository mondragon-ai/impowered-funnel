import fetch, { Headers } from "node-fetch";
import * as functions from "firebase-functions";


const twitter_URL = "https://api.twitter.com/2";
const twitter_HEADERS =  new Headers({
    "Content-Type": "application/json",
    'Authorization': "Bearer " + process.env.TWITTER_BEARER_TOKEN,
})

export const twitterRequest = async (
    resource: string,
    method: string,
    data: any
) => {

    let text = " - Problem fetching -> " + resource, 
        status = 500;

    let response: any | null;

    if (data != null) {
    console.log("WITH BODY");
       response = await fetch(twitter_URL + resource, {
            method: method != "" ? method : "GET",
            body: JSON.stringify(data),
            headers: twitter_HEADERS
        })
    } else {
        response = await fetch(twitter_URL + resource, {
            method: "GET",
            headers: twitter_HEADERS
        })
    }

    let result = null;

    if (response != null) {
        result = await response.json();
        text = " - Fetched " + resource, 
        status = 200;
    }

    return {
        text,
        status,
        data: result
    }
}


const URL = "https://connect.squareupsandbox.com/v2";
const HEADERS =  {
    "Content-Type": "application/json",
    'Authorization': "Bearer " + process.env.SQUARE_ACCESS_TOKEN,
}

export const impoweredRequest = async (
    resource: string,
    method: string,
    data: any
) => {

    console.log(HEADERS);

    let text = " - Problem fetching -> " + resource, 
        status = 500;

    let response: any | null;

    if (data != null) {
       response = await fetch(URL + resource, {
            method: method != "" ? method : "GET",
            body: JSON.stringify(data),
            headers: HEADERS
        })
    } else {
        response = await fetch(URL + resource, {
            method: "GET",
            headers: HEADERS
        })
    }

    let result = null;

    if (response != null) {
        result = await response.json();
        text = " - Fetched " + resource, 
        status = 200;
    }

    return {
        text,
        status,
        data: result
    }
}

const open_URL = "https://api.openai.com/v1";
const open_HEADERS =  new Headers({
    "Content-Type": "multipart/form-data",
    'Authorization': "Bearer " + process.env.OPEN_API_KEY,
})


export const openAPIRequests = async (
    resource: string,
    method: string,
    data: any
) => {

    functions.logger.debug("\n\n\n\n ====> Inputs");
    functions.logger.debug(open_URL + resource);
    functions.logger.debug(method);
    functions.logger.debug(data);

    let text = " - Uploading to this route (open AI) -> " + resource, 
        status = 500;

    let response: any | null;

    if (method != "GET") {
       response = await fetch(open_URL + resource, {
            method: method != "" ? method : "GET",
            body: JSON.stringify(data),
            headers: open_HEADERS
        })
        text = "SUCCESS: Uploaded to this route (open AI) -> " + resource, 
        status = 200;
    } else {
        response = await fetch(open_URL + resource, {
            method: "GET",
            headers: open_HEADERS
        })
        text = "SUCCESS: Uploaded to this route (open AI) -> " + resource, 
        status = 200;
    }

    let result = null;

    if (response.status < 300) {
        result = await response.json();
        text = " - Fetched " + resource, 
        status = 200;
    }
    functions.logger.debug("\n\n\n ====> Outputs");
    functions.logger.debug(response);
    functions.logger.debug(await response.json());

    return {
        text,
        status,
        data: result
    }
}
const open_normal_HEADERS =  new Headers({
    "Content-Type": "application/json",
    'Authorization': "Bearer " + process.env.OPEN_API_KEY,
})


export const divinciRequests = async (
    resource: string,
    method: string,
    data: any
) => {

    functions.logger.debug("\n\n\n\n ====> Inputs");
    functions.logger.debug(open_URL + resource);
    functions.logger.debug(method);
    functions.logger.debug(data);

    let text = " - Uploading to this route (open AI) -> " + resource, 
        status = 500;

    let response: any | null;

    if (method != "GET") {
       response = await fetch(open_URL + resource, {
            method: method != "" ? method : "GET",
            body: JSON.stringify(data),
            headers: open_normal_HEADERS
        })
        text = "SUCCESS: Uploaded to this route (open AI) -> " + resource, 
        status = 200;
    } else {
        response = await fetch(open_URL + resource, {
            method: "GET",
            headers: open_normal_HEADERS
        })
        text = "SUCCESS: Uploaded to this route (open AI) -> " + resource, 
        status = 200;
    }

    let result = null;

    if (response.status < 300) {
        result = await response.json();
        text = " - Fetched " + resource, 
        status = 200;
    }
    functions.logger.debug("\n\n\n ====> Outputs");
    functions.logger.debug(response);
    functions.logger.debug(result);

    return {
        text,
        status,
        data: result
    }
}




const ship_URL = "https://api.shipengine.com/v1";
const ship_HEADERS =  new Headers({
    "Content-Type": "application/json",
    'API-key': "" + process.env.SHIP_ENGINE_API_KEY,
})


export const shipEngineAPIRequests = async (
    resource: string,
    method: string,
    data: any
) => {

    let text = " - Problem fetching -> " + resource, 
        status = 500;

    let response: any | null;

    if (data != null) {
       response = await fetch(ship_URL + resource, {
            method: method != "" ? method : "GET",
            body: JSON.stringify(data),
            headers: ship_HEADERS
        })
    } else {
        response = await fetch(ship_URL + resource, {
            method: "GET",
            headers: ship_HEADERS
        })
    }

    let result = null;

    if (response != null) {
        result = await response.json();
        text = " - Fetched " + resource, 
        status = 200;
    }

    return {
        text,
        status,
        data: result
    }
}