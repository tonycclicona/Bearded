<?php
// ==============================================================================
// proxy-api.php — Reverse Proxy Universal (PHP/LiteSpeed -> Node.js Gateway)
// Compatible con API REST, Admin Panel (Express/EJS/Cookies) y Frontend
// Basado en la arquitectura probada de Unu-Raymi + Soporte de Sesiones
// ==============================================================================

// Manejo de Preflight OPTIONS para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header("Access-Control-Allow-Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
    header("Access-Control-Allow-Credentials: true");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS, PATCH");
    header("Access-Control-Allow-Headers: Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie");
    http_response_code(200);
    exit(0);
}

$host = strtolower($_SERVER['HTTP_HOST'] ?? '');
$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$scriptName = $_SERVER['SCRIPT_NAME'] ?? '';

// Normalizar dobles slashes en la URL
$requestUri = preg_replace('#/+#', '/', $requestUri);

// Determinar el contexto de la petición (API, Admin o General)
$isApiContext = (strpos($host, 'api.') === 0) || (strpos($requestUri, '/api') === 0) || (strpos($scriptName, '/api/') !== false);
$isAdminContext = (strpos($host, 'admin.') === 0) || (strpos($requestUri, '/admin') === 0) || (strpos($scriptName, '/admin/') !== false);

// Si es contexto API y la URL no empieza con /api ni es /uploads, prefijar /api
if ($isApiContext && strpos($requestUri, '/api') !== 0 && strpos($requestUri, '/uploads') !== 0) {
    $requestUri = '/api' . (strpos($requestUri, '/') === 0 ? $requestUri : '/' . $requestUri);
}

// Si es contexto Admin en subcarpeta y la URL no empieza con /admin, prefijar /admin
if ($isAdminContext && strpos($host, 'admin.') !== 0 && strpos($requestUri, '/admin') !== 0) {
    $requestUri = '/admin' . (strpos($requestUri, '/') === 0 ? $requestUri : '/' . $requestUri);
}

// ── 1. Detección dinámica de puerto Node.js ───────────────────────────────────
$possiblePortFiles = [
    __DIR__ . '/.node_port',
    __DIR__ . '/../.node_port',
    __DIR__ . '/../../.node_port',
    __DIR__ . '/public_html/.node_port',
    __DIR__ . '/public_html/api/.node_port',
    __DIR__ . '/public_html/admin/.node_port',
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

$targets = [
    "http://127.0.0.1:{$detectedPort}",
    'http://127.0.0.1:4000',
    'http://127.0.0.1:3001',
    'http://127.0.0.1:3002',
    'http://127.0.0.1:3000',
    "http://localhost:{$detectedPort}",
    'http://localhost:4000'
];
$targets = array_values(array_unique($targets));

// ── 2. Preparar cabeceras entrantes ──────────────────────────────────────────
$headers = [];
$incomingHeaders = function_exists('getallheaders') ? getallheaders() : [];
foreach ($incomingHeaders as $name => $value) {
    $lower = strtolower($name);
    // Excluir cabeceras que cURL maneja internamente
    if ($lower !== 'host' && $lower !== 'accept-encoding' && $lower !== 'content-length') {
        $headers[] = "$name: $value";
    }
}

// ── 3. Manejo de cuerpo y subida de archivos (Multipart) ─────────────────────
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

// ── 4. Conexión prioritaria por Socket UNIX ──────────────────────────────────
$unixSockets = [
    __DIR__ . '/gateway.sock',
    __DIR__ . '/../gateway.sock',
    __DIR__ . '/public_html/gateway.sock',
    sys_get_temp_dir() . '/bearded_gateway.sock'
];

$activeUnixSocket = null;
foreach ($unixSockets as $sock) {
    if (file_exists($sock)) {
        $activeUnixSocket = $sock;
        break;
    }
}

function executeProxyRequest($ch, $headers, $isMultipart, $postFields, $body) {
    $responseHeaders = [];
    
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $_SERVER['REQUEST_METHOD']);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false); // No seguir redirects para reenviar 302 al cliente
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_ENCODING, '');
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $reqHeaders = $headers;
    $reqHeaders[] = "Host: " . ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $reqHeaders[] = "X-Forwarded-For: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');
    $reqHeaders[] = "X-Forwarded-Proto: " . (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off' ? 'https' : 'http');
    $reqHeaders[] = "X-Real-IP: " . ($_SERVER['REMOTE_ADDR'] ?? '127.0.0.1');

    if ($isMultipart) {
        $filtered = array_filter($reqHeaders, function($h) {
            $lh = strtolower($h);
            return strpos($lh, 'content-type:') !== 0 && strpos($lh, 'content-length:') !== 0;
        });
        curl_setopt($ch, CURLOPT_HTTPHEADER, array_values($filtered));
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    } else {
        curl_setopt($ch, CURLOPT_HTTPHEADER, $reqHeaders);
        if ($body !== null) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
        }
    }

    // Capturar cabeceras de respuesta (Set-Cookie, Location, etc.)
    curl_setopt($ch, CURLOPT_HEADERFUNCTION, function($curl, $headerLine) use (&$responseHeaders) {
        $len = strlen($headerLine);
        $trimmed = trim($headerLine);
        if ($trimmed !== '') {
            $responseHeaders[] = $trimmed;
        }
        return $len;
    });

    $res = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    return [
        'code' => $httpCode,
        'headers' => $responseHeaders,
        'body' => $res
    ];
}

function sendProxyResponse($result) {
    if ($result['code'] > 0 && $result['body'] !== false) {
        http_response_code($result['code']);
        foreach ($result['headers'] as $h) {
            $lh = strtolower($h);
            // Reenviar cabeceras clave: cookies, redirects, tipos de contenido, CORS
            if (
                strpos($lh, 'set-cookie:') === 0 ||
                strpos($lh, 'location:') === 0 ||
                strpos($lh, 'content-type:') === 0 ||
                strpos($lh, 'access-control-') === 0 ||
                strpos($lh, 'cache-control:') === 0
            ) {
                // Segundo parámetro false permite múltiples Set-Cookie sin sobreescribirse
                header($h, false);
            }
        }
        echo $result['body'];
        exit(0);
    }
}

// Intentar por Socket UNIX
if ($activeUnixSocket) {
    $ch = curl_init('http://localhost' . $requestUri);
    curl_setopt($ch, CURLOPT_UNIX_SOCKET_PATH, $activeUnixSocket);
    $result = executeProxyRequest($ch, $headers, $isMultipart, $postFields, $body);
    if ($result['code'] > 0 && $result['body'] !== false) {
        sendProxyResponse($result);
    }
}

// Intentar por TCP
foreach ($targets as $baseTarget) {
    $targetUrl = $baseTarget . $requestUri;
    $ch = curl_init($targetUrl);
    $result = executeProxyRequest($ch, $headers, $isMultipart, $postFields, $body);
    if ($result['code'] > 0 && $result['body'] !== false) {
        sendProxyResponse($result);
    }
}

// ── 5. Respuesta de contingencia amigable ─────────────────────────────────────
http_response_code(502);
if ($isAdminContext) {
    header("Content-Type: text/html; charset=UTF-8");
    echo "<!DOCTYPE html><html><head><meta charset='utf-8'><title>Bearded Admin - Iniciando</title>";
    echo "<style>body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}";
    echo ".card{background:#1e293b;padding:2.5rem;border-radius:1rem;box-shadow:0 10px 25px -5px rgba(0,0,0,0.5);max-width:500px;text-align:center;}";
    echo "h1{color:#f59e0b;font-size:1.5rem;margin-bottom:1rem;}p{line-height:1.6;color:#94a3b8;}</style></head><body>";
    echo "<div class='card'><h1>Servicio en Inicialización</h1>";
    echo "<p>El servidor Node.js de <strong>Bearded Mountaineer Lodge</strong> se está iniciando. Por favor recarga esta página en unos instantes o asegúrate de que la aplicación esté activa en el panel de Hostinger.</p>";
    echo "<button onclick='location.reload()' style='background:#f59e0b;color:#000;border:none;padding:0.6rem 1.2rem;border-radius:0.5rem;cursor:pointer;font-weight:600;margin-top:1rem;'>Reintentar</button>";
    echo "</div></body></html>";
    exit(0);
}

header("Content-Type: application/json; charset=UTF-8");
echo json_encode([
    "success" => false,
    "error" => "El servidor Node.js de Bearded Mountaineer Lodge no responde en los puertos locales (4000/3001) ni en el gateway.",
    "hint" => "Asegúrate de iniciar o reiniciar la aplicación Node.js en el panel de Hostinger.",
    "path" => $requestUri,
    "timestamp" => date("c")
]);
exit(0);
