# Shareable docs (PDF + Word)

Phone / WhatsApp / email–friendly exports of every markdown guide in `docs/`.

| File | Best for |
|------|----------|
| `*.pdf` | Reading on phone, WhatsApp, printing |
| `*.docx` | Editing in Word / Google Docs |

**Folder:** `docs/shareable/` (clean set to zip and send)  
Same files are also copied next to each `.md` in `docs/`.

## Regenerate after editing markdown

```powershell
cd "E:\535 west"
.\.venv\Scripts\python scripts\export_docs.py
```

## Recommended send pack for partner call

1. `FEATURE_GUIDE.pdf` — full module walkthrough  
2. `DEMO_SCRIPT.pdf` — timed demo beats  
3. `PRODUCT.pdf` — one-pager product story  
4. `PARTNER_CONVICTION_BRIEF.pdf` — narrative / talking points  

Zip example:

```powershell
Compress-Archive -Path "E:\535 west\docs\shareable\*.pdf" -DestinationPath "E:\535 west\docs\Signal_Docs_PDF.zip" -Force
```
