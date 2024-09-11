const sgMail = require('@sendgrid/mail');
require('dotenv').config();

sgMail.setApiKey(process.env.EMAIL_SECRET);

const sendEmail = (email, subject, message) => {
  const msg = {
      to: email,
      from: 'ashish2.775421@bumc.tu.edu.np',  // Use a verified sender email
      subject: subject,
      text: message,
      html: `<b>${message}</b>`,
  };
  sgMail.send(msg).then(() => {
  }).catch((error) => {
      console.error(error);
  });
};



module.exports = sendEmail;