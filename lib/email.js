import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD,
    },
});

/**
 * Send an email notification
 * @param {string[]} to - Array of email addresses
 * @param {string} subject - Email subject
 * @param {string} html - Email body (HTML)
 */
export async function sendEmail(to, subject, html) {
    if (!to || to.length === 0) return;

    try {
        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: to.join(', '),
            subject,
            html,
        });
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
