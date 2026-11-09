using LongevityDiet.Domain.Catalog.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace LongevityDiet.Repositories.Catalog.Configurations;

public sealed class RuleAuditConfiguration : IEntityTypeConfiguration<RuleAudit>
{
    public void Configure(EntityTypeBuilder<RuleAudit> builder)
    {
        builder.ToTable("RuleAudits", "catalog");
        builder.HasKey(x => x.Id);
        builder.Property(x => x.Action).HasMaxLength(40).IsRequired();
        builder.Property(x => x.Details).HasMaxLength(200).IsRequired();
        builder.HasIndex(x => new { x.RuleVersionId, x.OccurredAt });
        builder.HasOne<RuleVersion>().WithMany().HasForeignKey(x => x.RuleVersionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
