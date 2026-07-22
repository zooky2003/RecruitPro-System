using System.Net;
using System.Net.Mail;
using Microsoft.Extensions.Configuration;

namespace RecruitmentPlatform.API.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;

        public EmailService(IConfiguration config)
        {
            _config = config;
        }

        public async Task SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                // appsettings.json එකෙන් ඊමේල් විස්තර ටික ගන්නවා
                var emailSettings = _config.GetSection("EmailSettings");
                var senderEmail = emailSettings["SenderEmail"];
                var appPassword = emailSettings["AppPassword"];

                // SMTP Client එක හදනවා
                var smtpClient = new SmtpClient(emailSettings["SmtpServer"])
                {
                    Port = int.Parse(emailSettings["Port"]),
                    Credentials = new NetworkCredential(senderEmail, appPassword),
                    EnableSsl = true,
                };

                // යවන්න ඕන ඊමේල් මැසේජ් එක හදනවා
                var mailMessage = new MailMessage
                {
                    From = new MailAddress(senderEmail, "RecruitPro Platform"),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true, // HTML දාලා ලස්සනට යවන්න පුළුවන්
                };

                mailMessage.To.Add(toEmail);

                // ඇත්තටම ඊමේල් එක යවනවා!
                await smtpClient.SendMailAsync(mailMessage);
                Console.WriteLine($"[SUCCESS] Real email sent to {toEmail}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to send email: {ex.Message}");
            }
        }
    }
}