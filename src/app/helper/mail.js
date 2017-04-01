import nodemailer from 'nodemailer';
import config from '../config/config.json';

let transporter = nodemailer.createTransport(process.env.MAIL_NOREPLY);

export default {
  /**
   * Sends a newly subscribed user a link via email to verify the account
   * @param  {string} mailAddress User's mail address
   * @param  {string} token       User's activation token
   */
  sendActivationEmail: (userName: string, userEmail: string, token: string) => {
    const confirmationLink = 'https://meditation.sirimangalo.org/verify/' + token;

    let plainMessage = fs.readFileSync('./mail-templates/activate_account.txt', 'utf8');
    plainMessage.replace('%{{newUser}}%', userName);
    plainMessage.replace('%{{activationLink}}%', confirmationLink);

    let htmlMessageBody = fs.readFileSync('./mail-templates/activate_account.html', 'utf8');
    htmlMessageBody.replace('%{{newUser}}%', userName);
    htmlMessageBody.replace('%{{activationLink}}%', confirmationLink);

    const message = {
      from: 'noreply@sirimangalo.org',
      to: userEmail,
      subject: 'Activation link for Meditation+ account',
      text: plainMessage,
      html: htmlMessage
    };
  }
};
