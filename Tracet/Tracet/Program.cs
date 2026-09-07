using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;

var builder = WebApplication.CreateBuilder(args);
FirebaseApp.Create(new AppOptions
{
    Credential = GoogleCredential.FromFile("serviceAccountKey.json")
});

builder.Services.AddControllers();

var app = builder.Build();

app.UseRouting();
app.UseAuthorization();
app.MapControllers();

app.MapGet("/", () => "Tracet API is running!");

app.Run();