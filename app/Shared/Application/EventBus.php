<?php

namespace App\Shared\Application;

use App\Shared\Domain\DomainEvent;

interface EventBus
{
    public function dispatch(DomainEvent $event): void;
}
