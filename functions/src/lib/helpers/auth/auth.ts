import * as express from "express";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const getAuthToken = (req: express.Request | any, res: express.Response, next: express.NextFunction) => {
    if (
      req.headers.authorization &&
      req.headers.authorization.split(' ')[0] === 'Bearer' 
      // TODO: Change [0] --> API_IMPOWERED
    ) {
      req.authToken = req.headers.authorization.split(' ')[1];
      // new tokenprovided 
    } else {
      req.authToken = null;
    }
    next();
  };
  
  
  export const checkIfAuthenticated = (req: express.Request | any, res: express.Response, next: express.NextFunction) => {
   getAuthToken(req, res, async () => {
      try {
        const { authToken } = req;
        const userInfo = await admin
          .auth()
          .verifyIdToken(authToken);
        req.authId = userInfo.uid;
        return next();
      } catch (e) {
        return res
          .status(401)
          .send({ error: 'You are not authorized to make this request' });
      }
    });
  };

export const generateAPIKey = () => {
  return [...Array(30)].map(e => ((Math.random()*36 | 0).toString(36))).join("")
}

export const hashSecret = (password: string): string => {
  const hash = crypto.createHash("sha256").update(password).digest('hex'); //('sha256').update(password).digest('hex');
  return hash;
}

export const verifySecret = (check_against: string, password: string): boolean => {
  const inputHashedPassword = hashSecret(password);
  return check_against === inputHashedPassword;
}


const algorithm = 'aes-256-cbc';
const key = 'mySecretKey'; // Replace this with your own secret key
const iv = crypto.randomBytes(16); // Generate a random initialization vector

export const encryptMsg = (text: string): string => {
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export const decryptMsg =(text: string): string => {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
