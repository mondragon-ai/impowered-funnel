import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { decryptToken, encryptToken } from "../lib/helpers/algorithms";
import { createAppSessions, getMerchant, updateDocument, updateMerchant } from "../lib/helpers/firestore";
import { User } from "../lib/types/merchants";

export const userCreated = functions.firestore
.document("/merchants/{merchantID}/users/{userID}")
.onCreate(async (snap) => {

    let user: User | null = snap.exists ? snap.data() as User : {} as User

    if (user !== null) {

        let decypted_merchant_id = "";

        // Token new api key (store scope) 
        let new_ipat = "";

        try {
            decypted_merchant_id = decryptToken(user.merchant_uuid as string);
            new_ipat = decryptToken(user.api_key ? user.api_key : "");
        } catch (error) {
            
        }//"ipat_" + crypto.randomBytes(10).toString('hex');

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
                    ip_address: user.ip_address ? user.ip_address : ""
                },
                "",
                user.roles,
                "PLATFORM",
            );
        } catch (error) {}

        let encypted_ipat = "";

        try {
            encypted_ipat = encryptToken(new_ipat);
        } catch (error) { }

        try {
            // create new session (for owner)
            await updateDocument(decypted_merchant_id, "users", user.id, {
                ...user,
                updated_at: admin.firestore.Timestamp.now(),
                api_key: encypted_ipat
            })
        } catch (error) {
            
        }

        try {
            // create new session (for owner)
            const merchant = await getMerchant(decypted_merchant_id)

            if (merchant.status > 300) {
                throw new Error(" 🚨 [ERROR]: Could not fetch Merchant Account");
                
            }
            // create new session (for owner)
            await updateMerchant(decypted_merchant_id, {
                ...merchant,
                updated_at: admin.firestore.Timestamp.now(),
                api_keys: [encypted_ipat]
            })
        } catch (error) {
            
        }

    } else {
        throw new Error("[ERROR]: Internal error - customer doesn't exist");
        
    }
})