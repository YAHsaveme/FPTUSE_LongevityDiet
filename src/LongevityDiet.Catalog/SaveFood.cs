namespace LongevityDiet.Catalog;

public sealed record SaveFood(string? Name, string? Category, decimal Calories,
    decimal ProteinG, decimal CarbohydrateG, decimal FatG, bool IsPlantBased);
