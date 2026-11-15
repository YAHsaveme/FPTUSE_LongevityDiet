using LongevityDiet.Domain.Catalog.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LongevityDiet.Repositories.Catalog.Configurations;

public sealed class RecipeCompositionRevisionConfiguration : IEntityTypeConfiguration<RecipeCompositionRevision>
{
    public void Configure(EntityTypeBuilder<RecipeCompositionRevision> builder)
    {
        builder.ToTable("RecipeCompositionRevisions", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Id).ValueGeneratedOnAdd();
        builder.Property(x => x.ChangeType).HasMaxLength(24).IsRequired();
        // Let each provider map its native unbounded text type (SQL Server NVARCHAR(MAX), SQLite TEXT).
        builder.Property(x => x.SnapshotJson).IsRequired();
        builder.HasIndex(x => new { x.RecipeId, x.RecordedAt });
        builder.HasOne(x => x.Recipe)
            .WithMany(x => x.Revisions)
            .HasForeignKey(x => x.RecipeId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
