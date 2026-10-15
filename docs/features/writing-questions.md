# Writing questions

Questions live in Markdown files in `questions/`, one file per question set.

## The two sets

| File | Name in the host view | Use |
|---|---|---|
| `questions/test.md` | Test questions | A short set for rehearsals (default) |
| `questions/real.md` | Real questions | The event set (25 questions in the summer edition) |

The set names and file names are fixed in `loadQuestionSets()` in `server.js`. Adding a third set means adding it there.

## Format

```markdown
## Question 1
Category: Canada
Question: What is Canada's capital city?
A. Toronto
B. Vancouver
C. Montreal
D. Ottawa
Correct: D
```

- Each question starts with a `## Question <number>` heading. The number is only a label; the order in the file is the play order.
- Fields: `Category`, `Question`, `A`, `B`, `C`, `D`, `Correct`. Field names are case-insensitive and can be followed by `:` or `.`.
- `Correct` is the letter A–D.
- Exactly four options. The category is shown on the host view only.
- Anything before the first `## Question` heading (like a title) is ignored.

## Rules

- Files are read **once at server start**. Restart the server after editing.
- A missing field or a bad `Correct` letter **stops the server from starting**, with an error naming the file and question.
- Keep questions short enough to read on a phone, and keep them friendly to non-football fans (see `AGENTS.md`).

## Where it lives

- `loadQuestionSets`, `parseQuestionMarkdown` in `server.js`
