import os
import sys
import time
import shutil
import hashlib
import threading
from collections import defaultdict
import tkinter as tk
from tkinter import ttk, filedialog, messagebox


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


def human_size(num):
    value = float(num)
    for unit in ("B", "KB", "MB", "GB", "TB"):
        if abs(value) < 1024.0:
            return f"{int(value)} B" if unit == "B" else f"{value:,.1f} {unit}"
        value /= 1024.0
    return f"{value:,.1f} PB"


def hash_file(path, limit=None):
    digest = hashlib.sha1()
    remaining = limit
    with open(path, "rb") as handle:
        while True:
            size = 1024 * 1024 if remaining is None else min(1024 * 1024, remaining)
            chunk = handle.read(size)
            if not chunk:
                break
            digest.update(chunk)
            if remaining is not None:
                remaining -= len(chunk)
                if remaining <= 0:
                    break
    return digest.hexdigest()


class DuplicateFinder(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("중복 파일 찾기 / 정리")
        self.minsize(760, 620)
        center(self, 900, 700)
        self.folders = []
        self._cancel = threading.Event()
        self._running = False
        self._path_by_item = {}
        self._build_ui()

    def _build_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        targets = ttk.LabelFrame(self, text="검색 폴더")
        targets.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 6))
        targets.columnconfigure(0, weight=1)

        self.listbox = tk.Listbox(targets, height=4)
        self.listbox.grid(row=0, column=0, sticky="ew", padx=6, pady=6)
        buttons = ttk.Frame(targets)
        buttons.grid(row=0, column=1, sticky="ns", padx=(0, 6), pady=6)
        ttk.Button(buttons, text="폴더 추가", command=self.add_folder).pack(fill="x")
        ttk.Button(buttons, text="선택 제거", command=self.remove_folder).pack(fill="x", pady=(6, 0))

        options = ttk.Frame(targets)
        options.grid(row=1, column=0, columnspan=2, sticky="w", padx=6, pady=(0, 6))
        ttk.Label(options, text="최소 크기(KB)").pack(side="left")
        self.min_size_var = tk.StringVar(value="1")
        ttk.Entry(options, textvariable=self.min_size_var, width=8).pack(side="left", padx=6)

        result = ttk.LabelFrame(self, text="중복 그룹")
        result.grid(row=2, column=0, sticky="nsew", padx=10, pady=6)
        result.columnconfigure(0, weight=1)
        result.rowconfigure(0, weight=1)

        self.tree = ttk.Treeview(result, columns=("size", "count"), show="tree headings", height=16)
        self.tree.heading("#0", text="경로")
        self.tree.heading("size", text="크기")
        self.tree.heading("count", text="개수")
        self.tree.column("#0", width=560)
        self.tree.column("size", width=110, anchor="e")
        self.tree.column("count", width=70, anchor="center")
        self.tree.grid(row=0, column=0, sticky="nsew", padx=(6, 0), pady=6)
        bar = ttk.Scrollbar(result, orient="vertical", command=self.tree.yview)
        bar.grid(row=0, column=1, sticky="ns", pady=6)
        self.tree.configure(yscrollcommand=bar.set)

        controls = ttk.Frame(self)
        controls.grid(row=3, column=0, sticky="ew", padx=10, pady=(0, 4))
        controls.columnconfigure(0, weight=1)
        self.status = ttk.Label(controls, text="폴더를 추가하고 검색을 시작하세요.")
        self.status.grid(row=0, column=0, sticky="w")

        self.progress = ttk.Progressbar(self, mode="determinate")
        self.progress.grid(row=4, column=0, sticky="ew", padx=10)

        actions = ttk.Frame(self)
        actions.grid(row=5, column=0, sticky="ew", padx=10, pady=8)
        actions.columnconfigure(0, weight=1)
        ttk.Button(actions, text="그룹당 1개만 남기고 선택", command=self.select_duplicates).grid(row=0, column=1, padx=4)
        ttk.Button(actions, text="선택 → _duplicates로 이동", command=self.move_selected).grid(row=0, column=2, padx=4)
        ttk.Button(actions, text="선택 영구 삭제", command=self.delete_selected).grid(row=0, column=3, padx=4)
        self.scan_button = ttk.Button(actions, text="검색 시작", command=self.start_scan)
        self.scan_button.grid(row=0, column=4, padx=(4, 0))

    def add_folder(self):
        path = filedialog.askdirectory()
        if path and path not in self.folders:
            self.folders.append(path)
            self.listbox.insert("end", path)

    def remove_folder(self):
        for index in reversed(self.listbox.curselection()):
            self.listbox.delete(index)
            del self.folders[index]

    def start_scan(self):
        if self._running:
            return
        if not self.folders:
            messagebox.showinfo("알림", "검색할 폴더를 추가하세요.")
            return
        try:
            min_size = max(0, int(float(self.min_size_var.get()) * 1024))
        except ValueError:
            messagebox.showerror("오류", "최소 크기는 숫자여야 합니다.")
            return
        self._running = True
        self._cancel.clear()
        self.scan_button.config(text="중지", command=self.stop_scan)
        self.tree.delete(*self.tree.get_children())
        self._path_by_item.clear()
        folders = list(self.folders)
        threading.Thread(target=self._scan_worker, args=(folders, min_size), daemon=True).start()

    def stop_scan(self):
        self._cancel.set()

    def _scan_worker(self, folders, min_size):
        try:
            groups = self._scan(folders, min_size)
        except Exception as error:
            self.after(0, lambda: self._finish(f"오류: {error}"))
            return
        self.after(0, lambda: self._render(groups))

    def _scan(self, folders, min_size):
        size_map = defaultdict(list)
        for folder in folders:
            for root, _dirs, names in os.walk(folder):
                for name in names:
                    path = os.path.join(root, name)
                    try:
                        if os.path.islink(path):
                            continue
                        size = os.path.getsize(path)
                    except OSError:
                        continue
                    if size >= min_size:
                        size_map[size].append(path)

        candidates = {size: paths for size, paths in size_map.items() if len(paths) > 1}
        total = sum(len(paths) for paths in candidates.values()) or 1
        done = 0
        groups = []
        for size, paths in candidates.items():
            partial = defaultdict(list)
            for path in paths:
                if self._cancel.is_set():
                    return None
                try:
                    partial[hash_file(path, 65536)].append(path)
                except OSError:
                    pass
                done += 1
                self.after(0, self._set_progress, done, total, path)
            for sub in partial.values():
                if len(sub) < 2:
                    continue
                full = defaultdict(list)
                for path in sub:
                    if self._cancel.is_set():
                        return None
                    try:
                        full[hash_file(path)].append(path)
                    except OSError:
                        pass
                    done += 1
                    self.after(0, self._set_progress, done, total, path)
                for identical in full.values():
                    if len(identical) > 1:
                        groups.append((size, sorted(identical)))
        groups.sort(key=lambda item: item[0] * (len(item[1]) - 1), reverse=True)
        return groups

    def _set_progress(self, done, total, path):
        self.progress["value"] = min(100, done * 100 / total)
        self.status.config(text=f"검사 중 {done}/{total} · {os.path.basename(path)}")

    def _render(self, groups):
        self.progress["value"] = 0
        self._running = False
        self.scan_button.config(text="검색 시작", command=self.start_scan)
        if groups is None:
            self.status.config(text="검색을 중지했습니다.")
            return
        if not groups:
            self.status.config(text="중복 파일이 없습니다.")
            return
        wasted = 0
        for index, (size, paths) in enumerate(groups, start=1):
            wasted += size * (len(paths) - 1)
            label = f"그룹 {index} · {human_size(size)} · {len(paths)}개"
            parent = self.tree.insert("", "end", text=label, values=("", ""), open=False)
            for path in paths:
                item = self.tree.insert(parent, "end", text=path, values=(human_size(size), ""))
                self._path_by_item[item] = path
        self.status.config(text=f"중복 그룹 {len(groups)}개 · 절약 가능 {human_size(wasted)}")

    def _finish(self, message):
        self._running = False
        self.progress["value"] = 0
        self.scan_button.config(text="검색 시작", command=self.start_scan)
        self.status.config(text=message)

    def select_duplicates(self):
        for parent in self.tree.get_children():
            children = self.tree.get_children(parent)
            for item in children[1:]:
                self.tree.selection_add(item)

    def _selected_files(self):
        return [self._path_by_item[item] for item in self.tree.selection() if item in self._path_by_item]

    def move_selected(self):
        files = self._selected_files()
        if not files:
            messagebox.showinfo("알림", "이동할 파일을 선택하세요.")
            return
        if not messagebox.askyesno("확인", f"선택한 {len(files)}개 파일을 각 폴더의 _duplicates로 이동할까요?"):
            return
        moved = 0
        for path in files:
            target_dir = os.path.join(os.path.dirname(path), "_duplicates")
            os.makedirs(target_dir, exist_ok=True)
            target = os.path.join(target_dir, os.path.basename(path))
            stem, ext = os.path.splitext(target)
            index = 1
            while os.path.exists(target):
                target = f"{stem}_{index}{ext}"
                index += 1
            try:
                shutil.move(path, target)
                moved += 1
            except OSError:
                pass
        self.status.config(text=f"{moved}개 파일을 _duplicates로 이동했습니다.")

    def delete_selected(self):
        files = self._selected_files()
        if not files:
            messagebox.showinfo("알림", "삭제할 파일을 선택하세요.")
            return
        if not messagebox.askyesno("경고", f"선택한 {len(files)}개 파일을 영구 삭제할까요?\n이 작업은 되돌릴 수 없습니다."):
            return
        deleted = 0
        for path in files:
            try:
                os.remove(path)
                deleted += 1
            except OSError:
                pass
        self.status.config(text=f"{deleted}개 파일을 삭제했습니다.")


if __name__ == "__main__":
    enable_dpi_awareness()
    DuplicateFinder().mainloop()
