import os
import sys
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

try:
    from PIL import Image, ImageOps
except ImportError:
    Image = None
    ImageOps = None

IMAGE_TYPES = [
    (".jpg", ".jpeg", ".png", ".bmp", ".gif", ".webp", ".tif", ".tiff"),
]

FORMATS = {
    "원본 유지": None,
    "JPEG": "JPEG",
    "PNG": "PNG",
    "WEBP": "WEBP",
}

EXTENSIONS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}


def enable_dpi_awareness():
    if sys.platform != "win32":
        return
    try:
        import ctypes
        ctypes.windll.shcore.SetProcessDpiAwareness(1)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


def center(window, width, height):
    window.update_idletasks()
    x = max(0, (window.winfo_screenwidth() - width) // 2)
    y = max(0, (window.winfo_screenheight() - height) // 3)
    window.geometry(f"{width}x{height}+{x}+{y}")


def is_image(path):
    return os.path.splitext(path)[1].lower() in IMAGE_TYPES[0]


class ImageBatch(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("이미지 일괄 리사이즈 / 변환")
        self.minsize(760, 620)
        center(self, 880, 680)
        self.files = []
        self._cancel = threading.Event()
        self._running = False
        self._build_ui()
        if Image is None:
            self.after(200, lambda: messagebox.showerror(
                "Pillow 필요", "이미지 기능을 사용하려면 Pillow가 필요합니다.\npip install Pillow"))

    def _build_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        files = ttk.LabelFrame(self, text="이미지 목록")
        files.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 6))
        files.columnconfigure(0, weight=1)
        self.listbox = tk.Listbox(files, height=6)
        self.listbox.grid(row=0, column=0, sticky="ew", padx=6, pady=6)
        buttons = ttk.Frame(files)
        buttons.grid(row=0, column=1, sticky="ns", padx=(0, 6), pady=6)
        ttk.Button(buttons, text="파일 추가", command=self.add_files).pack(fill="x")
        ttk.Button(buttons, text="폴더 추가", command=self.add_folder).pack(fill="x", pady=(6, 0))
        ttk.Button(buttons, text="목록 비우기", command=self.clear_files).pack(fill="x", pady=(6, 0))

        settings = ttk.LabelFrame(self, text="변환 설정")
        settings.grid(row=1, column=0, sticky="ew", padx=10, pady=6)
        for col in (1, 3):
            settings.columnconfigure(col, weight=1)

        self.mode_var = tk.StringVar(value="맞춤(비율 유지)")
        self.width_var = tk.StringVar(value="1280")
        self.height_var = tk.StringVar(value="720")
        self.percent_var = tk.StringVar(value="50")
        self.format_var = tk.StringVar(value="원본 유지")
        self.quality_var = tk.IntVar(value=85)
        self.exif_var = tk.BooleanVar(value=True)
        self.twice_var = tk.BooleanVar(value=False)
        self.output_var = tk.StringVar()

        ttk.Label(settings, text="크기 조정").grid(row=0, column=0, sticky="w", padx=6, pady=4)
        ttk.Combobox(settings, textvariable=self.mode_var, state="readonly",
                     values=["맞춤(비율 유지)", "너비 고정", "높이 고정", "퍼센트"], width=16).grid(row=0, column=1, sticky="w", padx=6)

        size = ttk.Frame(settings)
        size.grid(row=1, column=0, columnspan=4, sticky="w", padx=6, pady=4)
        ttk.Label(size, text="너비").pack(side="left")
        ttk.Entry(size, textvariable=self.width_var, width=8).pack(side="left", padx=(4, 12))
        ttk.Label(size, text="높이").pack(side="left")
        ttk.Entry(size, textvariable=self.height_var, width=8).pack(side="left", padx=(4, 12))
        ttk.Label(size, text="퍼센트").pack(side="left")
        ttk.Entry(size, textvariable=self.percent_var, width=6).pack(side="left", padx=4)

        ttk.Label(settings, text="출력 형식").grid(row=2, column=0, sticky="w", padx=6, pady=4)
        ttk.Combobox(settings, textvariable=self.format_var, state="readonly",
                     values=list(FORMATS.keys()), width=16).grid(row=2, column=1, sticky="w", padx=6)
        ttk.Label(settings, text="품질").grid(row=2, column=2, sticky="e", padx=6)
        ttk.Scale(settings, from_=1, to=100, orient="horizontal", variable=self.quality_var).grid(row=2, column=3, sticky="ew", padx=6)

        ttk.Checkbutton(settings, text="EXIF 회전 보정", variable=self.exif_var).grid(row=3, column=0, columnspan=2, sticky="w", padx=6, pady=4)
        ttk.Checkbutton(settings, text="원본 2배(고해상도) 저장", variable=self.twice_var).grid(row=3, column=2, columnspan=2, sticky="w", padx=6)

        out = ttk.LabelFrame(self, text="저장 위치")
        out.grid(row=2, column=0, sticky="ew", padx=10, pady=6)
        out.columnconfigure(0, weight=1)
        ttk.Entry(out, textvariable=self.output_var).grid(row=0, column=0, sticky="ew", padx=6, pady=6)
        ttk.Button(out, text="폴더 선택", command=self.choose_output).grid(row=0, column=1, padx=6)
        ttk.Label(out, text="비우면 각 이미지 옆의 'converted' 폴더에 저장됩니다.").grid(row=1, column=0, columnspan=2, sticky="w", padx=6, pady=(0, 6))

        controls = ttk.Frame(self)
        controls.grid(row=3, column=0, sticky="ew", padx=10, pady=(0, 4))
        controls.columnconfigure(0, weight=1)
        self.status = ttk.Label(controls, text="이미지를 추가하고 실행하세요.")
        self.status.grid(row=0, column=0, sticky="w")

        self.progress = ttk.Progressbar(self, mode="determinate")
        self.progress.grid(row=4, column=0, sticky="ew", padx=10)

        actions = ttk.Frame(self)
        actions.grid(row=5, column=0, sticky="ew", padx=10, pady=8)
        actions.columnconfigure(0, weight=1)
        self.run_button = ttk.Button(actions, text="변환 실행", command=self.start)
        self.run_button.grid(row=0, column=1)

    def add_files(self):
        paths = filedialog.askopenfilenames(title="이미지 선택")
        for path in paths:
            if is_image(path) and path not in self.files:
                self.files.append(path)
                self.listbox.insert("end", path)
        self.status.config(text=f"{len(self.files)}개 이미지")

    def add_folder(self):
        folder = filedialog.askdirectory()
        if not folder:
            return
        added = 0
        for root, _dirs, names in os.walk(folder):
            for name in names:
                path = os.path.join(root, name)
                if is_image(path) and path not in self.files:
                    self.files.append(path)
                    self.listbox.insert("end", path)
                    added += 1
        self.status.config(text=f"{added}개 추가 · 총 {len(self.files)}개 이미지")

    def clear_files(self):
        self.files.clear()
        self.listbox.delete(0, "end")
        self.status.config(text="목록을 비웠습니다.")

    def choose_output(self):
        path = filedialog.askdirectory()
        if path:
            self.output_var.set(path)

    def _target_size(self, width, height):
        mode = self.mode_var.get()
        try:
            if mode == "맞춤(비율 유지)":
                box = (int(self.width_var.get()), int(self.height_var.get()))
                return ImageOps.contain(Image.new("RGB", (width, height)), box).size
            if mode == "너비 고정":
                target_w = int(self.width_var.get())
                return (target_w, max(1, round(height * target_w / width)))
            if mode == "높이 고정":
                target_h = int(self.height_var.get())
                return (max(1, round(width * target_h / height)), target_h)
            percent = float(self.percent_var.get()) / 100.0
            return (max(1, round(width * percent)), max(1, round(height * percent)))
        except (ValueError, ZeroDivisionError):
            raise ValueError("크기/퍼센트 값을 확인하세요.")

    def start(self):
        if Image is None:
            messagebox.showerror("Pillow 필요", "pip install Pillow 후 다시 실행하세요.")
            return
        if self._running or not self.files:
            if not self.files:
                messagebox.showinfo("알림", "이미지를 추가하세요.")
            return
        self._running = True
        self._cancel.clear()
        self.run_button.config(text="중지", command=lambda: self._cancel.set())
        self.progress["value"] = 0
        threading.Thread(target=self._worker, daemon=True).start()

    def _worker(self):
        output_root = self.output_var.get().strip()
        fmt = FORMATS[self.format_var.get()]
        quality = int(self.quality_var.get())
        exif = self.exif_var.get()
        twice = self.twice_var.get()
        total = len(self.files)
        done = 0
        errors = []
        for path in self.files:
            if self._cancel.is_set():
                break
            try:
                with Image.open(path) as image:
                    if exif:
                        image = ImageOps.exif_transpose(image)
                    if fmt is None:
                        save_format = image.format or "PNG"
                        ext = os.path.splitext(path)[1].lower() or ".png"
                    else:
                        save_format = fmt
                        ext = EXTENSIONS[fmt]
                    size = self._target_size(image.width, image.height)
                    resized = image.resize(size, Image.LANCZOS)
                    if save_format == "JPEG" and resized.mode not in ("RGB", "L"):
                        resized = resized.convert("RGB")
                    if twice:
                        dpi = resized.info.get("dpi", (72, 72))
                        out = os.path.splitext(self._output_path(path, output_root, ext))[0] + "@2x" + ext
                    else:
                        out = self._output_path(path, output_root, ext)
                    params = {}
                    if save_format in ("JPEG", "WEBP"):
                        params["quality"] = quality
                    if save_format == "JPEG":
                        params["optimize"] = True
                    resized.save(out, format=save_format, **params)
            except Exception as error:
                errors.append(f"{os.path.basename(path)}: {error}")
            done += 1
            self.after(0, self._progress, done, total, path)
        self.after(0, self._finish, done, total, errors)

    def _output_path(self, path, output_root, ext):
        directory = os.path.dirname(path)
        target_dir = output_root or os.path.join(directory, "converted")
        os.makedirs(target_dir, exist_ok=True)
        stem = os.path.splitext(os.path.basename(path))[0]
        return os.path.join(target_dir, f"{stem}{ext}")

    def _progress(self, done, total, path):
        self.progress["value"] = done * 100 / total
        self.status.config(text=f"변환 중 {done}/{total} · {os.path.basename(path)}")

    def _finish(self, done, total, errors):
        self._running = False
        self.progress["value"] = 0
        self.run_button.config(text="변환 실행", command=self.start)
        if errors:
            self.status.config(text=f"{done}개 처리 · 오류 {len(errors)}개")
            messagebox.showwarning("일부 실패", "\n".join(errors[:10]))
        else:
            self.status.config(text=f"{done}개 이미지를 변환했습니다.")


if __name__ == "__main__":
    enable_dpi_awareness()
    ImageBatch().mainloop()
