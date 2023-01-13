import * as sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

let msg = {
  to: '',
  from: 'no-reply@angelmondragon.com',
  subject: 'Thanks -- Now get imPowered!',
  text: 'Let us walk you through opening your next store, blog, app, you name it!',
  html: '<strong>and easy to do anywhere, even with Node.js & Nextjs</strong>',
};

//ES8
export const sendThankYouEmail = async (
    email: string,
) => {

    msg = {
        ...msg,
        to: email
    }
  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(error);
  }
};

