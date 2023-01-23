import * as sgMail from "@sendgrid/mail";
import { LineItem } from "../types/draft_rders";
sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);


//ES8
export const sendThankYouEmail = async (
    email: string,
    line_items: LineItem[]
) => {

  let items = "";
  let msg = {
    to: email,
    from: 'no-reply@angelmondragon.com',
    subject: 'Thanks -- Now get imPowered!',
    text: "Thanks for you're test purchase. Nothing was charged from your card, but to help better assist the dev team we are asking you to quickly review this list of item:",
    html: ``,
  };

  if (line_items.length > 0) {
    line_items.forEach(li => {
      items = items + "<li>" + li.title + " " + li.quantity + "</li>"
    });
    msg = {
      ...msg,
      html: `<ul>${items}</ul>`,
    };
  }

  try {
    await sgMail.send(msg);
  } catch (error) {
    console.error(error);
  }
};

