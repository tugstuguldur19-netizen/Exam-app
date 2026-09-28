# Imported question banks

`content/<subject>/<lesson>.json` holds a lesson's questions imported from a
.docx test. `npm run seed` loads them after the built-in questions from
`seedData.ts` / `seedDataExtra.ts`.

Create or replace a file with:

```bash
npm run import:docx -- <subject> <lesson> path/to/test.docx
# e.g. FIDIC clause 14:
npm run import:docx -- fidic c14 ~/Downloads/clause14.docx
```

Format (one array per file):

```json
[
  {
    "q": "Question text",
    "choices": [{ "label": "A", "text": "…" }, { "label": "B", "text": "…" }],
    "answer": 1,
    "explanation": "optional",
    "trial": true
  },
  { "q": "Short-answer question", "choices": [], "correctText": "the answer" }
]
```

`answer` is the index of the correct choice (`null` if unknown — the question
is kept but not scored). Question ids come from the position in the file, so
add new questions at the end; questions removed from a file are deleted from
the database on the next seed.
