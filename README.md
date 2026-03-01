# Wave Pongruengkiat — Portfolio

Personal portfolio site for **Wave Pongruengkiat** (วีรธัช พงษ์เรืองเกียรติ), creative technologist and interactive artist based in Chiang Mai, Thailand.

**Live:** [wvweeratouch.github.io/portfolio](https://wvweeratouch.github.io/portfolio/)

## What's here

- **Selected Work** — 6 hand-crafted project pages (CEING, Khwan Dance, Kong, ZER0NE, Data Mask, Technobiological Futures)
- **Archive** — Full project history (2014–2025) pulled live from a Google Sheet, rendered as a filterable card grid
- **About** — Bio, capabilities, exhibition history
- **Contact** — Links and inquiries

## How the Archive works

The [Archive page](https://wvweeratouch.github.io/portfolio/archive.html) fetches a public Google Sheets CSV on page load — no build step, no framework. Edit the spreadsheet, the site updates.

**Sheet columns used:** Year, Title, Platform/Event, City, Country, Type of work, Image URL

To add project images: upload to Google Drive, set sharing to "Anyone with link", paste the URL in the Image URL column. The page auto-converts Drive URLs to direct image links.

## Tech

Static HTML + CSS + vanilla JS. No dependencies, no build tools. Hosted on GitHub Pages.

## Structure

```
index.html              Landing page (selected projects)
archive.html            Full archive (Google Sheets → filterable grid)
about.html              Bio + capabilities
contact.html            Contact links
projects/
  ceing.html            CEING Experiment (with live demo embed)
  khwan-dance.html      Khwan Dance
  kong.html             Kong Interactive
  zer0ne.html           ZER0NE Korea
  data-mask.html        Data Mask
  technobiological.html Technobiological Futures
assets/
  css/style.css         All styles
```

## Local development

Open any `.html` file directly in a browser. For the Archive page (which fetches external data), run a local server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/archive.html`.
