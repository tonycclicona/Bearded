<?php
/**
 * PHP Proxy Universal para api.beardedmountaineerlodge.com
 * Soporta conexión local directa y fallback HTTPS a través del WebApp Gateway
 */

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
if (!str_starts_with($requestUri, '/api')) {
    $targetUri = '/api' . $requestUri;
} else {
    $targetUri = $requestUri;
}

// 1. Intentar encontrar puerto local
function getTargetUrl($targetUri) {
    $portFiles = [
        __DIR__ . '/../.node_port',
        '/home/u251936581/public_html/.node_port',
        '/tmp/bearded_node_port'
    ];
    $ports = [];
    foreach ($portFiles as $f) {
        if (file_exists($f)) {
            $p = intval(trim(file_get_contents($f)));
            if ($p > 0) $ports[] = $p;
        }
    }
    $ports = array_unique(array_merge($ports, [8080, 3000, 3001, 3002, 4000]));
    
    foreach ($ports as $port) {
        $fp = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.1);
        if ($fp) {
            fclose($fp);
            return "http://127.0.0.1:{$port}{$targetUri}";
        }
    }

    // Si los puertos internos están aislados por contenedor, conectar por el Gateway HTTPS
    return "https://beardedmountaineerlodge.com{$targetUri}";
}

$targetUrl = getTargetUrl($targetUri);

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
curl_setopt($ch, CURLOPT_TIMEOUT, 20);

$headers = [];
foreach (getallheaders() as $key => $val) {
    if (strtolower($key) !== 'host') {
        $headers[] = "$key: $val";
    }
}
$headers[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'api.beardedmountaineerlodge.com');
$headers[] = "X-Forwarded-Host: " . ($_SERVER['HTTP_HOST'] ?? 'api.beardedmountaineerlodge.com');
$headers[] = "X-Forwarded-Proto: https";
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$body = file_get_contents('php://input');
if (!empty($body)) {
    curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
}

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
curl_close($ch);

if ($response === false) {
    http_response_code(503);
    header('Content-Type: application/json');
    echo json_encode([
        'error' => 'API Gateway no disponible. Reinicie Node.js en Hostinger.',
        'target' => $targetUrl
    ]);
    exit;
}

$respHeaders = substr($response, 0, $headerSize);
$respBody = substr($response, $headerSize);

foreach (explode("\r\n", $respHeaders) as $hdr) {
    if (!empty($hdr) && !str_starts_with(strtolower($hdr), 'transfer-encoding:')) {
        header($hdr, false);
    }
}

http_response_code($httpCode ?: 200);
echo $respBody;
