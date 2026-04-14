import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY;
if (apiKey) {
  sgMail.setApiKey(apiKey);
}

const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@finlogia.online';

export async function sendOcrSuccessEmail(toEmail, invoiceNumber, supplierName) {
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY is not set. Skipping success email to', toEmail);
    return;
  }

  const msg = {
    to: toEmail,
    from: fromEmail,
    subject: 'Επιτυχής επεξεργασία τιμολογίου',
    text: `Το τιμολόγιο σας επεξεργάστηκε επιτυχώς.\n\nΠρομηθευτής: ${supplierName || 'Άγνωστος'}\nΑριθμός Τιμολογίου: ${invoiceNumber || 'Άγνωστος'}\n\nΕυχαριστούμε,\nFinLogia`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #10b981;">Επιτυχής επεξεργασία τιμολογίου</h2>
        <p>Το τιμολόγιο σας επεξεργάστηκε επιτυχώς.</p>
        <ul>
          <li><strong>Προμηθευτής:</strong> ${supplierName || 'Άγνωστος'}</li>
          <li><strong>Αριθμός Τιμολογίου:</strong> ${invoiceNumber || 'Άγνωστος'}</li>
        </ul>
        <br/>
        <p>Ευχαριστούμε,<br/>FinLogia</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Success email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending success email:', error);
  }
}

export async function sendOcrErrorEmail(toEmail, errorMessage) {
  if (!apiKey) {
    console.warn('SENDGRID_API_KEY is not set. Skipping error email to', toEmail);
    return;
  }

  const msg = {
    to: toEmail,
    from: fromEmail,
    subject: 'Σφάλμα επεξεργασίας τιμολογίου',
    text: `Υπήρξε ένα σφάλμα κατά την επεξεργασία του τιμολογίου σας.\n\nΛεπτομέρειες: ${errorMessage}\n\nΕυχαριστούμε,\nFinLogia`,
    html: `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2 style="color: #ef4444;">Σφάλμα επεξεργασίας τιμολογίου</h2>
        <p>Υπήρξε ένα σφάλμα κατά την επεξεργασία του τιμολογίου σας.</p>
        <p><strong>Λεπτομέρειες:</strong> ${errorMessage}</p>
        <br/>
        <p>Ευχαριστούμε,<br/>FinLogia</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`Error email sent to ${toEmail}`);
  } catch (error) {
    console.error('Error sending error email:', error);
  }
}
