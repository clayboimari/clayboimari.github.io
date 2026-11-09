# Website (first draft)

A static site: no build step, no dependencies. Open `index.html` in a browser to preview it.

## Files

| File | What it does |
| --- | --- |
| `index.html` | Page structure: header, banner, highlights box, feed, date wheel |
| `styles.css` | All styling, including the white-to-blue background |
| `posts.js` | The blog posts (currently 40 placeholders) |
| `script.js` | Live clock, post feed, date wheel, highlights box |

## Put it on GitHub

1. Create a repository (or open an existing one).
2. Upload all four site files to the top level of the repository (not inside a subfolder).
3. To get a live link: in the repository go to Settings, then Pages, set the source to "Deploy from a branch", choose your main branch and the `/ (root)` folder, and save. The site appears at `https://<your-username>.github.io/<repository-name>/` after a minute or two.

## Editing

- **Posts:** edit `posts.js`. Newest first, each with a `date` (`YYYY-MM-DD`), `title`, and a `body` list of paragraphs.
- **Timing and behaviour:** the `CONFIG` block at the top of `script.js` holds the 5-second scroll threshold and related values.
- **Colours and lines:** the variables at the top of `styles.css` (`--tint` is the blue at the bottom of the background).
- **Highlights box:** use its Edit button to rename, add or remove items, and the pin icon to keep an item at the top. Changes are stored in the browser you make them in, so other visitors see the defaults from `script.js`.
