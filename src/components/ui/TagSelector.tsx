import React, { useState, useRef } from 'react'
import { X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface TagSelectorProps {
    tags: string[]
    onChange: (tags: string[]) => void
    maxTags?: number
    suggestions?: string[]
    placeholder?: string
    className?: string
}

export function TagSelector({
    tags,
    onChange,
    maxTags = 20,
    suggestions = [],
    placeholder = 'Agregar tag...',
    className = ''
}: TagSelectorProps) {
    const [input, setInput] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const filteredSuggestions = suggestions.filter(
        s => !tags.includes(s) && s.toLowerCase().includes(input.toLowerCase())
    )

    const addTag = (tag: string) => {
        const trimmedTag = tag.trim()
        if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
            onChange([...tags, trimmedTag])
            setInput('')
        }
    }

    const removeTag = (tagToRemove: string) => {
        onChange(tags.filter(t => t !== tagToRemove))
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            if (input.trim()) {
                addTag(input)
            }
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1])
        }
    }

    const isMaxReached = tags.length >= maxTags

    return (
        <div className={`space-y-2 ${className}`}>
            {/* Selected tags */}
            <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                    <Badge
                        key={tag}
                        variant="secondary"
                        className="px-2 py-1 text-sm"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(tag)}
                            className="ml-1 hover:text-red-600"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </Badge>
                ))}
            </div>

            {/* Input and suggestions */}
            {!isMaxReached && (
                <div className="relative">
                    <div className="flex gap-2">
                        <Input
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            placeholder={placeholder}
                            className="flex-1"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addTag(input)}
                            disabled={!input.trim()}
                        >
                            <Plus className="h-4 w-4" />
                        </Button>
                    </div>

                    {/* Suggestions dropdown */}
                    {showSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-40 overflow-y-auto">
                            {filteredSuggestions.map((suggestion, index) => (
                                <button
                                    key={index}
                                    type="button"
                                    onClick={() => addTag(suggestion)}
                                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 transition-colors"
                                >
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Counter */}
            <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                    {tags.length} / {maxTags} tags
                </span>
                {isMaxReached && (
                    <span className="text-orange-600">Límite alcanzado</span>
                )}
            </div>
        </div>
    )
}
