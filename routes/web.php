<?php

use App\Http\Controllers\ApiDocumentationController;
use App\Http\Controllers\Web\TimetableController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/timetable', [TimetableController::class, 'index']);

Route::get('/api/documentation', [ApiDocumentationController::class, 'index'])->name('api.docs.index');
Route::get('/api/openapi.yaml', [ApiDocumentationController::class, 'specification'])->name('api.docs.specification');
Route::get('/api/postman-collection', [ApiDocumentationController::class, 'postman'])->name('api.docs.postman');
