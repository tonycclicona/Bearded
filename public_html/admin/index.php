<?php
// ==============================================================================
// Bearded Mountaineer Lodge Admin Dynamic Reverse Proxy (LiteSpeed / PHP -> Node.js Gateway)
// Adaptado del motor probado de Unu-Raymi con detección dinámica de puerto
// ==============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$requestUri = $_SERVER['REQUEST_URI'];
if (strpos($requestUri, '/admin') !== 0) {
    $requestUri = '/admin' . $requestUri;
}

// 1. Detección dinámica de puerto activo
$detectedTargets = [];
$portFiles = [
    __DIR__ . '/../.node_port',
    '/home/u251936581/public_html/.node_port',
    '/home/u251936581/domains/beardedmountaineerlodge.com/public_html/.node_port',
    '/tmp/bearded_node_port'
];
foreach ($portFiles as $pf) {
    if (file_exists($pf)) {
        $p = intval(trim(file_get_contents($pf)));
        if ($p > 0) {
            $detectedTargets[] = "http://127.0.0.1:{$p}";
            $detectedTargets[] = "http://localhost:{$p}";
        }
    }
}
if (!empty($_ENV['PORT'])) {
    $detectedTargets[] = "http://127.0.0.1:" . intval($_ENV['PORT']);
}

$targets = array_unique(array_merge(
    $detectedTargets,
    [
        'http://127.0.0.1:8080',
        'http://localhost:8080',
        'http://127.0.0.1:3002',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:4000'
    ]
));

$headers = [];
foreach (getallheaders() as $name => $value) {
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
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // Permitir que redirects como /login vayan al navegador
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 25);
    
    $reqHeaders = $headers;
    $reqHeaders[] = "Host: admin.beardedmountaineerlodge.com";
    $reqHeaders[] = "X-Forwarded-Host: admin.beardedmountaineerlodge.com";
    $reqHeaders[] = "X-Forwarded-Proto: https";

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

    $raw = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    curl_close($ch);

    if ($httpCode > 0 && $raw !== false) {
        $respHeaders = substr($raw, 0, $headerSize);
        $response = substr($raw, $headerSize);
        
        foreach (explode("\r\n", $respHeaders) as $hdr) {
            if (!empty($hdr) && !str_starts_with(strtolower($hdr), 'transfer-encoding:')) {
                header($hdr, false);
            }
        }
        http_response_code($httpCode);
        echo $response;
        exit(0);
    }
}

header("Content-Type: text/html; charset=UTF-8");
http_response_code(502);
echo "<h3>El servidor Node.js de Bearded Mountaineer Lodge no está respondiendo en los puertos locales. Asegúrate de iniciar la aplicación Node.js en el panel de Hostinger.</h3>";
exit(0);
