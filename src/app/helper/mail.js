import nodemailer from 'nodemailer';
import fs from 'fs';

let transporter = nodemailer.createTransport({
  sendmail: true,
  newline: 'unix',
  path: '/usr/sbin/sendmail'
});


/**
 * Creates a message from a template. For each template there must exist
 * a folder named after the template containing a 'mail.html' and a 'mail.txt'
 * file in '/src/app/helper/mail-templates'.
 *
 * @param  {string} template      Name of the template / folder containing template files
 * @param  {Object} replacements  Object containing custom data to insert into message (has to be marked like '{{myProp}}' in the template)
 * @return {Object}               Object containing message as plain text and HTML file
 */
const createMessage = (template: string, replacements: Object) => {
  let plain = fs.readFileSync(__dirname + '/mail-templates/' + template + '/mail.txt', 'utf8');
  let html = fs.readFileSync(__dirname + '/mail-templates/' + template + '/mail.html', 'utf8');

  for (let key in replacements) {
    plain = plain.replace('{{' + key + '}}', replacements[key]);
    html = html .replace('{{' + key + '}}', replacements[key]);
  }

  return {
    plain: plain,
    html: html
  };
};

export default {
  /**
   * Sends a newly registered user a link via email to verify the account
   *
   * @param  {string} userName    User's name
   * @param  {string} mailAddress User's mail address
   * @param  {string} token       User's activation token
   */
  sendActivationEmail: (userName: string, userEmail: string, token: string, callback = null) => {
    if (!transporter) {
      return;
    }

    const activationLink = 'https://meditation.sirimangalo.org/login;verify=' + token;
    const message = createMessage('activate_account', {
      userName: userName,
      activationLink: activationLink
    });

    transporter.sendMail({
      from: 'noreply@sirimangalo.org',
      to: userEmail,
      subject: 'Meditation+ Account Activation',
      text: message.plain,
      html: message.html
    }, callback);
  }
};
