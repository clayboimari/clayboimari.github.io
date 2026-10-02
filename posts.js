/* ==========================================================
   Blog posts (placeholders)
   ----------------------------------------------------------
   Newest first. Each post looks like this:

   { date: "2026-10-01", title: "Post title", body: ["First paragraph.", "Second paragraph."] }

   Replace the generated placeholders below with your own list
   whenever you are ready, for example:

   window.POSTS = [
     { date: "2026-10-01", title: "My first post", body: ["Hello."] },
     { date: "2026-09-20", title: "An older post", body: ["Hello again."] }
   ];
   ========================================================== */
(function () {
  var paragraphs = [
    "Placeholder paragraph. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    "Placeholder paragraph. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    "Placeholder paragraph. Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo."
  ];

  // Days between each placeholder post, cycled, so dates look uneven like real posts.
  var gaps = [5, 9, 3, 12, 7, 6, 10, 4, 8, 14, 6, 11];

  function pad(n) { return n < 10 ? "0" + n : String(n); }
  function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }

  var posts = [];
  var d = new Date(2026, 9, 1); // October 1, 2026

  for (var i = 0; i < 40; i++) {
    posts.push({
      date: iso(d),
      title: "Placeholder post " + (i + 1),
      body: [paragraphs[i % 3], paragraphs[(i + 1) % 3], paragraphs[(i + 2) % 3]]
    });
    d.setDate(d.getDate() - gaps[i % gaps.length]);
  }

  window.POSTS = posts;
})();
