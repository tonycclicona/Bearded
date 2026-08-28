<?php
/**
 * Hostinger Universal Web Gateway — BEARDED MOUNTAINEER LODGE
 * Carga de forma directa y ultrarrápida los archivos desde hbuilds hacia public_html
 */

$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$host = strtolower($_SERVER['HTTP_HOST'] ?? '');

// 1. Rutas posibles de la carpeta de construcción en Hostinger
$candidateRoots = [
    __DIR__ . '/../hbuilds/current/nodejs/public_html',
    __DIR__ . '/../hbuilds/current/public_html',
    __DIR__ . '/../hbuilds/last-source/public_html',
    __DIR__ . '/hbuilds/current/nodejs/public_html',
    __DIR__ . '/hbuilds/current/public_html',
    __DIR__
];

$sourceBase = null;
foreach ($candidateRoots as $dir) {
    if (is_dir($dir) && is_file($dir . '/index.html')) {
        $sourceBase = realpath($dir);
        break;
    }
}

if (!$sourceBase) {
    $sourceBase = __DIR__;
}

// 2. Manejo de Subdominios API y Admin hacia el Gateway Node.js
if (str_starts_with($host, 'api.') || str_starts_with($uri, '/api')) {
    $apiUrl = "http://127.0.0.1:8080" . $_SERVER['REQUEST_URI'];
    $ch = curl_init($apiUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $headers = [];
    foreach (getallheaders() as $key => $val) {
        $headers[] = "$key: $val";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, file_get_contents('php://input'));
    }
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    exit;
}

if (str_starts_with($host, 'admin.') || str_starts_with($uri, '/admin')) {
    $adminUrl = "http://127.0.0.1:8080" . $_SERVER['REQUEST_URI'];
    $ch = curl_init($adminUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, false);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 5);
    $headers = [];
    foreach (getallheaders() as $key => $val) {
        $headers[] = "$key: $val";
    }
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_exec($ch);
    curl_close($ch);
    exit;
}

// 3. Servir archivos estáticos reales (JS, CSS, imágenes, fuentes)
$requestedFile = $sourceBase . $uri;

if (is_file($requestedFile)) {
    $ext = strtolower(pathinfo($requestedFile, PATHINFO_EXTENSION));
    $mimes = [
        'html' => 'text/html; charset=utf-8',
        'css'  => 'text/css; charset=utf-8',
        'js'   => 'application/javascript; charset=utf-8',
        'mjs'  => 'application/javascript; charset=utf-8',
        'json' => 'application/json; charset=utf-8',
        'png'  => 'image/png',
        'jpg'  => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'webp' => 'image/webp',
        'svg'  => 'image/svg+xml',
        'ico'  => 'image/x-icon',
        'woff2'=> 'font/woff2',
        'woff' => 'font/woff',
        'ttf'  => 'font/ttf',
        'txt'  => 'text/plain; charset=utf-8'
    ];
    $contentType = $mimes[$ext] ?? mime_content_type($requestedFile) ?? 'application/octet-stream';
    header("Content-Type: $contentType");
    header("Cache-Control: public, max-age=31536000, immutable");
    readfile($requestedFile);
    exit;
}

// 4. Fallback de Páginas HTML (SPA / Next.js Export)
$htmlCandidate = $sourceBase . rtrim($uri, '/') . '.html';
if (is_file($htmlCandidate)) {
    header("Content-Type: text/html; charset=utf-8");
    readfile($htmlCandidate);
    exit;
}

$subIndex = $sourceBase . rtrim($uri, '/') . '/index.html';
if (is_file($subIndex)) {
    header("Content-Type: text/html; charset=utf-8");
    readfile($subIndex);
    exit;
}

// 5. Fallback al index.html principal
$mainIndex = $sourceBase . '/index.html';
if (is_file($mainIndex)) {
    header("Content-Type: text/html; charset=utf-8");
    readfile($mainIndex);
    exit;
}

http_response_code(404);
echo "<h3>Bearded Mountaineer Lodge — Página no encontrada</h3>";
