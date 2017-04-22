import nodemailer from 'nodemailer';
import fs from 'fs';
import config from '../../config/config.json';
import User from '../models/user.model.js';

let transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 25,
  ignoreTLS: true
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
  sendActivationEmail: (user, callback = null) => {
    if (!transporter) {
      return;
    }

    const activationLink = config.HOST + '/login;verify=' + user.verifyToken;
    const message = createMessage('activate_account', {
      userName: user.name,
      activationLink: activationLink
    });

    transporter.sendMail({
      from: 'noreply@sirimangalo.org',
      to: user.local.email,
      subject: 'Meditation+ Account Activation',
      text: message.plain,
      html: message.html
    }, callback);
  },
  sendRecoveryEmail: (user, callback = null) => {
    if (!transporter) {
      return;
    }

    const recoveryLink =
      config.HOST + '/reset-password;user=' +  user._id + ';token=' + user.verifyToken;

    const message = createMessage('recover_password', {
      userName: user.name,
      recoveryLink: recoveryLink
    });

    transporter.sendMail({
      from: 'noreply@sirimangalo.org',
      to: user.local.email,
      subject: 'Meditation+ Password Recovery',
      text: message.plain,
      html: message.html
    }, callback);
  },
  sendTestimonialNotification: (testimonial, callback = null) => {
    if (!transporter) {
      return;
    }

    User
      .find({
        role: 'ROLE_ADMIN',
        subscribeTestimonials: true
      })
      .then(res => {
        res.map(user => {
          let message = createMessage('testimonial_notification', {
            testimonialText: testimonial.text,
            reviewLink: config.HOST + '/admin/testimonials'
          });

          transporter.sendMail({
            from: 'noreply@sirimangalo.org',
            to: user.local.email,
            subject: 'Meditation+ New Testimonial',
            text: message.plain,
            html: message.html
          }, callback);
        });
      });
  }
};
