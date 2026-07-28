<?php

namespace App\Shared\Application;

use DOMDocument;
use DOMElement;
use DOMNode;

final class RichTextSanitizer
{
    private const ALLOWED_TAGS = [
        'p', 'br', 'h1', 'h2', 'h3', 'h4', 'strong', 'em', 'u',
        'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'a', 'img',
    ];

    public function sanitize(string $html): string
    {
        $document = new DOMDocument();
        $previous = libxml_use_internal_errors(true);
        $document->loadHTML(
            '<?xml encoding="utf-8" ?><div id="content">'.$html.'</div>',
            LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD,
        );
        libxml_clear_errors();
        libxml_use_internal_errors($previous);

        $root = $document->getElementById('content');
        if (!$root) {
            return '';
        }

        $this->cleanChildren($root);

        return collect(iterator_to_array($root->childNodes))
            ->map(fn (DOMNode $node) => $document->saveHTML($node))
            ->implode('');
    }

    private function cleanChildren(DOMNode $parent): void
    {
        foreach (iterator_to_array($parent->childNodes) as $node) {
            if (!$node instanceof DOMElement) {
                continue;
            }

            if (!in_array($node->tagName, self::ALLOWED_TAGS, true)) {
                while ($node->firstChild) {
                    $parent->insertBefore($node->firstChild, $node);
                }
                $parent->removeChild($node);
                continue;
            }

            $this->cleanAttributes($node);
            $this->cleanChildren($node);
        }
    }

    private function cleanAttributes(DOMElement $element): void
    {
        $allowed = match ($element->tagName) {
            'a' => ['href', 'title'],
            'img' => ['src', 'alt', 'title'],
            default => [],
        };

        foreach (iterator_to_array($element->attributes) as $attribute) {
            if (!in_array($attribute->name, $allowed, true)) {
                $element->removeAttribute($attribute->name);
            }
        }

        if ($element->hasAttribute('href') && !preg_match('/^(https?:|mailto:)/i', $element->getAttribute('href'))) {
            $element->removeAttribute('href');
        }
        if ($element->hasAttribute('src') && !preg_match('/^(https?:|data:image\\/(png|jpe?g|gif|webp);base64,)/i', $element->getAttribute('src'))) {
            $element->removeAttribute('src');
        }
    }
}
