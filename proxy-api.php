<?php
// ==============================================================================
// proxy-api.php — Bearded Mountaineer Lodge Dynamic Reverse Proxy
// Replicación exacta del gateway LiteSpeed / PHP -> Node.js de Unu-Raymi
// ==============================================================================

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie");

// Responder inmediatamente a peticiones OPTIONS preflight de CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

$host = strtolower($_SERVER['HTTP_HOST'] ?? '');
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';

// Si es contexto API y la URL no empieza con /api y no es uploads, prefijarla
$isApi = (strpos($host, 'api.') === 0) || (strpos($requestUri, '/api') === 0) || (strpos($scriptName, '/api/') !== false);
if ($isApi && strpos($requestUri, '/api') !== 0 && strpos($requestUri, '/uploads') !== 0) {
    $requestUri = '/api' . (strpos($requestUri, '/') === 0 ? $requestUri : '/' . $requestUri);
}

// Si es contexto Admin y la URL no empieza con /admin, prefijarla
$isAdmin = (strpos($host, 'admin.') === 0) || (strpos($requestUri, '/admin') === 0) || (strpos($scriptName, '/admin/') !== false);
if ($isAdmin && strpos($host, 'admin.') !== 0 && strpos($requestUri, '/admin') !== 0) {
    $requestUri = '/admin' . (strpos($requestUri, '/') === 0 ? $requestUri : '/' . $requestUri);
}

// Buscar puerto activo desde archivos de señal
$possiblePortFiles = [
    __DIR__ . '/.node_port',
    __DIR__ . '/../.node_port',
    __DIR__ . '/../../.node_port',
    sys_get_temp_dir() . '/bearded_node_port'
];

$detectedPort = 4000;
foreach ($possiblePortFiles as $pFile) {
    if (file_exists($pFile)) {
        $val = trim(@file_get_contents($pFile));
        if (!empty($val) && is_numeric($val)) {
            $detectedPort = intval($val);
            break;
        }
    }
}

// Targets idénticos a Unu-Raymi (puertos locales + fallback HTTPS al dominio principal)
$targets = [
    "http://127.0.0.1:{$detectedPort}",
    'http://127.0.0.1:4000',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
    'https://beardedmountaineerlodge.com'
];
$targets = array_values(array_unique($targets));

$response = false;
$httpCode = 0;
$contentType = '';
$responseHeaders = [];

$headers = [];
$incomingHeaders = function_exists('getallheaders') ? getallheaders() : [];
foreach ($incomingHeaders as $name => $value) {
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

// 1. Socket UNIX si está disponible (rendimiento máximo en Linux)
$unixSockets = [
    __DIR__ . '/gateway.sock',
    __DIR__ . '/../gateway.sock',
    sys_get_temp_dir() . '/bearded_gateway.sock'
];

foreach ($unixSockets as $sock) {
    if (file_exists($sock)) {
        $ch = curl_init('http://localhost' . $requestUri);
        curl_setopt($ch, CURLOPT_UNIX_SOCKET_PATH, $sock);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $reqHeaders = $headers;
        $reqHeaders[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'localhost');
        $reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
        $reqHeaders[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http');
        
        $sockRespHeaders = [];
        curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($c, $h) use (&$sockRespHeaders) {
            $len = strlen($h);
            $t = trim($h);
            if ($t !== '') $sockRespHeaders[] = $t;
            return $len;
        });

        if ($isMultipart) {
            $filtered = array_filter($reqHeaders, function($h) {
                $lh = strtolower($h);
                return strpos($lh, 'content-type:') !== 0 && strpos($lh, 'content-length:') !== 0;
            });
            curl_setopt($ch, CURLOPT_HTTPHEADER, array_values($filtered));
            curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
        } else {
            curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
            if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }

        $res = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($code > 0 && $res !== false) {
            http_response_code($code);
            foreach ($sockRespHeaders as $h) {
                $lh = strtolower($h);
                if (strpos($lh, 'set-cookie:') === 0 || strpos($lh, 'location:') === 0 || strpos($lh, 'content-type:') === 0 || strpos($lh, 'access-control-') === 0) {
                    header($h, false);
                }
            }
            echo $res;
            exit(0);
        }
    }
}

// 2. Loop sobre targets (127.0.0.1 y fallback al dominio https://beardedmountaineerlodge.com)
foreach ($targets as $baseTarget) {
    $targetUrl = $baseTarget . $requestUri;
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 3);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    
    $reqHeaders = $headers;
    if (strpos($baseTarget, 'beardedmountaineerlodge.com') !== false) {
        $reqHeaders[] = "Host: beardedmountaineerlodge.com";
    } else {
        $reqHeaders[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    }
    $reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $reqHeaders[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http');

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

    if ($httpCode >= 200 && $httpCode < 500 && $response !== false) {
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

header("Content-Type: application/json; charset=UTF-8");
http_response_code(502);
echo json_encode([
    "success" => false,
    "error" => "El servidor Node.js de Bearded Mountaineer Lodge no está respondiendo en los puertos locales (4000/3000) ni en el gateway. Asegúrate de iniciar la aplicación Node.js en el panel de Hostinger.",
    "path" => $requestUri,
    "timestamp" => date("c")
]);
exit(0);
