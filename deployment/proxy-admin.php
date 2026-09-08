<?php
// ==============================================================================
// Bearded Mountaineer Lodge Admin Dynamic Reverse Proxy (LiteSpeed / PHP -> Node.js)
// ==============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$requestUri = $_SERVER['REQUEST_URI'];
if (strpos($requestUri, '/admin') !== 0 && strpos($requestUri, '/static') !== 0 && strpos($requestUri, '/uploads') !== 0) {
    $requestUri = '/admin' . (strpos($requestUri, '/') === 0 ? $requestUri : '/' . $requestUri);
}

// 1. Detectar puerto dinámico desde .node_port si existe
$detectedPort = null;
$portFiles = [
    __DIR__ . '/.node_port',
    dirname(__DIR__) . '/.node_port'
];
foreach ($portFiles as $pf) {
    if (file_exists($pf)) {
        $val = trim(@file_get_contents($pf));
        if (!empty($val) && is_numeric($val)) {
            $detectedPort = intval($val);
            break;
        }
    }
}

$targets = [];
if ($detectedPort) {
    $targets[] = "http://127.0.0.1:{$detectedPort}";
}
$targets[] = 'http://127.0.0.1:4000';
$targets[] = 'http://127.0.0.1:3002';
$targets[] = 'http://127.0.0.1:3000';
$targets = array_values(array_unique($targets));

$response = false;
$httpCode = 0;
$responseHeaders = [];

$headers = [];
$incoming = function_exists('getallheaders') ? getallheaders() : [];
foreach ($incoming as $name => $value) {
    $lower = strtolower($name);
    if ($lower !== 'host' && $lower !== 'accept-encoding' && $lower !== 'content-length') {
        $headers[] = "$name: $value";
    }
}

$isMultipart = !empty($_FILES) || (isset($_SERVER['CONTENT_TYPE']) && strpos(strtolower($_SERVER['CONTENT_TYPE']), 'multipart/form-data') !== false);
$postFields = null;
$body = null;

if ($isMultipart) {
    $postFields = $_POST;
    foreach ($_FILES as $field => $fileData) {
        if (is_array($fileData['tmp_name'])) {
            foreach ($fileData['tmp_name'] as $idx => $tmpName) {
                if (!empty($tmpName) && is_uploaded_file($tmpName) && $fileData['error'][$idx] === UPLOAD_ERR_OK) {
                    $postFields[$field . '[' . $idx . ']'] = new CURLFile(
                        $tmpName,
                        $fileData['type'][$idx] ?: 'application/octet-stream',
                        $fileData['name'][$idx]
                    );
                }
            }
        } else {
            if (!empty($fileData['tmp_name']) && is_uploaded_file($fileData['tmp_name']) && $fileData['error'] === UPLOAD_ERR_OK) {
                $postFields[$field] = new CURLFile(
                    $fileData['tmp_name'],
                    $fileData['type'] ?: 'application/octet-stream',
                    $fileData['name']
                );
            }
        }
    }
} else if (in_array($_SERVER['REQUEST_METHOD'], ['POST', 'PUT', 'PATCH', 'DELETE'])) {
    $body = file_get_contents('php://input');
}

foreach ($targets as $baseTarget) {
    $targetUrl = $baseTarget . $requestUri;
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $reqHeaders = $headers;
    $reqHeaders[] = "Host: admin.beardedmountaineerlodge.com";
    $reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $reqHeaders[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http');
    $reqHeaders[] = "X-Bypass-Proxy: 1";

    $respHeaders = [];
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($c, $h) use (&$respHeaders) {
        $len = strlen($h);
        $t = trim($h);
        if ($t !== '') $respHeaders[] = $t;
        return $len;
    });

    if ($isMultipart) {
        $filteredHeaders = array_filter($reqHeaders, function($h) {
            $lh = strtolower($h);
            return strpos($lh, 'content-type:') !== 0 && strpos($lh, 'content-length:') !== 0;
        });
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_values($filteredHeaders));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    } else {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode > 0 && $response !== false) {
        $responseHeaders = $respHeaders;
        break;
    }
}

if ($httpCode > 0 && $response !== false) {
    http_response_code($httpCode);
    foreach ($responseHeaders as $h) {
        $lh = strtolower($h);
        if (strpos($lh, 'set-cookie:') === 0 || strpos($lh, 'location:') === 0 || strpos($lh, 'content-type:') === 0 || strpos($lh, 'access-control-') === 0) {
            header($h, false);
        }
    }
    echo $response;
    exit(0);
}

header("Content-Type: text/html; charset=UTF-8");
http_response_code(502);
echo "<h1>502 Bad Gateway</h1><p>El servidor Node.js de Bearded Mountaineer Lodge (Admin) no responde en los puertos locales. Verifica que la Web App este iniciada en Hostinger.</p>";
exit(0);
