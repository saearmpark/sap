import os
import sys
import json
import time
import shutil
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

CATEGORIES = {
    "문서": {".doc", ".docx", ".pdf", ".txt", ".rtf", ".odt", ".md", ".hwp", ".hwpx"},
    "스프레드시트": {".xls", ".xlsx", ".csv", ".ods", ".numbers"},
    "프레젠테이션": {".ppt", ".pptx", ".odp", ".key"},
    "이미지": {".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".svg", ".tif", ".tiff", ".heic"},
    "동영상": {".mp4", ".mkv", ".avi", ".mov", ".wmv", ".flv", ".webm", ".m4v"},
    "음악": {".mp3", ".wav", ".flac", ".aac", ".ogg", ".m4a", ".wma"},
    "압축": {".zip", ".rar", ".7z", ".tar", ".gz", ".bz2", ".xz"},
    "코드": {".py", ".js", ".ts", ".html", ".css", ".java", ".c", ".cpp", ".cs", ".go",
             ".rs", ".json", ".xml", ".yml", ".yaml", ".sh", ".ps1", ".sql", ".ipynb"},
}


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


def category_for(name, fallback_other=True):
    ext = os.path.splitext(name)[1].lower()
    for category, extensions in CATEGORIES.items():
        if ext in extensions:
            return category
    return "기타" if fallback_other else None


class FolderOrganizer(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("폴더 자동 정리")
        self.minsize(720, 560)
        center(self, 840, 640)
        self._plan = []
        self._build_ui()

    def _build_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        top = ttk.LabelFrame(self, text="대상 폴더")
        top.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 6))
        top.columnconfigure(0, weight=1)
        self.folder_var = tk.StringVar()
        ttk.Entry(top, textvariable=self.folder_var).grid(row=0, column=0, sticky="ew", padx=6, pady=6)
        ttk.Button(top, text="폴더 선택", command=self.choose_folder).grid(row=0, column=1, padx=6)
        ttk.Button(top, text="미리보기", command=self.preview).grid(row=0, column=2, padx=(0, 6))

        options = ttk.Frame(top)
        options.grid(row=1, column=0, columnspan=3, sticky="w", padx=6, pady=(0, 6))
        self.recursive_var = tk.BooleanVar(value=False)
        self.other_var = tk.BooleanVar(value=True)
        ttk.Checkbutton(options, text="하위 폴더 포함", variable=self.recursive_var).pack(side="left")
        ttk.Checkbutton(options, text="기타 파일도 정리", variable=self.other_var).pack(side="left", padx=12)
        ttk.Label(options, text="분류: 문서 · 스프레드시트 · 프레젠테이션 · 이미지 · 동영상 · 음악 · 압축 · 코드 · 기타").pack(side="left", padx=12)

        preview = ttk.LabelFrame(self, text="이동 미리보기")
        preview.grid(row=2, column=0, sticky="nsew", padx=10, pady=6)
        preview.columnconfigure(0, weight=1)
        preview.rowconfigure(0, weight=1)
        self.tree = ttk.Treeview(preview, columns=("category",), show="tree headings", height=16)
        self.tree.heading("#0", text="파일")
        self.tree.heading("category", text="이동할 폴더")
        self.tree.column("#0", width=560)
        self.tree.column("category", width=180, anchor="center")
        self.tree.grid(row=0, column=0, sticky="nsew", padx=(6, 0), pady=6)
        bar = ttk.Scrollbar(preview, orient="vertical", command=self.tree.yview)
        bar.grid(row=0, column=1, sticky="ns", pady=6)
        self.tree.configure(yscrollcommand=bar.set)

        status = ttk.Frame(self)
        status.grid(row=3, column=0, sticky="ew", padx=10, pady=(0, 4))
        status.columnconfigure(0, weight=1)
        self.status = ttk.Label(status, text="폴더를 선택하고 미리보기를 누르세요.")
        self.status.grid(row=0, column=0, sticky="w")

        actions = ttk.Frame(self)
        actions.grid(row=4, column=0, sticky="ew", padx=10, pady=8)
        actions.columnconfigure(0, weight=1)
        ttk.Button(actions, text="마지막 정리 되돌리기", command=self.undo).grid(row=0, column=1, padx=4)
        ttk.Button(actions, text="정리 실행", command=self.run).grid(row=0, column=2)

    def choose_folder(self):
        path = filedialog.askdirectory()
        if path:
            self.folder_var.set(path)
            self.preview()

    def _collect(self, folder, recursive):
        plan = []
        other = self.other_var.get()
        if recursive:
            for root, _dirs, names in os.walk(folder):
                for name in names:
                    path = os.path.join(root, name)
                    category = category_for(name, other)
                    if category:
                        plan.append((path, category))
        else:
            for name in os.listdir(folder):
                path = os.path.join(folder, name)
                if os.path.isfile(path):
                    category = category_for(name, other)
                    if category:
                        plan.append((path, category))
        return sorted(plan, key=lambda item: (item[1], item[0].lower()))

    def preview(self):
        folder = self.folder_var.get().strip()
        if not os.path.isdir(folder):
            self.status.config(text="유효한 폴더를 선택하세요.")
            return
        self._plan = self._collect(folder, self.recursive_var.get())
        self.tree.delete(*self.tree.get_children())
        counts = {}
        for path, category in self._plan:
            counts[category] = counts.get(category, 0) + 1
            self.tree.insert("", "end", text=path, values=(category,))
        summary = " · ".join(f"{key} {value}" for key, value in sorted(counts.items())) or "이동할 파일 없음"
        self.status.config(text=f"이동 대상 {len(self._plan)}개 · {summary}")

    def run(self):
        folder = self.folder_var.get().strip()
        if not os.path.isdir(folder):
            messagebox.showerror("오류", "유효한 폴더를 선택하세요.")
            return
        self._plan = self._collect(folder, self.recursive_var.get())
        if not self._plan:
            messagebox.showinfo("알림", "정리할 파일이 없습니다.")
            return
        if not messagebox.askyesno("확인", f"{len(self._plan)}개 파일을 분류 폴더로 이동할까요?"):
            return
        moved = []
        for path, category in self._plan:
            target_dir = os.path.join(folder, category)
            os.makedirs(target_dir, exist_ok=True)
            target = os.path.join(target_dir, os.path.basename(path))
            stem, ext = os.path.splitext(target)
            index = 1
            while os.path.exists(target):
                target = f"{stem}_{index}{ext}"
                index += 1
            try:
                shutil.move(path, target)
                moved.append((target, path))
            except OSError:
                pass
        if moved:
            log = {"time": time.strftime("%Y-%m-%d %H:%M:%S"), "moves": moved}
            log_path = os.path.join(folder, f".organizer_undo_{int(time.time())}.json")
            with open(log_path, "w", encoding="utf-8") as handle:
                json.dump(log, handle, ensure_ascii=False, indent=2)
        self.status.config(text=f"{len(moved)}개 파일을 정리했습니다. '마지막 정리 되돌리기'로 복구할 수 있습니다.")
        self.preview()

    def undo(self):
        folder = self.folder_var.get().strip()
        if not os.path.isdir(folder):
            messagebox.showerror("오류", "유효한 폴더를 선택하세요.")
            return
        logs = sorted(name for name in os.listdir(folder)
                      if name.startswith(".organizer_undo_") and name.endswith(".json"))
        if not logs:
            messagebox.showinfo("알림", "되돌릴 정리 기록이 없습니다.")
            return
        log_path = os.path.join(folder, logs[-1])
        with open(log_path, "r", encoding="utf-8") as handle:
            log = json.load(handle)
        restored = 0
        for target, original in log.get("moves", []):
            if os.path.exists(target):
                os.makedirs(os.path.dirname(original), exist_ok=True)
                try:
                    shutil.move(target, original)
                    restored += 1
                except OSError:
                    pass
        os.remove(log_path)
        self.status.config(text=f"{restored}개 파일을 원래 위치로 되돌렸습니다.")
        self.preview()


if __name__ == "__main__":
    enable_dpi_awareness()
    FolderOrganizer().mainloop()
