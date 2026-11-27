using FirebaseAdmin;
using Google.Apis.Auth.OAuth2;

namespace Tracet.Infrastructure.Firebase;

public static class FirebaseSetup
{
    private static readonly Lock Sync = new();

    public static void EnsureInitialized(string serviceAccountKeyPath)
    {
        lock (Sync)
        {
            if (FirebaseApp.DefaultInstance is not null) return;

            if (!File.Exists(serviceAccountKeyPath))
            {
                Console.Error.WriteLine($"Firebase service account key not found at {serviceAccountKeyPath}; Firebase Admin features are disabled.");
                return;
            }

            FirebaseApp.Create(new AppOptions
            {
                Credential = CredentialFactory.FromFile<ServiceAccountCredential>(serviceAccountKeyPath).ToGoogleCredential()
            });
        }
    }
}
