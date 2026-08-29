<?php
/**
 * PHP Proxy Forwarder para admin.beardedmountaineerlodge.com
 * Reenvía todas las peticiones al Panel de Administración EJS en Node.js
 */

$nodePort = getenv('PORT') ?: 8080;
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';

if (!str_starts_with($requestUri, '/admin')) {
    $targetUri = '/admin' . $requestUri;
} else {
    $targetUri = $requestUri;
}

$targetUrl = "http://127.0.0.1:{$nodePort}" . $targetUri;

$ch = curl_init($targetUrl);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // Importante: no seguir redirecciones para que el navegador reciba /login
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$headers = [];
foreach (getallheaders() as $key => $val) {
    if (strtolower($key) !== 'host') {
        $headers[] = "$key: $val";
    }
}
$headers[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'admin.beardedmountaineerlodge.com');
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
    echo "<h3>Panel Admin no disponible. Reinicie Node.js en Hostinger.</h3>";
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
