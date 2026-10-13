import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import logging
import smtplib

from .config import settings

logger = logging.getLogger("lo2ta.mailer")


def _send_otp_email_sync(to_email: str, otp_code: str) -> None:
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"رمز تسجيل الدخول: {otp_code} | متجر لقطة"
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email

    text_body = f"""مرحباً بك في متجر لقطة (Lo2ta Store).

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
        <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #0a0a0a; margin-bottom: 8px;">
          LO2TA
        </div>
        <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 3px; color: #a8a29e; margin-bottom: 24px;">
          ACCESSORIES &amp; LUXURY
        </div>

        <div style="height: 1px; background-color: #f5f5f4; margin: 0 auto 24px auto;"></div>

        <h2 style="font-size: 20px; font-weight: 800; color: #1c1917; margin: 0 0 10px 0;">
          رمز التحقق لتسجيل الدخول
        </h2>
        <p style="font-size: 14px; color: #57534e; line-height: 1.6; margin: 0 0 24px 0;">
          استخدم الرمز التالي لمرة واحدة للدخول الآمن إلى حسابك في متجر لقطة:
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
          متجر لقطة للإكسسوارات &copy; 2026. جميع الحقوق محفوظة.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>"""

    msg.attach(MIMEText(text_body, "plain", "utf-8"))
    msg.attach(MIMEText(html_body, "html", "utf-8"))

    with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=20) as server:
        server.starttls()
        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
        server.send_message(msg)

    logger.info(f"OTP email sent successfully to {to_email}")


async def send_otp_email(to_email: str, otp_code: str) -> None:
    """Sends OTP email asynchronously using asyncio.to_thread."""
    await asyncio.to_thread(_send_otp_email_sync, to_email, otp_code)
