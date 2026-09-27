import io
import threading
import time

from PIL import Image, ImageDraw


class Camera:
    def __init__(self, simulate=False):
        self.simulate = simulate
        self.lock = threading.Lock()
        self.cam = None
        self.error = None
        if not simulate:
            try:
                from picamera2 import Picamera2

                cameras = Picamera2.global_camera_info()
                if not cameras:
                    raise RuntimeError(
                        "No CSI camera detected. Run rpicam-hello --list-cameras."
                    )
                self.cam = Picamera2()
                self.preview_config = self.cam.create_preview_configuration(
                    main={"size": (640, 480), "format": "RGB888"}, buffer_count=2
                )
                self.still_config = self.cam.create_still_configuration(buffer_count=1)
                self.cam.configure(self.preview_config)
                self.cam.start()
            except Exception as exc:
                self.error = str(exc)

    @property
    def online(self):
        return self.simulate or self.cam is not None and self.error is None

    def capture(self, still=False):
        if not self.online:
            raise RuntimeError(self.error or "Camera is unavailable")
        with self.lock:
            buf = io.BytesIO()
            if self.simulate:
                size = (1920, 1440) if still else (640, 480)
                im = Image.new("RGB", size, (10, 18, 29))
                draw = ImageDraw.Draw(im)
                scale = size[0] / 640
                for i in range(18):
                    x = (70 + i * 97 + int(time.time() * 12)) % 580 + 30
                    y = (60 + i * 61) % 410 + 30
                    r = int((12 + i % 4 * 6) * scale)
                    x = int(x * scale)
                    y = int(y * scale)
                    draw.ellipse(
                        (x - r, y - r, x + r, y + r),
                        fill=(35, 75 + i * 4, 120 + i * 5),
                        outline=(80, 170, 240),
                        width=max(1, int(scale)),
                    )
                draw.text(
                    (20, 20),
                    "SIMULATED CAMERA | " + time.strftime("%H:%M:%S"),
                    fill="white",
                )
                im.save(buf, format="JPEG", quality=92 if still else 75)
            elif still:
                self.cam.switch_mode_and_capture_file(
                    self.still_config, buf, format="jpeg"
                )
            else:
                self.cam.capture_file(buf, format="jpeg")
            data = buf.getvalue()
            with Image.open(io.BytesIO(data)) as im:
                w, h = im.size
            return data, w, h

    def close(self):
        if self.cam:
            self.cam.stop()
            self.cam.close()
