<?php

namespace Tests\Feature;

use Illuminate\Routing\Route as LaravelRoute;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class ApiDocumentationTest extends TestCase
{
    public function test_documentation_assets_are_available(): void
    {
        $this->get('/api/documentation')
            ->assertOk()
            ->assertSee('VIVA Management Portal API');

        $this->get('/api/openapi.yaml')
            ->assertOk()
            ->assertHeader('content-type', 'application/yaml; charset=UTF-8');

        $this->getJson('/api/postman-collection')
            ->assertOk()
            ->assertJsonPath('info.name', 'VIVA Management Portal API')
            ->assertJsonPath('variable.0.key', 'base_url');
    }

    public function test_every_v1_api_path_is_in_the_openapi_specification(): void
    {
        preg_match_all(
            '/^  (\/[^:]+):$/m',
            file_get_contents(base_path('docs/openapi.yaml')),
            $matches,
        );

        $documentedPaths = collect($matches[1]);
        $routePaths = collect(Route::getRoutes()->getRoutes())
            ->filter(fn (LaravelRoute $route) => str_starts_with($route->uri(), 'api/v1/'))
            ->map(fn (LaravelRoute $route) => '/'.substr($route->uri(), 7))
            ->unique();

        $this->assertSame([], $routePaths->diff($documentedPaths)->values()->all());
    }
}
