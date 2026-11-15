using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using LongevityDiet.Domain.Catalog.Entities;
using LongevityDiet.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace LongevityDiet.IntegrationTests;

public sealed class CatalogApiTests : IClassFixture<IntegrationTestWebApplicationFactory>
{
    private readonly IntegrationTestWebApplicationFactory _factory;

    public CatalogApiTests(IntegrationTestWebApplicationFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task MemberCatalog_WithoutToken_ReturnsUnauthorized()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        var response = await client.GetAsync("/api/v1/foods");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task MemberToken_CannotUseAdminCatalog()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        var session = await RegisterAsync(client);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", session.AccessToken);

        var response = await client.GetAsync("/api/v1/admin/foods");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task MemberFood_MissingResource_ReturnsProblemDetailsNotFound()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        var session = await RegisterAsync(client);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", session.AccessToken);

        var response = await client.GetAsync($"/api/v1/foods/{Guid.NewGuid()}");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task AdminFood_InvalidInput_ReturnsProblemDetailsBadRequest()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsAdminAsync(client);

        var response = await client.PostAsJsonAsync(
            "/api/v1/admin/foods",
            CreateFoodRequest(string.Empty));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task AdminFood_CreateQueryDeactivate_UsesExpectedHttpSemantics()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsAdminAsync(client);

        var create = await client.PostAsJsonAsync(
            "/api/v1/admin/foods",
            CreateFoodRequest("Lentils"));

        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        Assert.NotNull(create.Headers.Location);

        using var createdJson = JsonDocument.Parse(await create.Content.ReadAsStringAsync());
        var foodId = createdJson.RootElement.GetProperty("id").GetGuid();
        Assert.Equal($"/api/v1/foods/{foodId}", create.Headers.Location!.OriginalString);

        var memberGet = await client.GetAsync($"/api/v1/foods/{foodId}");
        Assert.Equal(HttpStatusCode.OK, memberGet.StatusCode);

        var invalidPage = await client.GetAsync("/api/v1/foods?pageSize=101");
        Assert.Equal(HttpStatusCode.BadRequest, invalidPage.StatusCode);
        Assert.Equal("application/problem+json", invalidPage.Content.Headers.ContentType?.MediaType);

        var deactivate = await client.DeleteAsync($"/api/v1/admin/foods/{foodId}");
        Assert.Equal(HttpStatusCode.NoContent, deactivate.StatusCode);

        var hiddenFromMember = await client.GetAsync($"/api/v1/foods/{foodId}");
        Assert.Equal(HttpStatusCode.NotFound, hiddenFromMember.StatusCode);

        var adminList = await client.GetAsync("/api/v1/admin/foods?page=1&pageSize=20");
        Assert.Equal(HttpStatusCode.OK, adminList.StatusCode);

        using var adminListJson = JsonDocument.Parse(await adminList.Content.ReadAsStringAsync());
        var item = Assert.Single(adminListJson.RootElement.GetProperty("items").EnumerateArray());
        Assert.Equal(foodId, item.GetProperty("id").GetGuid());
        Assert.False(item.GetProperty("isActive").GetBoolean());

        // Admin can intentionally inspect archived catalog rows, but the member cannot.
        var inactive = await client.GetAsync("/api/v1/admin/foods?isActive=false");
        Assert.Equal(HttpStatusCode.OK, inactive.StatusCode);
        using (var json = JsonDocument.Parse(await inactive.Content.ReadAsStringAsync()))
            Assert.Equal(foodId, Assert.Single(json.RootElement.GetProperty("items").EnumerateArray()).GetProperty("id").GetGuid());

        var active = await client.GetAsync("/api/v1/admin/foods?isActive=true");
        Assert.Equal(HttpStatusCode.OK, active.StatusCode);
        using (var json = JsonDocument.Parse(await active.Content.ReadAsStringAsync()))
            Assert.Empty(json.RootElement.GetProperty("items").EnumerateArray());

        var memberCannotShowInactive = await client.GetAsync("/api/v1/foods?isActive=false");
        Assert.Equal(HttpStatusCode.OK, memberCannotShowInactive.StatusCode);
        using (var json = JsonDocument.Parse(await memberCannotShowInactive.Content.ReadAsStringAsync()))
            Assert.Empty(json.RootElement.GetProperty("items").EnumerateArray());
    }

    [Fact]
    public async Task FoodCollection_SearchFilterSortAndPagination_AreServerSideAndDeterministic()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsAdminAsync(client);

        foreach (var request in new[]
                 {
                     CreateFoodRequest("Lentil Alpha", 110m, isLegume: true),
                     CreateFoodRequest("Lentil Beta", 140m, isLegume: true),
                     CreateFoodRequest("Lentil Fish", 210m, isLegume: false, isFish: true),
                 })
        {
            var create = await client.PostAsJsonAsync("/api/v1/admin/foods", request);
            Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        }

        const string query =
            "/api/v1/foods?page=1&pageSize=1&search=lentil&isLegume=true&sortBy=calories&sortDirection=desc";

        var firstResponse = await client.GetAsync(query);
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        using var firstJson = JsonDocument.Parse(await firstResponse.Content.ReadAsStringAsync());
        var root = firstJson.RootElement;
        Assert.Equal(1, root.GetProperty("page").GetInt32());
        Assert.Equal(1, root.GetProperty("pageSize").GetInt32());
        Assert.Equal(2, root.GetProperty("totalItems").GetInt32());
        Assert.Equal(2, root.GetProperty("totalPages").GetInt32());

        var firstItem = Assert.Single(root.GetProperty("items").EnumerateArray());
        Assert.Equal("Lentil Beta", firstItem.GetProperty("name").GetString());
        var firstId = firstItem.GetProperty("id").GetGuid();

        var repeatResponse = await client.GetAsync(query);
        using var repeatJson = JsonDocument.Parse(await repeatResponse.Content.ReadAsStringAsync());
        var repeatItem = Assert.Single(repeatJson.RootElement.GetProperty("items").EnumerateArray());
        Assert.Equal(firstId, repeatItem.GetProperty("id").GetGuid());

        var secondPage = await client.GetAsync(
            "/api/v1/foods?page=2&pageSize=1&search=lentil&isLegume=true&sortBy=calories&sortDirection=desc");
        using var secondJson = JsonDocument.Parse(await secondPage.Content.ReadAsStringAsync());
        var secondItem = Assert.Single(secondJson.RootElement.GetProperty("items").EnumerateArray());
        Assert.Equal("Lentil Alpha", secondItem.GetProperty("name").GetString());
    }

    [Fact]
    public async Task AdminRecipe_CompositionSoftDeleteRestoreAndHistory_ArePersisted()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsAdminAsync(client);

        async Task<Guid> CreateFoodAsync(string name)
        {
            var response = await client.PostAsJsonAsync(
                "/api/v1/admin/foods", CreateFoodRequest(name));
            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            using var json = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return json.RootElement.GetProperty("id").GetGuid();
        }

        var foodA = await CreateFoodAsync("QA History Lentils");
        var foodB = await CreateFoodAsync("QA History Brown Rice");
        var allergenId = Guid.NewGuid();
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            db.Allergens.Add(new Allergen
            {
                Id = allergenId, Code = "QA_HISTORY_ALLERGEN", Name = "Synthetic QA allergen", IsActive = true,
            });
            await db.SaveChangesAsync();
        }

        object Payload(decimal amount, bool includeSecond, bool includeAllergen) => new
        {
            Name = "History regression bowl",
            Description = "Synthetic historical ingredient regression",
            Category = "Main", Cuisine = "Vietnamese", Tags = "qa",
            ServingCount = 1, PrepMinutes = 10,
            CaloriesPerServing = 420m, ProteinGPerServing = 16m,
            CarbohydrateGPerServing = 60m, FatGPerServing = 10m,
            SaturatedFatGPerServing = 1m, SugarGPerServing = 1m, FiberGPerServing = 10m,
            IsPlantForward = true, HasLegume = true, HasWholeGrain = true, HasFish = false,
            Ingredients = includeSecond
                ? new[]
                {
                    new { FoodId = foodA, Amount = amount, Unit = "g", IsOptional = false },
                    new { FoodId = foodB, Amount = 50m, Unit = "g", IsOptional = true },
                }
                : new[] { new { FoodId = foodA, Amount = amount, Unit = "g", IsOptional = false } },
            AllergenIds = includeAllergen ? new[] { allergenId } : Array.Empty<Guid>(),
        };

        var create = await client.PostAsJsonAsync(
            "/api/v1/admin/recipes", Payload(110m, true, true));
        Assert.Equal(HttpStatusCode.Created, create.StatusCode);
        using var created = JsonDocument.Parse(await create.Content.ReadAsStringAsync());
        var recipeId = created.RootElement.GetProperty("id").GetGuid();

        var remove = await client.PutAsJsonAsync(
            $"/api/v1/admin/recipes/{recipeId}", Payload(160m, false, false));
        Assert.Equal(HttpStatusCode.OK, remove.StatusCode);
        using (var responseJson = JsonDocument.Parse(await remove.Content.ReadAsStringAsync()))
        {
            Assert.Single(responseJson.RootElement.GetProperty("ingredients").EnumerateArray());
            Assert.Empty(responseJson.RootElement.GetProperty("allergens").EnumerateArray());
        }

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            var archived = await db.RecipeIngredients.IgnoreQueryFilters()
                .SingleAsync(x => x.RecipeId == recipeId && x.FoodId == foodB);
            Assert.True(archived.IsDeleted);
            Assert.NotNull(archived.DeletedAt);
            var archivedAllergen = await db.RecipeAllergens.IgnoreQueryFilters()
                .SingleAsync(x => x.RecipeId == recipeId && x.AllergenId == allergenId);
            Assert.True(archivedAllergen.IsDeleted);
            Assert.NotNull(archivedAllergen.DeletedAt);
        }

        var historyPage = await client.GetAsync(
            $"/api/v1/admin/recipes/{recipeId}/history?page=1&pageSize=1");
        Assert.Equal(HttpStatusCode.OK, historyPage.StatusCode);
        using (var json = JsonDocument.Parse(await historyPage.Content.ReadAsStringAsync()))
        {
            Assert.Equal(2, json.RootElement.GetProperty("totalItems").GetInt32());
            Assert.Equal(2, json.RootElement.GetProperty("totalPages").GetInt32());
            Assert.Single(json.RootElement.GetProperty("items").EnumerateArray());
        }

        var restore = await client.PutAsJsonAsync(
            $"/api/v1/admin/recipes/{recipeId}", Payload(170m, true, true));
        Assert.Equal(HttpStatusCode.OK, restore.StatusCode);
        using (var restored = JsonDocument.Parse(await restore.Content.ReadAsStringAsync()))
        {
            Assert.Equal(2, restored.RootElement.GetProperty("ingredients").GetArrayLength());
            Assert.Single(restored.RootElement.GetProperty("allergens").EnumerateArray());
        }

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            var rows = await db.RecipeIngredients.IgnoreQueryFilters()
                .Where(x => x.RecipeId == recipeId).ToListAsync();
            Assert.Equal(2, rows.Count);
            Assert.All(rows, x => Assert.False(x.IsDeleted));
            Assert.All(rows, x => Assert.Null(x.DeletedAt));
            var restoredAllergen = await db.RecipeAllergens.IgnoreQueryFilters()
                .SingleAsync(x => x.RecipeId == recipeId && x.AllergenId == allergenId);
            Assert.False(restoredAllergen.IsDeleted);

            var revisions = await db.RecipeCompositionRevisions.AsNoTracking()
                .Where(x => x.RecipeId == recipeId).ToListAsync();
            Assert.Equal(3, revisions.Count);
            using var original = JsonDocument.Parse(
                Assert.Single(revisions, x => x.ChangeType == "Created").SnapshotJson);
            Assert.Equal(2, original.RootElement.GetProperty("ingredients").GetArrayLength());
            Assert.Single(original.RootElement.GetProperty("allergens").EnumerateArray());
            Assert.Contains(original.RootElement.GetProperty("ingredients").EnumerateArray(),
                x => x.GetProperty("amount").GetDecimal() == 110m);
            using var middle = JsonDocument.Parse(
                Assert.Single(revisions, x => x.ChangeType == "Updated" &&
                    x.SnapshotJson.Contains("160")).SnapshotJson);
            Assert.Single(middle.RootElement.GetProperty("ingredients").EnumerateArray());
            Assert.Empty(middle.RootElement.GetProperty("allergens").EnumerateArray());
        }

        // A future code path cannot bypass soft removal by calling DbSet.Remove.
        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            var activeIngredient = await db.RecipeIngredients
                .SingleAsync(x => x.RecipeId == recipeId && x.FoodId == foodB);
            db.RecipeIngredients.Remove(activeIngredient);
            await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
        }

        var deactivate = await client.DeleteAsync($"/api/v1/admin/recipes/{recipeId}");
        Assert.Equal(HttpStatusCode.NoContent, deactivate.StatusCode);
        var hidden = await client.GetAsync($"/api/v1/recipes/{recipeId}");
        Assert.Equal(HttpStatusCode.NotFound, hidden.StatusCode);

        await using (var scope = _factory.Services.CreateAsyncScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<LongevityDietDbContext>();
            var revisions = await db.RecipeCompositionRevisions
                .Where(x => x.RecipeId == recipeId).ToListAsync();
            Assert.Equal(4, revisions.Count);
            var finalRevision = Assert.Single(revisions, x => x.ChangeType == "Deactivated");
            using var snapshot = JsonDocument.Parse(finalRevision.SnapshotJson);
            Assert.False(snapshot.RootElement.GetProperty("isActive").GetBoolean());
            finalRevision.SnapshotJson = "{}";
            await Assert.ThrowsAsync<InvalidOperationException>(() => db.SaveChangesAsync());
        }
    }

    [Fact]
    public async Task AdminRecipe_CreateThenUpdateSameIngredient_DoesNotConflictWithEfTracking()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsAdminAsync(client);

        var createFood = await client.PostAsJsonAsync(
            "/api/v1/admin/foods",
            CreateFoodRequest("Recipe Lentils"));
        Assert.Equal(HttpStatusCode.Created, createFood.StatusCode);

        using var foodJson = JsonDocument.Parse(await createFood.Content.ReadAsStringAsync());
        var foodId = foodJson.RootElement.GetProperty("id").GetGuid();

        object RecipePayload(decimal amount, string description) => new
        {
            Name = "Lentil Bowl",
            Description = description,
            Category = "Main",
            Cuisine = "Mediterranean",
            Tags = "legume",
            ServingCount = 2,
            PrepMinutes = 20,
            CaloriesPerServing = 330m,
            ProteinGPerServing = 16m,
            CarbohydrateGPerServing = 52m,
            FatGPerServing = 7m,
            SaturatedFatGPerServing = 1m,
            SugarGPerServing = 4m,
            FiberGPerServing = 11m,
            IsPlantForward = true,
            HasLegume = true,
            HasWholeGrain = false,
            HasFish = false,
            Ingredients = new[]
            {
                new { FoodId = foodId, Amount = amount, Unit = "g", IsOptional = false },
            },
            AllergenIds = Array.Empty<Guid>(),
        };

        var createRecipe = await client.PostAsJsonAsync(
            "/api/v1/admin/recipes",
            RecipePayload(120m, "Initial recipe"));
        Assert.Equal(HttpStatusCode.Created, createRecipe.StatusCode);

        using var recipeJson = JsonDocument.Parse(await createRecipe.Content.ReadAsStringAsync());
        var recipeId = recipeJson.RootElement.GetProperty("id").GetGuid();

        var update = await client.PutAsJsonAsync(
            $"/api/v1/admin/recipes/{recipeId}",
            RecipePayload(180m, "Updated recipe"));
        Assert.Equal(HttpStatusCode.OK, update.StatusCode);

        using var updatedJson = JsonDocument.Parse(await update.Content.ReadAsStringAsync());
        Assert.Equal("Updated recipe", updatedJson.RootElement.GetProperty("description").GetString());
        var ingredient = Assert.Single(updatedJson.RootElement.GetProperty("ingredients").EnumerateArray());
        Assert.Equal(180m, ingredient.GetProperty("amount").GetDecimal());
        Assert.Equal(foodId, ingredient.GetProperty("foodId").GetGuid());
    }

    [Fact]
    public async Task AdminCreatedRecipe_AppearsAsMemberPlanCandidate_AndDeactivationRemovesIt()
    {
        await _factory.ResetDatabaseAsync();
        using var admin = _factory.CreateHttpsClient();
        await AuthenticateAsAdminAsync(admin);

        var foodResponse = await admin.PostAsJsonAsync("/api/v1/admin/foods",
            CreateFoodRequest("Verified QA lentils"));
        Assert.Equal(HttpStatusCode.Created, foodResponse.StatusCode);
        using var foodJson = JsonDocument.Parse(await foodResponse.Content.ReadAsStringAsync());
        var foodId = foodJson.RootElement.GetProperty("id").GetGuid();

        var recipeResponse = await admin.PostAsJsonAsync("/api/v1/admin/recipes", new
        {
            Name = "QA plant-forward lentil bowl",
            Description = "Verified test recipe with one explicit ingredient and entered nutrients",
            Category = "Lunch",
            Cuisine = "Vietnamese",
            Tags = "plant-forward",
            ServingCount = 1, PrepMinutes = 20,
            CaloriesPerServing = 420m, ProteinGPerServing = 16m,
            CarbohydrateGPerServing = 58m, FatGPerServing = 10m,
            SaturatedFatGPerServing = 1m, SugarGPerServing = 3m,
            FiberGPerServing = 11m,
            IsPlantForward = true, HasLegume = true,
            HasWholeGrain = false, HasFish = false,
            Ingredients = new[] { new { FoodId = foodId, Amount = 120m, Unit = "g", IsOptional = false } },
            AllergenIds = Array.Empty<Guid>(),
        });
        Assert.Equal(HttpStatusCode.Created, recipeResponse.StatusCode);
        using var recipeJson = JsonDocument.Parse(await recipeResponse.Content.ReadAsStringAsync());
        var recipeId = recipeJson.RootElement.GetProperty("id").GetGuid();
        var candidateCode = $"CAT-{recipeId:N}";

        // The same scoped catalog API is available to an ordinary signed-in user.
        using var member = _factory.CreateHttpsClient();
        var memberSession = await RegisterAsync(member);
        member.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", memberSession.AccessToken);

        var response = await member.GetAsync("/api/v1/meal-plans/candidates");
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var candidatesJson = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var candidate = Assert.Single(candidatesJson.RootElement.EnumerateArray(),
            item => item.GetProperty("candidateCode").GetString() == candidateCode);
        Assert.Equal("QA plant-forward lentil bowl", candidate.GetProperty("title").GetString());
        Assert.Equal(420, candidate.GetProperty("caloriesKcal").GetInt32());
        Assert.Contains(candidate.GetProperty("supportedSlots").EnumerateArray(),
            slot => slot.GetString() == "Lunch");

        var deactivate = await admin.DeleteAsync($"/api/v1/admin/recipes/{recipeId}");
        Assert.Equal(HttpStatusCode.NoContent, deactivate.StatusCode);
        using var afterJson = JsonDocument.Parse(
            await (await member.GetAsync("/api/v1/meal-plans/candidates")).Content.ReadAsStringAsync());
        Assert.DoesNotContain(afterJson.RootElement.EnumerateArray(),
            item => item.GetProperty("candidateCode").GetString() == candidateCode);
    }

    [Fact]
    public async Task RulePublish_PublishedVersionBecomesImmutable()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();
        await AuthenticateAsAdminAsync(client);

        var createRule = await client.PostAsJsonAsync(
            "/api/v1/admin/diet-rules",
            new
            {
                RuleKey = "PLANT_FORWARD",
                Title = "Plant-forward pattern",
                Description = "Prefer a mostly plant-forward dietary pattern.",
                Category = "FoodPattern",
                IsMedicalSensitive = false,
            });

        Assert.Equal(HttpStatusCode.Created, createRule.StatusCode);
        using var ruleJson = JsonDocument.Parse(await createRule.Content.ReadAsStringAsync());
        var ruleId = ruleJson.RootElement.GetProperty("id").GetGuid();

        var versionPayload = new
        {
            ParametersJson = "{\"weight\":1}",
            SourceUrl = "https://www.fondazionevalterlongo.org/en/longevity-diet-for-adults/",
            SourceType = 2,
            Citation = "Longo Foundation adult longevity diet guidance",
            EvidenceLevel = 2,
            EffectiveAt = (DateTimeOffset?)null,
        };

        var createVersion = await client.PostAsJsonAsync(
            $"/api/v1/admin/diet-rules/{ruleId}/versions",
            versionPayload);

        Assert.Equal(HttpStatusCode.Created, createVersion.StatusCode);
        using var versionJson = JsonDocument.Parse(await createVersion.Content.ReadAsStringAsync());
        var versionId = versionJson.RootElement.GetProperty("id").GetGuid();

        var submit = await client.PostAsync($"/api/v1/admin/rule-versions/{versionId}/review", null);
        Assert.Equal(HttpStatusCode.OK, submit.StatusCode);

        using var reviewer = _factory.CreateHttpsClient();
        await AuthenticateAsAdminAsync(reviewer);
        var publish = await reviewer.PostAsync(
            $"/api/v1/admin/rule-versions/{versionId}/publication",
            content: null);

        Assert.Equal(HttpStatusCode.OK, publish.StatusCode);

        var updatePublished = await client.PutAsJsonAsync(
            $"/api/v1/admin/rule-versions/{versionId}",
            versionPayload with { ParametersJson = "{\"weight\":2}" });

        Assert.Equal(HttpStatusCode.Conflict, updatePublished.StatusCode);

        var memberRules = await client.GetAsync("/api/v1/diet-rules");
        Assert.Equal(HttpStatusCode.OK, memberRules.StatusCode);

        using var rulesJson = JsonDocument.Parse(await memberRules.Content.ReadAsStringAsync());
        var rule = Assert.Single(rulesJson.RootElement.EnumerateArray());
        var publishedVersion = Assert.Single(rule.GetProperty("versions").EnumerateArray());
        Assert.Equal(2, publishedVersion.GetProperty("state").GetInt32());
    }

    [Fact]
    public async Task OpenApi_ContainsCatalogAdminSecurityAndResponseMetadata()
    {
        await _factory.ResetDatabaseAsync();
        using var client = _factory.CreateHttpsClient();

        var response = await client.GetAsync("/openapi/v1.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        var adminFoodPost = document.RootElement
            .GetProperty("paths")
            .GetProperty("/api/v1/admin/foods")
            .GetProperty("post");

        Assert.True(adminFoodPost.GetProperty("security").GetArrayLength() > 0);
        var responses = adminFoodPost.GetProperty("responses");
        Assert.True(responses.TryGetProperty("201", out _));
        Assert.True(responses.TryGetProperty("400", out _));
    }

    private async Task AuthenticateAsAdminAsync(HttpClient client)
    {
        var registration = CreateRegistration();
        var register = await client.PostAsJsonAsync("/api/v1/auth/register", registration);
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);

        await _factory.PromoteUserToAdminAsync(registration.Email);

        var login = await client.PostAsJsonAsync(
            "/api/v1/auth/login",
            new { registration.Email, registration.Password });

        Assert.Equal(HttpStatusCode.OK, login.StatusCode);
        var session = await login.Content.ReadFromJsonAsync<AuthSessionResponse>();
        Assert.NotNull(session);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", session.AccessToken);
    }

    private static async Task<AuthSessionResponse> RegisterAsync(HttpClient client)
    {
        var registration = CreateRegistration();
        var register = await client.PostAsJsonAsync("/api/v1/auth/register", registration);
        Assert.Equal(HttpStatusCode.Created, register.StatusCode);

        var session = await register.Content.ReadFromJsonAsync<AuthSessionResponse>();
        Assert.NotNull(session);
        return session;
    }

    private static RegistrationRequest CreateRegistration()
    {
        var suffix = Guid.NewGuid().ToString("N");
        return new RegistrationRequest(
            $"catalog-{suffix}@example.test",
            "StrongPass123!",
            "Catalog Tester");
    }

    private static object CreateFoodRequest(
        string name,
        decimal calories = 116m,
        bool isLegume = true,
        bool isFish = false) =>
        new
        {
            Name = name,
            Category = isFish ? "Fish" : "Legume",
            Tags = isFish ? "fish" : "plant-forward",
            Cuisine = "Mediterranean",
            DefaultServingAmount = 100m,
            ServingUnit = "g",
            Calories = calories,
            ProteinG = 9m,
            CarbohydrateG = 20m,
            FatG = 0.4m,
            SaturatedFatG = 0.1m,
            SugarG = 1.8m,
            FiberG = 7.9m,
            IsPlantBased = !isFish,
            IsLegume = isLegume,
            IsWholeGrain = false,
            IsFish = isFish,
        };

    private sealed record RegistrationRequest(string Email, string Password, string DisplayName);

    private sealed record AuthSessionResponse(
        string AccessToken,
        DateTimeOffset AccessTokenExpiresAt,
        SessionUserResponse User);

    private sealed record SessionUserResponse(
        Guid Id,
        string Email,
        string DisplayName,
        string Role,
        bool ProfileCompleted);
}
