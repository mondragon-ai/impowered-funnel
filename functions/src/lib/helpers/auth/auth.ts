import * as express from "express";
import * as admin from "firebase-admin";

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