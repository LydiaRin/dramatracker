from io import BytesIO
import colorsys

import httpx
from PIL import Image

# A tiny poster is enough to find its colour, and it downloads fast
POSTER_SMALL = "https://image.tmdb.org/t/p/w92"


def poster_accent(poster_path: str | None) -> str | None:
    """The poster's most vivid colour as "#RRGGBB", brightened so it reads on the black theme."""
    if not poster_path:
        return None
    resp = httpx.get(POSTER_SMALL + poster_path, timeout=15)
    resp.raise_for_status()
    img = Image.open(BytesIO(resp.content)).convert("RGB").resize((48, 72))
    colors = img.quantize(colors=8).convert("RGB").getcolors(48 * 72)  # [(pixel count, (r, g, b)), ...]

    best, best_score = None, -1.0
    for count, (r, g, b) in colors:
        h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
        if l < 0.12 or l > 0.9 or s < 0.18:  # near-black, near-white and grey say nothing about the drama
            continue
        # Favour colours that are both common on the poster and saturated
        score = count * (s ** 2) * (1 - abs(l - 0.5))
        if score > best_score:
            best, best_score = (h, l, s), score
    if best is None:
        return None  # a grey poster: the frontend falls back to the red seal colour

    h, l, s = best
    r, g, b = colorsys.hls_to_rgb(h, max(l, 0.58), max(s, 0.65))
    return "#{:02X}{:02X}{:02X}".format(round(r * 255), round(g * 255), round(b * 255))
