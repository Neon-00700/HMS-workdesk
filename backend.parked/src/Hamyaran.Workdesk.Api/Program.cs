using System.Text;
using FluentValidation;
using FluentValidation.AspNetCore;
using Hamyaran.Workdesk.Api.Auth;
using Hamyaran.Workdesk.Api.Data;
using Hamyaran.Workdesk.Api.Hubs;
using Hamyaran.Workdesk.Api.Middleware;
using Hamyaran.Workdesk.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// ── Logging ──
builder.Host.UseSerilog((ctx, cfg) => cfg.ReadFrom.Configuration(ctx.Configuration));

// ── Database ──
builder.Services.AddDbContext<AppDbContext>(opt =>
    opt.UseSqlServer(builder.Configuration.GetConnectionString("Default")));

// ── Identity password hashing (PBKDF2, modern default) ──
builder.Services.AddScoped<IPasswordHasher<object>, PasswordHasher<object>>();

// ── JWT auth ──
var jwt = builder.Configuration.GetSection("Jwt");
var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt["Key"]!));
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = jwt["Issuer"],
            ValidAudience = jwt["Audience"],
            IssuerSigningKey = signingKey,
            ClockSkew = TimeSpan.FromMinutes(1),
        };
        // SignalR access token via query string
        opt.Events = new JwtBearerEvents
        {
            OnMessageReceived = ctx =>
            {
                var path = ctx.HttpContext.Request.Path;
                if (path.StartsWithSegments("/hubs"))
                {
                    var token = ctx.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(token)) ctx.Token = token;
                }
                return Task.CompletedTask;
            }
        };
    });

// ── Granular permissions ──
builder.Services.AddSingleton<IAuthorizationHandler, PermissionHandler>();
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermPolicyProvider>();
builder.Services.AddAuthorization();

// ── App services ──
builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<PermissionService>();
builder.Services.AddScoped<AuditService>();
builder.Services.AddScoped<FileStorageService>();
builder.Services.AddSingleton<FilePolicyService>();
builder.Services.AddSingleton<PresenceService>();
builder.Services.AddStackExchangeRedisCache(opt =>
{
    opt.Configuration = builder.Configuration.GetConnectionString("Redis");
});

// ── SignalR (+ Redis backplane when configured) ──
var signalr = builder.Services.AddSignalR();
var redisConn = builder.Configuration.GetConnectionString("Redis");
if (!string.IsNullOrWhiteSpace(redisConn))
    signalr.AddStackExchangeRedis(redisConn);

// ── Controllers + validation ──
builder.Services.AddControllers();
builder.Services.AddFluentValidationAutoValidation();
builder.Services.AddValidatorsFromAssemblyContaining<Program>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ── CORS (narrow: configured frontend origins only) ──
var origins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(opt => opt.AddPolicy("frontend", p => p
    .WithOrigins(origins)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials()));

// ── Rate limiting (login brute-force protection etc.) ──
builder.Services.AddRateLimiter(opt =>
{
    opt.AddFixedWindowLimiter("login", l =>
    {
        l.Window = TimeSpan.FromMinutes(5);
        l.PermitLimit = 20;
        l.QueueLimit = 0;
    });
    opt.AddFixedWindowLimiter("api", l =>
    {
        l.Window = TimeSpan.FromMinutes(1);
        l.PermitLimit = 300;
        l.QueueLimit = 0;
    });
});

var app = builder.Build();

app.UseMiddleware<ExceptionMiddleware>();
app.UseSerilogRequestLogging();
app.UseHttpsRedirection();
app.UseCors("frontend");
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
    // Apply migrations + seed demo data in development
    using var scope = app.Services.CreateScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await SeedData.EnsureSeededAsync(scope.ServiceProvider);
}

app.MapControllers().RequireRateLimiting("api");
app.MapHub<WorkspaceHub>("/hubs/workspace");
app.MapHub<ChatHub>("/hubs/chat");

app.Run();
