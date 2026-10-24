$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$utf8 = New-Object System.Text.UTF8Encoding($false)
function Plain([string]$html) {
    [System.Net.WebUtility]::HtmlDecode(($html -replace '<[^>]+>', ' ' -replace '\s+', ' ')).Trim()
}
function Asset([string]$url, [string]$name) {
    if (-not $url.StartsWith('https://sekolahamanah.sch.id/')) { throw "Unexpected asset origin" }
    $ext = [IO.Path]::GetExtension(([uri]$url).AbsolutePath)
    $relative = "assets/$name$ext"
    Invoke-WebRequest -Uri $url -UseBasicParsing -OutFile (Join-Path $root $relative)
    return $relative
}
$response = Invoke-WebRequest 'https://sekolahamanah.sch.id/wp-json/wp/v2/posts?per_page=100&_embed=1' -UseBasicParsing
if ([int]$response.Headers['X-WP-TotalPages'] -gt 1) { throw 'Add pagination before importing more than 100 posts.' }
$rawPosts = $response.Content | ConvertFrom-Json
$posts = @($rawPosts | ForEach-Object {
    $post = $_
    $media = $post._embedded.'wp:featuredmedia' | Select-Object -First 1
    $photo = $media.media_details.sizes.medium_large.source_url
    if (-not $photo) { $photo = $media.source_url }
    $image = if ($photo) { Asset $photo "news-$($post.id)" } else { '' }
    $categories = @($post._embedded.'wp:term' | ForEach-Object { $_ } | ForEach-Object { $_.name })
    [ordered]@{
        id = $post.id; date = $post.date; url = $post.link
        school = Plain $post.title.rendered
        title = Plain $post.excerpt.rendered
        category = if ($categories -contains 'Berita Prestasi') { 'prestasi' } else { 'kegiatan' }
        image = $image
        blocks = @([regex]::Matches($post.content.rendered, '<(p|h[2-4]|li)\b[^>]*>([\s\S]*?)</\1>') | ForEach-Object {
            $text = Plain $_.Groups[2].Value
            if ($text) { [ordered]@{ type = $_.Groups[1].Value; text = $text } }
        })
    }
})
$profiles = @()
foreach ($slug in @('tk-amanah','sd-amanah-2','smk-amanah-1')) {
    $page = (Invoke-WebRequest "https://sekolahamanah.sch.id/wp-json/wp/v2/pages?slug=$slug" -UseBasicParsing).Content | ConvertFrom-Json | Select-Object -First 1
    $profiles += [ordered]@{
        slug = $slug; url = $page.link
        paragraphs = @([regex]::Matches($page.content.rendered, '<p\b[^>]*>([\s\S]*?)</p>') | ForEach-Object { Plain $_.Groups[1].Value } | Where-Object { $_.Length -gt 30 })
    }
}
$homepageHtml = (Invoke-WebRequest 'https://sekolahamanah.sch.id/' -UseBasicParsing).Content
$partnerSection = [regex]::Match($homepageHtml, 'PARTNER KERJASAMA([\s\S]*?)LOKASI KAMI').Groups[1].Value
$partners = @(); $index = 0
foreach ($m in [regex]::Matches($partnerSection, 'data-src="(https://sekolahamanah.sch.id/[^"]+)"')) {
    $index++; $partners += Asset $m.Groups[1].Value "partner-$index"
}
$logo = Asset 'https://sekolahamanah.sch.id/wp-content/uploads/2026/01/LOGO-sekolah-amanah-1.png' 'logo-amanah'
$banner = Asset 'https://sekolahamanah.sch.id/wp-content/uploads/2026/10/Gemini_Generated_Image_p57tzjp57tzjp57t-1536x287.jpg' 'forsaken-ix'
$data = [ordered]@{ source = 'https://sekolahamanah.sch.id/'; imported = '2026-10-24'; posts = $posts; profiles = $profiles; partners = $partners; logo = $logo; eventBanner = $banner }
[IO.File]::WriteAllText((Join-Path $root 'content.js'), ('window.AMANAH_CONTENT = ' + ($data | ConvertTo-Json -Depth 12) + ';'), $utf8)
Write-Output "Imported $($posts.Count) articles, $($profiles.Count) profiles and $($partners.Count) partner images."
