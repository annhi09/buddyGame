# BuddyGame Lesson Schema

## Purpose
This document defines the lesson data structure used by BuddyGame. The schema should support:
- local lesson creation
- import/export
- IndexedDB storage
- JSON sharing
- future ZIP bundle support
- future marketplace distribution

## Words Lesson Structure

### Basic Example
```json
{
  "title": "Animals",
  "description": "Basic animal vocabulary for early learners",
  "category": "Words",
  "difficulty": "easy",
  "tags": ["animals", "vocabulary", "preschool"],
  "items": [
    {
      "word": "lion",
      "image": "idb:lion-image",
      "audio": "",
      "sentence": "The lion is strong."
    },
    {
      "word": "cat",
      "image": "idb:cat-image",
      "audio": "",
      "sentence": "The cat is soft."
    }
  ]
}