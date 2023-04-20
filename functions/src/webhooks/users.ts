import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import { decryptToken, encryptToken } from "../lib/helpers/algorithms";
import { createAppSessions, updateDocument } from "../lib/helpers/firestore";
import { User } from "../lib/types/merchants";

export const userCreated = functions.firestore
.document("/merchants/{merchantID}/users/{userID}")
.onCreate(async (snap) => {

    let user: User | null = snap.exists ? snap.data() as User : {} as User

    if (user !== null) {

        let decypted_merchant_id = "";

        try {
            decypted_merchant_id = decryptToken(user.merchant_uuid as string);
        } catch (error) {
            
        }


        // Token new api key (store scope) 
        const new_ipat = "ipat_" + crypto.randomBytes(10).toString('hex');

        try {

            // create new session (for owner)
            await createAppSessions(
                new_ipat, 
                {
                    owner: {
                        first_name: user.first_name,
                        last_name: user.last_name,
                        email: user.email,
                    },
                    merchant_uuid: user.merchant_uuid ? user.merchant_uuid : "",
                    ip_address: user.ip_address ? user.ip_address : "",
                },
                "", 
                ["OWNER"]
            );

            
        } catch (error) {
            
        }

        let encypted_ipat = "";

        try {
            encypted_ipat = encryptToken(new_ipat);
        } catch (error) {
            
        }

        try {

            // create new session (for owner)
            await updateDocument(decypted_merchant_id, "users", user.id, {
                ...user,
                updated_at: admin.firestore.Timestamp.now(),
                api_key: encypted_ipat
            })

            
        } catch (error) {
            
        }

        


    } else {
        throw new Error("[ERROR]: Internal error - customer doesn't exist");
        
    }
})