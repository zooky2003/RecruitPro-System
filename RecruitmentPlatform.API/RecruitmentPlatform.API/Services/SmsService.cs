using Twilio;
using Twilio.Rest.Api.V2010.Account;
using Twilio.Types;

namespace RecruitmentPlatform.API.Services
{
    public class SmsService
    {
        private readonly IConfiguration _config;

        public SmsService(IConfiguration config)
        {
            _config = config;
        }

        public void SendSms(string toPhoneNumber, string message)
        {
            try
            {
                var accountSid = _config["Twilio:AccountSID"];
                var authToken = _config["Twilio:AuthToken"];
                var fromNumber = _config["Twilio:FromNumber"];

                TwilioClient.Init(accountSid, authToken);

                // 🔥 0 න් පටන් ගන්නවා නම් ඔටෝම +94 කරන ලොජික් එක 🔥
                string cleanNumber = toPhoneNumber.Trim();
                if (cleanNumber.StartsWith("0"))
                {
                    cleanNumber = "+94" + cleanNumber.Substring(1);
                }

                // whatsapp: කෑල්ල නැත්නම් ඒකත් ඔටෝම දානවා
                string formattedTo = cleanNumber.StartsWith("whatsapp:") ? cleanNumber : $"whatsapp:{cleanNumber}";
                string formattedFrom = fromNumber.StartsWith("whatsapp:") ? fromNumber : $"whatsapp:{fromNumber}";

                var messageOptions = new CreateMessageOptions(new PhoneNumber(formattedTo))
                {
                    From = new PhoneNumber(formattedFrom),
                    Body = message // යවන මැසේජ් එක
                };

                MessageResource.Create(messageOptions);
                Console.WriteLine($"[SUCCESS] WhatsApp message sent successfully to {formattedTo}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Failed to send WhatsApp message: {ex.Message}");
            }
        }
    }
}