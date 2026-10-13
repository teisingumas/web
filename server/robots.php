<?php
// /robots.txt with the sitemap's full address.

declare(strict_types=1);

require __DIR__ . '/lib/bootstrap.php';

header('Content-Type: text/plain; charset=utf-8');
echo "User-agent: *\n";
echo "Disallow: /adminas\n";
echo "Disallow: /apzvalga\n";
echo "Disallow: /api/\n";
echo "\n";
echo 'Sitemap: ' . site_url() . "/sitemap.xml\n";
