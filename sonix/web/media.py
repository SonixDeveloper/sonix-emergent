"""Bounded image decoding, immutable media URLs, and animated banner crops."""

import base64
import hashlib
import io
import re
import tempfile
import warnings
from pathlib import Path

from PIL import Image, ImageOps, ImageSequence, UnidentifiedImageError

Image.MAX_IMAGE_PIXELS = 20_000_000
MAX_UPLOAD = 24 * 1024 * 1024


class ImageStore:
    def __init__(self, database):
        self.temporary = tempfile.TemporaryDirectory(prefix="sonix-media-") if str(database) == ":memory:" else None
        self.root = Path(self.temporary.name if self.temporary else str(database) + ".media")
        self.root.mkdir(mode=0o700, parents=True, exist_ok=True)

    def path(self, value):
        if not isinstance(value, str) or not re.fullmatch(r"/media/[a-f0-9]{64}\.(webp|gif)", value):
            return None
        path = self.root / value.removeprefix("/media/")
        return path if path.is_file() else None

    def write(self, data, extension):
        name = hashlib.sha256(data).hexdigest() + "." + extension
        path = self.root / name
        if not path.exists():
            path.write_bytes(data)
            path.chmod(0o600)
        return "/media/" + name

    def store(self, value, max_dimension=1600):
        if not value:
            return ""
        if self.path(value):
            return value
        if not isinstance(value, str) or len(value) > MAX_UPLOAD * 4 // 3 + 100:
            raise ValueError("This image is too large. Try a smaller image or animation.")
        match = re.fullmatch(r"data:image/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)", value)
        if not match:
            raise ValueError("Choose a readable PNG, JPEG, WebP or GIF image.")
        try:
            raw = base64.b64decode(match[2], validate=True)
            if len(raw) > MAX_UPLOAD:
                raise ValueError("This image is too large. Try a smaller image or animation.")
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(raw)) as source:
                    frames = getattr(source, "n_frames", 1)
                    if frames > 200 or source.width * source.height * frames > 45_000_000:
                        raise ValueError("This image has too many pixels or animation frames. Try a smaller version.")
                    if frames > 1:
                        if source.format != "GIF":
                            raise ValueError("Use GIF for animated images.")
                        return self.write(raw, "gif")
                    image = ImageOps.exif_transpose(source).convert("RGBA")
                    image.thumbnail((max_dimension, max_dimension), Image.Resampling.LANCZOS)
                    output = io.BytesIO()
                    image.save(output, format="WEBP", quality=88, method=4)
                    return self.write(output.getvalue(), "webp")
        except (UnidentifiedImageError, OSError, Image.DecompressionBombError, Image.DecompressionBombWarning) as exc:
            raise ValueError("This image could not be read. Try another image or a smaller version.") from exc

    def crop(self, value, horizontal, vertical, zoom):
        source_url = self.store(value)
        path = self.path(source_url)
        if not path:
            raise ValueError("Choose a banner image first.")
        with Image.open(path) as source:
            width, height = source.size
            # The crop stays inside the original image at every zoom level.
            crop_width = min(width, height * 2.5) / zoom
            crop_height = crop_width / 2.5
            left = (width - crop_width) * horizontal / 100
            top = (height - crop_height) * vertical / 100
            box = (left, top, left + crop_width, top + crop_height)
            output = io.BytesIO()
            if getattr(source, "n_frames", 1) > 1:
                frames, durations = [], []
                for frame in ImageSequence.Iterator(source):
                    frames.append(frame.convert("RGBA").resize((600, 240), Image.Resampling.LANCZOS, box=box))
                    durations.append(frame.info.get("duration", 100))
                options = {"loop": source.info["loop"]} if "loop" in source.info else {}
                frames[0].save(output, format="GIF", save_all=True, append_images=frames[1:],
                               duration=durations, disposal=2, **options)
                banner = self.write(output.getvalue(), "gif")
            else:
                image = source.convert("RGBA").resize((600, 240), Image.Resampling.LANCZOS, box=box)
                image.save(output, format="WEBP", quality=90)
                banner = self.write(output.getvalue(), "webp")
        return {"banner": banner, "banner_source": source_url,
                "banner_horizontal": horizontal, "banner_position": vertical, "banner_zoom": zoom}
