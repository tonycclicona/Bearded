<?php
// ==============================================================================
// Bearded Mountaineer Lodge API Dynamic Gateway Proxy
// Homologado para Hostinger LiteSpeed / Node.js
// ==============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Prevenir bucles de proxy infinitos
if (isset($_SERVER['HTTP_X_BEARDED_GATEWAY'])) {
    header("Content-Type: application/json; charset=UTF-8");
    http_response_code(508);
    echo json_encode(["success" => false, "error" => "Loop detected in API proxy"]);
    exit(0);
}

$requestUri = $_SERVER['REQUEST_URI'];
if (strpos($requestUri, '/api') !== 0) {
    $requestUri = '/api' . $requestUri;
}

// 1. Detectar puerto dinámico si existe .node_port
$detectedPort = null;
$portCandidates = [
    __DIR__ . '/.node_port',
    dirname(__DIR__) . '/.node_port',
    dirname(dirname(__DIR__)) . '/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/hbuilds/current/nodejs/.node_port'
];
foreach ($portCandidates as $pf) {
    if (file_exists($pf)) {
        $p = trim(@file_get_contents($pf));
        if (!empty($p) && is_numeric($p)) {
            $detectedPort = $p;
            break;
        }
    }
}

// 2. Definir targets: puertos locales y como respaldo el host principal de Node.js
$targets = [];
if ($detectedPort) {
    $targets[] = "http://127.0.0.1:{$detectedPort}";
    $targets[] = "http://localhost:{$detectedPort}";
}
$targets[] = 'http://127.0.0.1:4000';
$targets[] = 'http://localhost:4000';
$targets[] = 'http://127.0.0.1:3000';
$targets[] = 'http://localhost:3000';
$targets[] = 'https://beardedmountaineerlodge.com';

$response = false;
$httpCode = 0;
$contentType = '';
$lastError = '';
$lastErrno = 0;
$triedTargets = [];

$headers = [];
$hasContentType = false;
$hasAuth = false;

if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        $lower = strtolower($name);
        if ($lower === 'content-type') $hasContentType = true;
        if ($lower === 'authorization') $hasAuth = true;
        if ($lower !== 'host' && $lower !== 'accept-encoding' && $lower !== 'content-length') {
            $headers[] = "$name: $value";
        }
    }
}

// Respaldo de Authorization si no vino en getallheaders (común en PHP FastCGI/LiteSpeed)
if (!$hasAuth) {
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $headers[] = "Authorization: " . $_SERVER['HTTP_AUTHORIZATION'];
    } else if (isset($_SERVER['REDIRECT_HTTP_AUTHORIZATION'])) {
        $headers[] = "Authorization: " . $_SERVER['REDIRECT_HTTP_AUTHORIZATION'];
    }
}

// Respaldo de Content-Type desde $_SERVER
if (!$hasContentType && isset($_SERVER['CONTENT_TYPE']) && !empty($_SERVER['CONTENT_TYPE'])) {
    $headers[] = "Content-Type: " . $_SERVER['CONTENT_TYPE'];
    $hasContentType = true;
}

$headers[] = "X-Bearded-Gateway: 1";
$headers[] = "Expect:"; // Evitar bloqueo de Expect: 100-continue en cURL

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
    if (!$hasContentType && !empty($body)) {
        $headers[] = "Content-Type: application/json";
    }
    if ($body !== null && strlen($body) > 0) {
        $headers[] = "Content-Length: " . strlen($body);
    }
}

foreach ($targets as $baseTarget) {
    $targetUrl = $baseTarget . $requestUri;
    $triedTargets[] = $targetUrl;
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_IPRESOLVE, CURL_IPRESOLVE_V4);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    
    $reqHeaders = $headers;
    if (strpos($baseTarget, 'beardedmountaineerlodge.com') !== false) {
        $reqHeaders[] = "Host: beardedmountaineerlodge.com";
    } else {
        $reqHeaders[] = "Host: api.beardedmountaineerlodge.com";
    }

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
    $contentType = curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    $lastError = curl_error($ch);
    $lastErrno = curl_errno($ch);
    curl_close($ch);

    $isHtml = (strpos(strtolower($contentType ?: ''), 'text/html') !== false);
    if ($httpCode >= 200 && $httpCode < 500 && $response !== false && !$isHtml) {
        break;
    }
}

if ($httpCode > 0 && $response !== false && !$isHtml) {
    header("Content-Type: " . ($contentType ?: 'application/json; charset=utf-8'));
    http_response_code($httpCode);
    echo $response;
    exit(0);
}

header("Content-Type: application/json; charset=UTF-8");
http_response_code(502);
echo json_encode([
    "success" => false,
    "error" => "El servidor Node.js de Bearded Mountaineer Lodge no está respondiendo. Verifica que la aplicación Node.js esté activa en Hostinger.",
    "path" => $requestUri,
    "debug" => [
        "detectedPort" => $detectedPort,
        "lastError" => $lastError,
        "lastErrno" => $lastErrno,
        "triedTargets" => $triedTargets
    ],
    "timestamp" => date("c")
], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
exit(0);
