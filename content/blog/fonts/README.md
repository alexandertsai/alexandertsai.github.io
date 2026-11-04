# Typst fonts

The native compiler and blog use the bundled Inter family in `public/fonts/inter/` for consistent typography. Its open font license is stored alongside the font files.

To use another family, add its licensed desktop `.otf` or `.ttf` files here, then select it with `#set text(font: "Family Name")` in the post. Include the faces needed by your content. Ensure your font license permits using and committing the font files before placing them in the repository.

An Adobe Fonts web stylesheet cannot supply fonts to the native Typst compiler. The homepage continues to use its existing Adobe Fonts configuration.
