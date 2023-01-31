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

export const sendWelcomeEmail = async (
    email: string,
    type: "POLL" | "DISCOUNT" | "NEWS_LETTER" | "STORE" | "ORDER" | "CREATE" | "",
    sections: {
      type: string,
      text: string,
      option_one: string,
      option_two: string,
      [key:string]: any,
    }[]
) => {

  let msg = {
    to: email,
    from: 'no-reply@angelmondragon.com',
    subject: 'Welcome to our porject!',
    text: "",
    html: ``
  };

  if (type === "POLL") {

    const poll = sections.filter(s => {
      return s.type === "POLL"
    });

    if (poll.length > 0) {

      msg = {
        to: email,
        from: 'no-reply@angelmondragon.com',
        subject: 'Check out your results - Thanks for voting!',
        text: "Here are the results for your poll: " + poll[0].type ? poll[0].type : "",
        html: `<ul><li>${poll[0].option_one ? poll[0].option_one : ""}: ${poll[0][poll[0].option_one] ? poll[0][poll[0].option_one] : ""}</li>${poll[0].option_two ? poll[0].option_two : ""}: ${poll[0][poll[0].option_two] ? poll[0][poll[0].option_two] : ""}<li></li></ul>`
      };

      try {
        await sgMail.send(msg);
      } catch (error) {
        console.error(error);
      }
    }
  }

};

