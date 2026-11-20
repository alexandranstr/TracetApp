using System.ComponentModel.DataAnnotations;

namespace Tracet.DTOs;

public class ToggleTwoFactorDto
{
    [Required]
    public bool Enable { get; set; }
}