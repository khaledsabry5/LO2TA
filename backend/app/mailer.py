import logging
import httpx

from .config import settings

logger = logging.getLogger("lo2ta.mailer")

BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"


def build_otp_bodies(otp_code: str) -> tuple[str, str, str]:
    """Generates subject, plain text body, and responsive luxury HTML body for OTP email."""
    subject = f"رمز تسجيل الدخول: {otp_code} | متجر YSN"

    text_body = f"""مرحباً بك في متجر YSN (YSN Store).

رمز تسجيل الدخول لمرة واحدة (OTP) الخاص بك هو:
{otp_code}

صلاحية هذا الرمز تنتهي خلال 10 دقائق.
إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.
"""

    html_body = f"""<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>رمز تسجيل الدخول</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf9f6; margin: 0; padding: 24px; direction: rtl; text-align: right;">
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e7e5e4; box-shadow: 0 4px 16px rgba(0,0,0,0.04); overflow: hidden;">
    <tr>
      <td style="padding: 32px 28px; text-align: center;">
        <div style="font-size: 26px; font-weight: 900; letter-spacing: 3px; color: #0a0a0a; margin-bottom: 8px;">
          YSN
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #a8a29e; margin-bottom: 24px;">
          ACCESSORIES &amp; LUXURY
        </div>

        <div style="height: 1px; background-color: #f5f5f4; margin: 0 auto 24px auto;"></div>

        <h2 style="font-size: 20px; font-weight: 800; color: #1c1917; margin: 0 0 10px 0;">
          رمز التحقق لتسجيل الدخول
        </h2>
        <p style="font-size: 14px; color: #57534e; line-height: 1.6; margin: 0 0 24px 0;">
          استخدم الرمز التالي لمرة واحدة للدخول الآمن إلى حسابك في متجر YSN:
        </p>

        <div style="background-color: #fdfbf7; border: 2px dashed #faedcd; border-radius: 14px; padding: 20px 16px; margin-bottom: 24px;">
          <span style="font-size: 34px; font-weight: 900; letter-spacing: 8px; color: #0a0a0a; font-family: monospace; display: inline-block; direction: ltr;">
            {otp_code}
          </span>
        </div>

        <p style="font-size: 13px; color: #78716c; margin: 0 0 20px 0; line-height: 1.5;">
          صلاحية هذا الرمز <strong style="color: #b45309;">10 دقائق</strong> فقط.
          <br>
          يرجى عدم مشاركة هذا الرمز مع أي شخص لحماية حسابك.
        </p>

        <div style="height: 1px; background-color: #f5f5f4; margin: 24px auto 16px auto;"></div>

        <p style="font-size: 11px; color: #a8a29e; margin: 0; line-height: 1.4;">
          إذا لم تقم بطلب هذا الرمز، يمكنك تجاهل هذه الرسالة.
          <br>
          متجر YSN &copy; 2026. جميع الحقوق محفوظة.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""

    return subject, text_body, html_body


async def send_otp_email(to_email: str, otp_code: str) -> None:
    """Sends OTP email asynchronously using Brevo (Sendinblue) HTTP API.
    Bypasses SMTP port blocking on clouds like Railway.
    """
    subject, text_body, html_body = build_otp_bodies(otp_code)

    if not settings.BREVO_API_KEY:
        logger.warning(
            f"[DEV] BREVO_API_KEY is not set. OTP for {to_email}: {otp_code} (logged for development)."
        )
        return

    headers = {
        "api-key": settings.BREVO_API_KEY,
        "accept": "application/json",
        "content-type": "application/json",
    }

    payload = {
        "sender": {
            "name": settings.SMTP_FROM_NAME or "YSN Store",
            "email": settings.SMTP_FROM_EMAIL or "lo2tastore2026@gmail.com",
        },
        "to": [
            {
                "email": to_email,
            }
        ],
        "subject": subject,
        "htmlContent": html_body,
        "textContent": text_body,
    }

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.post(BREVO_API_URL, headers=headers, json=payload)
        if response.status_code not in (200, 201, 202):
            error_msg = f"Brevo API error: {response.status_code} - {response.text}"
            logger.error(error_msg)
            raise RuntimeError(error_msg)

    logger.info(f"OTP email sent successfully via Brevo HTTP API to {to_email}")
