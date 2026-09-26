using System.ComponentModel.DataAnnotations;

namespace LongevityDiet.API.Contracts.Auth;

public sealed record RegisterRequest(
    [Required, EmailAddress, MaxLength(320)] string Email,
    [Required, MinLength(10), MaxLength(200)] string Password,
    [Required, MinLength(2), MaxLength(120)] string DisplayName);

public sealed record LoginRequest(
    [Required, EmailAddress, MaxLength(320)] string Email,
    [Required, MaxLength(200)] string Password);
