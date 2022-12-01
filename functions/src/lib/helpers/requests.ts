import fetch, { Headers } from "node-fetch";

const URL = "https://connect.squareupsandbox.com/v2";
const HEADERS =  new Headers({
    "Content-Type": "application/json",
    "Square-Version": "2022-10-19",
    'Authorization': "Bearer " + process.env.SQUARE_ACCESS_TOKEN,
})

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
    console.log("WITH BODY");
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