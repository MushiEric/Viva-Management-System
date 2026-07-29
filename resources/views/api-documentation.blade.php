<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VIVA API Documentation</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css">
    <style>
        body { margin: 0; background: #f8fafc; }
        .docs-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 12px 24px; background: #0f4f7a; color: white; font-family: sans-serif; }
        .docs-bar strong { font-size: 16px; }
        .docs-links { display: flex; flex-wrap: wrap; gap: 10px; }
        .docs-links a { border: 1px solid rgba(255,255,255,.45); border-radius: 7px; padding: 7px 10px; color: white; text-decoration: none; font-size: 12px; font-weight: 700; }
        .docs-links a:hover { background: white; color: #0f4f7a; }
        #swagger-ui { max-width: 1440px; margin: 0 auto; }
    </style>
</head>
<body>
    <header class="docs-bar">
        <strong>VIVA Management Portal API</strong>
        <nav class="docs-links">
            <a href="{{ route('api.docs.specification') }}">OpenAPI YAML</a>
            <a href="{{ route('api.docs.postman') }}">Download Postman Collection</a>
        </nav>
    </header>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
    <script>
        window.onload = () => {
            SwaggerUIBundle({
                url: @json(route('api.docs.specification')),
                dom_id: '#swagger-ui',
                deepLinking: true,
                displayRequestDuration: true,
                persistAuthorization: true,
                filter: true,
                tryItOutEnabled: true,
            });
        };
    </script>
</body>
</html>
