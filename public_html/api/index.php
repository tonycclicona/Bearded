<?php
/**
 * PHP Proxy Forwarder con Detección Automática de Puerto
 * Subdominio: api.beardedmountaineerlodge.com -> Node.js Backend API
 */

function detectNodePort() {
    $candidates = [];
    
    // 1. Archivos de puerto guardados por server.js
    $portFiles = [
        __DIR__ . '/../.node_port',
        '/home/u251936581/public_html/.node_port',
        '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/.node_port',
        '/tmp/bearded_node_port'
    ];
    foreach ($portFiles as $f) {
        if (file_exists($f)) {
            $p = intval(trim(file_get_contents($f)));
            if ($p > 0) $candidates[] = $p;
        }
    }

    if (!empty($_ENV['PORT'])) $candidates[] = intval($_ENV['PORT']);
    if (getenv('PORT')) $candidates[] = intval(getenv('PORT'));
    
    // 2. Puertos estándar de Hostinger WebApps
    $standardPorts = [8080, 3000, 3001, 3002, 4000, 5000, 8000];
    foreach ($standardPorts as $sp) {
        $candidates[] = $sp;
    }

    $candidates = array_unique($candidates);

    foreach ($candidates as $port) {
        $fp = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2);
        if ($fp) {
            fclose($fp);
            return $port;
        }
    }

    return 8080;
}

$nodePort = detectNodePort();
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';

if (!str_starts_with($requestUri, '/api')) {
    $targetUri = '/api' . $requestUri;
} else {
    $targetUri = $requestUri;
}

$targetUrl = "http://127.0.0.1:{$nodePort}" . $targetUri;

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);

$headers = [];
foreach (getallheaders() as $key => $val) {
    if (strtolower($key) !== 'host') {
        $headers[] = "$key: $val";
    }
}
$headers[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'api.beardedmountaineerlodge.com');
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
        'checked_port' => $nodePort
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
