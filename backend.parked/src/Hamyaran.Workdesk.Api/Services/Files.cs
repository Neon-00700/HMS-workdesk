using System.Text.RegularExpressions;

namespace Hamyaran.Workdesk.Api.Services;

public sealed record UploadPolicy(
    string Key,
    string[] Extensions,
    long MaxSizeBytes,
    int MaxFiles,
    string Label);

/* ─── Server-side file policy (source of truth; client mirrors it) ─── */
public sealed class FilePolicyService
{
    public static readonly IReadOnlyDictionary<string, UploadPolicy> Policies =
        new Dictionary<string, UploadPolicy>
        {
            ["avatar"] = new("avatar", ["png", "jpg", "jpeg", "webp"], 2 * 1024 * 1024, 1, "تصویر پروفایل"),
            ["chatImage"] = new("chatImage", ["png", "jpg", "jpeg", "webp", "gif"], 10 * 1024 * 1024, 5, "تصویر چت"),
            ["chatFile"] = new("chatFile", ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "zip", "png", "jpg", "jpeg", "webp"], 25 * 1024 * 1024, 5, "فایل چت"),
            ["taskAttachment"] = new("taskAttachment", ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "zip", "png", "jpg", "jpeg", "webp", "fig", "sql"], 50 * 1024 * 1024, 10, "پیوست تسک"),
            ["projectFile"] = new("projectFile", ["pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "md", "zip", "png", "jpg", "jpeg", "webp", "fig", "sql", "csv"], 100 * 1024 * 1024, 10, "فایل پروژه"),
            ["chatBackground"] = new("chatBackground", ["png", "jpg", "jpeg", "webp"], 5 * 1024 * 1024, 1, "پس‌زمینه چت"),
        };

    // Magic-number sniffing — never trust client MIME.
    private static readonly Dictionary<string, byte[][]> Signatures = new()
    {
        ["png"] = [new byte[] { 0x89, 0x50, 0x4E, 0x47 }],
        ["jpg"] = [new byte[] { 0xFF, 0xD8, 0xFF }],
        ["jpeg"] = [new byte[] { 0xFF, 0xD8, 0xFF }],
        ["webp"] = [new byte[] { 0x52, 0x49, 0x46, 0x46 }],
        ["gif"] = [new byte[] { 0x47, 0x49, 0x46, 0x38 }],
        ["pdf"] = [new byte[] { 0x25, 0x50, 0x44, 0x46 }],
        ["zip"] = [new byte[] { 0x50, 0x4B, 0x03, 0x04 }, new byte[] { 0x50, 0x4B, 0x05, 0x06 }],
    };

    private static readonly string[] BlockedExtensions =
        ["exe", "dll", "bat", "cmd", "ps1", "sh", "msi", "com", "scr", "js", "html", "htm", "svg"];

    public (bool Ok, string? Error, string SafeName) Validate(
        string policyKey, string fileName, long sizeBytes, ReadOnlySpan<byte> head)
    {
        if (!Policies.TryGetValue(policyKey, out var policy))
            return (false, "سیاست آپلود نامعتبر است.", "");

        var safe = Sanitize(fileName);
        var ext = Path.GetExtension(safe).TrimStart('.').ToLowerInvariant();

        if (BlockedExtensions.Contains(ext))
            return (false, "این نوع فایل به دلایل امنیتی مجاز نیست.", safe);
        if (string.IsNullOrEmpty(ext) || !policy.Extensions.Contains(ext))
            return (false, $"فرمت «{ext}» مجاز نیست. مجاز: {string.Join("، ", policy.Extensions)}", safe);
        if (sizeBytes <= 0) return (false, "فایل خالی است.", safe);
        if (sizeBytes > policy.MaxSizeBytes)
            return (false, $"حجم فایل بیش از حد مجاز است (حداکثر {policy.MaxSizeBytes / 1024 / 1024} مگابایت).", safe);

        if (Signatures.TryGetValue(ext, out var sigs))
        {
            var match = sigs.Any(sig => head.Length >= sig.Length &&
                sig.AsSpan().SequenceEqual(head[..sig.Length]));
            if (!match) return (false, "محتوای فایل با پسوند آن مطابقت ندارد؛ فایل رد شد.", safe);
        }
        return (true, null, safe);
    }

    public static string Sanitize(string name)
    {
        var s = Regex.Replace(name, @"[\\/:*?""<>|]", "_");
        s = Regex.Replace(s, @"\s+", " ").Trim().Trim('.');
        if (s.Length > 120) s = s[^120..];
        return string.IsNullOrWhiteSpace(s) ? "file" : s;
    }
}

public sealed class FileStorageService
{
    private readonly string _root;
    public FileStorageService(IConfiguration cfg)
    {
        _root = cfg.GetSection("Storage")["RootPath"] ?? "./storage";
        Directory.CreateDirectory(_root);
    }

    public async Task<string> SaveAsync(Stream content, string storedName, CancellationToken ct = default)
    {
        var date = DateTime.UtcNow.ToString("yyyy/MM");
        var dir = Path.Combine(_root, date);
        Directory.CreateDirectory(dir);
        var full = Path.Combine(dir, storedName);
        await using var fs = new FileStream(full, FileMode.CreateNew, FileAccess.Write);
        await content.CopyToAsync(fs, ct);
        return Path.Combine(date, storedName).Replace('\\', '/');
    }

    public string StoredName(string safeName) =>
        $"{DateTime.UtcNow:yyyyMMddHHmmss}_{Guid.NewGuid():N}{Path.GetExtension(safeName).ToLowerInvariant()}";

    public (Stream Stream, string Mime) Open(string relative, string mime)
    {
        var full = Path.Combine(_root, relative);
        // Prevent path traversal: resolved path must stay under root.
        var resolved = Path.GetFullPath(full);
        if (!resolved.StartsWith(Path.GetFullPath(_root), StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Invalid path.");
        // Never serve executable content inline.
        return (File.OpenRead(resolved), mime);
    }
}
