"""Bundle index.html + css/ + js/ into a single self-contained cifra-online.html."""
html = open("index.html").read()
html = html.replace('<link rel="stylesheet" href="css/style.css">',
                    "<style>\n" + open("css/style.css").read() + "\n</style>")
for name in ["chords", "audio", "fretboard", "scales", "school", "jam", "app"]:
    js = open(f"js/{name}.js").read().replace("</script", "<\\/script")
    html = html.replace(f'<script src="js/{name}.js"></script>', "<script>\n" + js + "\n</script>")
open("cifra-online.html", "w").write(html)
print("Wrote cifra-online.html")
