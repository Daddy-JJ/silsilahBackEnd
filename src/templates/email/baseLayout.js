/**
 * SILSILAH KELUARGA — BASE HTML EMAIL LAYOUT
 * Responsive table-based layout compatible with Gmail, Outlook, Apple Mail, and mobile clients.
 * Neo-monochrome aesthetic matching the platform design tokens (#18181b, #f7e043, #f4f4f5).
 */

const { brand } = require('../../config/emailContent');

function renderBaseEmail({
  badge = 'NOTIFIKASI RESMI',
  title = 'Pemberitahuan Sistem',
  contentHtml = '',
  buttonText = null,
  buttonUrl = null,
  extraHtml = '',
  closingHtml = null,
}) {
  const currentYear = new Date().getFullYear();

  const buttonSection = (buttonText && buttonUrl) ? `
    <!-- Action Button -->
    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <a href="${buttonUrl}" target="_blank" style="display: inline-block; background-color: #18181b; color: #ffffff; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; text-decoration: none; padding: 14px 28px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            ${buttonText} &rarr;
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  const closing = closingHtml || brand.closing || `Salam hangat,<br><strong>Tim Silsilah Keluarga</strong>`;

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; margin: auto !important; }
      .fluid { max-width: 100% !important; height: auto !important; margin-left: auto !important; margin-right: auto !important; }
      .stack-column { display: block !important; width: 100% !important; max-width: 100% !important; direction: ltr !important; }
      .mobile-padding { padding-left: 20px !important; padding-right: 20px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; color: #18181b;">
  <!-- Preheader Spacing -->
  <div style="display: none; font-size: 1px; color: #fefefe; line-height: 1px; font-family: sans-serif; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden;">
    ${title} — Silsilah Keluarga
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f4f4f5; padding: 32px 12px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table class="email-container" border="0" cellpadding="0" cellspacing="0" width="580" style="background-color: #ffffff; border-radius: 12px; border: 1px solid #e4e4e7; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
          
          <!-- Top Accent Yellow Line -->
          <tr>
            <td height="4" style="background-color: #f7e043; line-height: 4px; font-size: 4px;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 28px 36px 20px 36px; border-bottom: 1px solid #f4f4f5;">
              <table border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <table border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <!-- Yellow Badge Logo -->
                        <td width="36" height="36" align="center" valign="middle" style="background-color: #f7e043; border: 1px solid #eab308; border-radius: 6px; font-family: 'Courier New', Courier, monospace; font-size: 18px; font-weight: 900; color: #18181b;">
                          S
                        </td>
                        <td style="padding-left: 12px;">
                          <div style="font-size: 16px; font-weight: 900; color: #18181b; line-height: 1.1; letter-spacing: -0.3px;">Silsilah</div>
                          <div style="font-size: 10px; font-family: 'Courier New', Courier, monospace; color: #a1a1aa; text-transform: uppercase; letter-spacing: 1px;">COLLABORATIVE TREE</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: #f4f4f5; border: 1px solid #e4e4e7; border-radius: 4px; padding: 4px 8px; font-size: 10px; font-family: 'Courier New', Courier, monospace; font-weight: 700; color: #52525b; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${badge}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Email Content Body -->
          <tr>
            <td class="mobile-padding" style="padding: 32px 36px 36px 36px;">
              <h1 style="margin: 0 0 20px 0; font-size: 20px; font-weight: 800; color: #18181b; letter-spacing: -0.5px; line-height: 1.3;">
                ${title}
              </h1>

              <div style="font-size: 14px; line-height: 1.65; color: #3f3f46;">
                ${contentHtml}
              </div>

              ${buttonSection}

              ${extraHtml}

              <!-- Closing Signature -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #f4f4f5; font-size: 13px; line-height: 1.6; color: #52525b;">
                ${closing}
              </div>
            </td>
          </tr>

          <!-- Footer Section -->
          <tr>
            <td style="background-color: #fafafa; border-top: 1px solid #f4f4f5; padding: 24px 36px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 11px; font-family: 'Courier New', Courier, monospace; color: #71717a; text-transform: uppercase; letter-spacing: 0.8px;">
                PROJECT — SILSILAH KELUARGA
              </p>
              <p style="margin: 0 0 12px 0; font-size: 11px; line-height: 1.5; color: #a1a1aa;">
                ${brand.footerDisclaimer}
              </p>
              <p style="margin: 0; font-size: 11px; color: #a1a1aa;">
                ${brand.footerCopyright} &bull; <a href="${brand.websiteUrl}" style="color: #71717a; text-decoration: underline;">Kunjungi Website</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

module.exports = {
  renderBaseEmail,
};
