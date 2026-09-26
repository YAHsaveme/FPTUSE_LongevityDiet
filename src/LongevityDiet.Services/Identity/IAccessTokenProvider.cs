using LongevityDiet.Domain.Entities;

namespace LongevityDiet.Services.Identity;

public interface IAccessTokenProvider
{
    AccessTokenResult Create(User user);
}
