<?php

namespace App\Shared\Infrastructure;

use App\Shared\Application\EventBus;
use App\Shared\Domain\DomainEvent;
use Illuminate\Contracts\Events\Dispatcher;

final readonly class LaravelEventBus implements EventBus
{
    public function __construct(private Dispatcher $dispatcher)
    {
    }

    public function dispatch(DomainEvent $event): void
    {
        $this->dispatcher->dispatch($event);
    }
}
