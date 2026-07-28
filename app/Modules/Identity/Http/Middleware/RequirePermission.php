<?php

namespace App\Modules\Identity\Http\Middleware;

use App\Modules\Identity\Application\AuthorizationService;
use App\Modules\Identity\Domain\Permission;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final readonly class RequirePermission
{
    public function __construct(private AuthorizationService $authorization)
    {
    }

    public function handle(Request $request, Closure $next, string $permission): Response
    {
        $resolved = Permission::tryFrom($permission);

        abort_unless(
            $request->user() && $resolved && $this->authorization->allows($request->user(), $resolved),
            403,
        );

        return $next($request);
    }
}
