using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace RecruitmentPlatform.API.Services
{
    public class GeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _config;

        public GeminiService(HttpClient httpClient, IConfiguration config)
        {
            _httpClient = httpClient;
            _config = config;
        }

        // 1. Job Description එකයි CV එකයි ගලපලා Score එක දෙන එක (පරණ එක)
        public async Task<decimal> GetMatchScoreAsync(string candidateSkills, string jobDescription)
        {
            var apiKey = _config["GeminiAI:ApiKey"];

            if (string.IsNullOrEmpty(apiKey))
            {
                throw new Exception("API Key එක appsettings.json එකේ හොයාගන්න බෑ!");
            }

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";
            var prompt = $"Act as an expert HR Recruiter. Compare the candidate's skills: '{candidateSkills}' with the following job description: '{jobDescription}'. Return ONLY a number between 0 and 100 representing the match percentage.";

            var requestBody = new { contents = new[] { new { parts = new[] { new { text = prompt } } } } };
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var errorResponse = await response.Content.ReadAsStringAsync();
                throw new Exception($"Google AI Error: {response.StatusCode} - {errorResponse}");
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);

            var aiResponse = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            var match = Regex.Match(aiResponse ?? "", @"\d+");

            if (match.Success && decimal.TryParse(match.Value, out decimal score))
            {
                return score > 100 ? 100 : score;
            }

            throw new Exception($"AI එකෙන් අංකයක් නෙවෙයි ආවේ. AI Answered: {aiResponse}");
        }

        // 2. අලුතින් එකතු කරපු CV එක PDF එකෙන් කියවලා JSON කරන එක (පරණ එක)
        public async Task<string> ParseResumeAsync(string resumeText)
        {
            var apiKey = _config["GeminiAI:ApiKey"];

            if (string.IsNullOrEmpty(apiKey))
            {
                throw new Exception("API Key එක appsettings.json එකේ හොයාගන්න බෑ!");
            }

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";

            var prompt = $@"
            You are an expert HR AI Assistant. Extract the following information from the provided Resume text and strictly format it as a valid JSON object. Do not include markdown code blocks like ```json. Just return the raw JSON object.
            
            Required JSON structure:
            {{
                ""phoneNumber"": ""Extracted phone number or empty string"",
                ""skills"": ""Comma separated list of top 10 technical and soft skills"",
                ""headline"": ""A professional headline generated based on their most recent role (e.g. Senior Software Engineer)"",
                ""education"": ""A short summary of their highest education"",
                ""experience"": ""A brief summary of their experience and key projects"",
                ""linkedInLink"": ""LinkedIn URL if found, else empty string"",
                ""gitHubLink"": ""GitHub URL if found, else empty string""
            }}

            Resume Text:
            {resumeText}
            ";

            var requestBody = new { contents = new[] { new { parts = new[] { new { text = prompt } } } } };
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);

            if (!response.IsSuccessStatusCode)
            {
                var errorResponse = await response.Content.ReadAsStringAsync();
                throw new Exception($"Google AI Error: {response.StatusCode} - {errorResponse}");
            }

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);

            var aiResponse = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            var extractedText = aiResponse ?? "{}";

            // Markdown json tags අයින් කරනවා
            extractedText = extractedText.Replace("```json", "").Replace("```", "").Trim();

            return extractedText;
        }

        // 🔥 3. Automated feedback generation (අලුතින් එකතු කළ එක) 🔥
        public async Task<string> GenerateFeedbackAsync(string candidateSkills, string jobDescription, string status)
        {
            var apiKey = _config["GeminiAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey)) throw new Exception("API Key එක appsettings.json එකේ හොයාගන්න බෑ!");

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";

            var prompt = $"Act as an expert HR Manager. The candidate's application status is '{status}'. Their skills: {candidateSkills}. Job description: {jobDescription}. Write a short, professional, and constructive feedback paragraph (max 3 sentences) for the candidate. If rejected, suggest exactly what skills they lack. If shortlisted, tell them why they stood out. Do not include greetings like 'Dear Candidate', just the feedback text.";

            var requestBody = new { contents = new[] { new { parts = new[] { new { text = prompt } } } } };
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);

            // Error එකක් ආවොත් සරල මැසේජ් එකක් යවනවා
            if (!response.IsSuccessStatusCode) return "We appreciate your application. Please check your dashboard for further updates.";

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);

            var aiResponse = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            return aiResponse?.Trim() ?? "We appreciate your application.";
        }

        // 🔥 4. Job recommendation generation (අලුතින් එකතු කළ එක) 🔥
        public async Task<string> GenerateJobRecommendationsAsync(string candidateSkills, string availableJobsJson)
        {
            var apiKey = _config["GeminiAI:ApiKey"];
            if (string.IsNullOrEmpty(apiKey)) throw new Exception("API Key එක appsettings.json එකේ හොයාගන්න බෑ!");

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key={apiKey}";

            var prompt = $@"
            Act as an AI Career Counselor. Here are the candidate's skills: '{candidateSkills}'. 
            Here is a JSON list of available jobs: {availableJobsJson}.
            Analyze the skills and recommend the top 3 best matching jobs. 
            Return ONLY a valid JSON array of objects with the structure: [{{ ""jobId"": int, ""reason"": ""Short sentence explaining why it's a match"" }}]. Do not include ```json tags.";

            var requestBody = new { contents = new[] { new { parts = new[] { new { text = prompt } } } } };
            var content = new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            if (!response.IsSuccessStatusCode) return "[]";

            var responseString = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(responseString);
            var aiResponse = doc.RootElement
                .GetProperty("candidates")[0]
                .GetProperty("content")
                .GetProperty("parts")[0]
                .GetProperty("text")
                .GetString();

            var extractedText = aiResponse ?? "[]";
            extractedText = extractedText.Replace("```json", "").Replace("```", "").Trim();

            return extractedText;
        }
    }
}