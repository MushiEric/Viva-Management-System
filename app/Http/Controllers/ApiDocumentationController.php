<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Routing\Route as LaravelRoute;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;
use Illuminate\View\View;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

final class ApiDocumentationController extends Controller
{
    public function index(): View
    {
        return view('api-documentation');
    }

    public function specification(): BinaryFileResponse
    {
        return response()->file(base_path('docs/openapi.yaml'), [
            'Content-Type' => 'application/yaml; charset=UTF-8',
            'Content-Disposition' => 'inline; filename="viva-openapi.yaml"',
        ]);
    }

    public function postman(): JsonResponse
    {
        $items = collect(Route::getRoutes()->getRoutes())
            ->filter(fn (LaravelRoute $route) => str_starts_with($route->uri(), 'api/v1/'))
            ->groupBy(fn (LaravelRoute $route) => Str::headline(explode('/', substr($route->uri(), 7))[0]))
            ->map(fn (Collection $routes, string $group) => [
                'name' => $group,
                'item' => $routes->map(fn (LaravelRoute $route) => $this->postmanRequest($route))->values()->all(),
            ])
            ->values()
            ->all();

        return response()->json([
            'info' => [
                '_postman_id' => '71355d4a-c254-4a31-a318-1645a9060cf6',
                'name' => 'VIVA Management Portal API',
                'description' => 'Generated from the live Laravel API route registry. See docs/openapi.yaml for full schemas and examples.',
                'schema' => 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
            ],
            'auth' => [
                'type' => 'bearer',
                'bearer' => [
                    ['key' => 'token', 'value' => '{{token}}', 'type' => 'string'],
                ],
            ],
            'variable' => [
                ['key' => 'base_url', 'value' => 'http://localhost:8000/api/v1'],
                ['key' => 'token', 'value' => ''],
            ],
            'item' => $items,
        ])->withHeaders([
            'Content-Disposition' => 'attachment; filename="viva-api.postman_collection.json"',
        ]);
    }

    private function postmanRequest(LaravelRoute $route): array
    {
        $method = explode('|', $route->methods()[0])[0];
        $path = preg_replace('/\{([^}]+)\}/', ':$1', substr($route->uri(), 7));
        $public = in_array($route->uri(), ['api/v1/token', 'api/v1/timetable', 'api/v1/contact-inquiries'], true)
            && ! in_array('GET', $route->methods(), true);
        $request = [
            'method' => $method,
            'header' => [
                ['key' => 'Accept', 'value' => 'application/json', 'type' => 'text'],
            ],
            'url' => [
                'raw' => '{{base_url}}/'.$path,
                'host' => ['{{base_url}}'],
                'path' => explode('/', $path),
            ],
            'description' => $route->getActionName(),
        ];

        if ($public || $route->uri() === 'api/v1/timetable') {
            $request['auth'] = ['type' => 'noauth'];
        }

        if (in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
            $request['header'][] = ['key' => 'Content-Type', 'value' => 'application/json', 'type' => 'text'];
            $request['body'] = [
                'mode' => 'raw',
                'raw' => '{}',
                'options' => ['raw' => ['language' => 'json']],
            ];
        }

        return [
            'name' => Str::headline(class_basename(str_replace('@', ' ', $route->getActionName()))),
            'request' => $request,
            'response' => [],
        ];
    }
}
