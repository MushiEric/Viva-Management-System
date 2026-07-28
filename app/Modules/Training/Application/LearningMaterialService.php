<?php

namespace App\Modules\Training\Application;

use App\Models\User;
use App\Modules\Audit\Application\AuditLogger;
use App\Modules\Training\Domain\Events\LearningMaterialPublished;
use App\Modules\Training\Infrastructure\Models\LearningMaterial;
use App\Modules\Training\Infrastructure\Models\Program;
use App\Shared\Application\EventBus;
use App\Shared\Application\RichTextSanitizer;
use Illuminate\Http\UploadedFile;

final readonly class LearningMaterialService
{
    public function __construct(
        private RichTextSanitizer $sanitizer,
        private AuditLogger $audit,
        private EventBus $events,
    ) {
    }

    public function create(Program $program, array $data, ?UploadedFile $file, User $actor): LearningMaterial
    {
        $path = $file?->store("program-materials/{$program->id}", 'local');
        $material = LearningMaterial::create([
            'program_id' => $program->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'version' => $data['version'],
            'material_type' => $file ? 'file' : 'rich_text',
            'file_path' => $path,
            'file_size' => $file?->getSize(),
            'rich_text' => isset($data['rich_text']) ? $this->sanitizer->sanitize($data['rich_text']) : null,
            'uploaded_by' => $actor->id,
        ]);
        $this->audit->record($actor, 'learning_material.created', $material, null, $material->toArray());
        $this->events->dispatch(new LearningMaterialPublished($material));

        return $material->load('program:id,name', 'uploader:id,name');
    }

    public function update(LearningMaterial $material, array $data, ?UploadedFile $file, User $actor): LearningMaterial
    {
        $before = $material->toArray();
        $material->fill([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'version' => $data['version'],
        ]);

        if ($file) {
            $material->file_path = $file->store("program-materials/{$material->program_id}", 'local');
            $material->file_size = $file->getSize();
            $material->material_type = 'file';
            $material->rich_text = null;
        } elseif (array_key_exists('rich_text', $data)) {
            $material->rich_text = $this->sanitizer->sanitize($data['rich_text']);
            $material->material_type = 'rich_text';
            $material->file_path = null;
            $material->file_size = null;
        }

        $material->save();
        $this->audit->record($actor, 'learning_material.updated', $material, $before, $material->fresh()->toArray());

        return $material->fresh()->load('program:id,name', 'uploader:id,name');
    }

    public function deactivate(LearningMaterial $material, User $actor): void
    {
        $before = $material->toArray();
        $material->delete();
        $this->audit->record($actor, 'learning_material.deactivated', $material, $before, $material->toArray());
    }
}
