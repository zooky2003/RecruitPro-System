using RecruitmentPlatform.API.Models;

namespace RecruitmentPlatform.API.Repositories
{
    public interface IUserRepository
    {
        Task<User?> GetUserByIdAsync(int id);
        Task<User?> GetUserByEmailAsync(string email);
        Task<User> AddUserAsync(User user);
    }
}