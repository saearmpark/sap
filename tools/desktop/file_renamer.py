import os
import sys
import uuid
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


class RenamerApp(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("파일 이름 일괄 변경기")
        self.minsize(720, 620)
        center(self, 860, 680)
        self._plan = []
        self._build_ui()

    def _build_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        folder = ttk.LabelFrame(self, text="대상")
        folder.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 6))
        folder.columnconfigure(1, weight=1)

        self.folder_var = tk.StringVar()
        ttk.Entry(folder, textvariable=self.folder_var).grid(row=0, column=0, columnspan=2, sticky="ew", padx=6, pady=6)
        ttk.Button(folder, text="폴더 선택", command=self.choose_folder).grid(row=0, column=2, padx=6, pady=6)

        ttk.Label(folder, text="확장자 필터").grid(row=1, column=0, sticky="w", padx=6)
        self.ext_var = tk.StringVar(value=".jpg,.png,.txt,.pdf")
        ttk.Entry(folder, textvariable=self.ext_var).grid(row=1, column=1, sticky="ew", padx=6, pady=4)
        self.recursive_var = tk.BooleanVar(value=False)
        ttk.Checkbutton(folder, text="하위 폴더 포함", variable=self.recursive_var).grid(row=1, column=2, sticky="w", padx=6)

        rules = ttk.LabelFrame(self, text="변경 규칙")
        rules.grid(row=1, column=0, sticky="ew", padx=10, pady=6)
        for col in (1, 3):
            rules.columnconfigure(col, weight=1)

        self.find_var = tk.StringVar()
        self.replace_var = tk.StringVar()
        self.prefix_var = tk.StringVar()
        self.suffix_var = tk.StringVar()
        self.pattern_var = tk.StringVar(value="{name}_{n}")
        self.start_var = tk.StringVar(value="1")
        self.step_var = tk.StringVar(value="1")
        self.digits_var = tk.StringVar(value="2")
        self.case_var = tk.StringVar(value="그대로")
        self.number_var = tk.BooleanVar(value=False)
        self.autonum_var = tk.BooleanVar(value=True)

        ttk.Label(rules, text="찾기").grid(row=0, column=0, sticky="w", padx=6, pady=4)
        ttk.Entry(rules, textvariable=self.find_var).grid(row=0, column=1, sticky="ew", padx=6)
        ttk.Label(rules, text="바꾸기").grid(row=0, column=2, sticky="w", padx=6)
        ttk.Entry(rules, textvariable=self.replace_var).grid(row=0, column=3, sticky="ew", padx=6)

        ttk.Label(rules, text="접두어").grid(row=1, column=0, sticky="w", padx=6, pady=4)
        ttk.Entry(rules, textvariable=self.prefix_var).grid(row=1, column=1, sticky="ew", padx=6)
        ttk.Label(rules, text="접미어").grid(row=1, column=2, sticky="w", padx=6)
        ttk.Entry(rules, textvariable=self.suffix_var).grid(row=1, column=3, sticky="ew", padx=6)

        ttk.Label(rules, text="이름 형식").grid(row=2, column=0, sticky="w", padx=6, pady=4)
        ttk.Entry(rules, textvariable=self.pattern_var).grid(row=2, column=1, sticky="ew", padx=6)
        ttk.Checkbutton(rules, text="번호 매기기 ({name}, {n})", variable=self.number_var).grid(row=2, column=2, columnspan=2, sticky="w", padx=6)

        ttk.Label(rules, text="시작 / 증가 / 자릿수").grid(row=3, column=0, sticky="w", padx=6, pady=4)
        nums = ttk.Frame(rules)
        nums.grid(row=3, column=1, columnspan=3, sticky="w", padx=6)
        ttk.Entry(nums, textvariable=self.start_var, width=6).pack(side="left")
        ttk.Entry(nums, textvariable=self.step_var, width=6).pack(side="left", padx=6)
        ttk.Entry(nums, textvariable=self.digits_var, width=6).pack(side="left")

        ttk.Label(rules, text="대소문자").grid(row=4, column=0, sticky="w", padx=6, pady=4)
        ttk.Combobox(rules, textvariable=self.case_var, values=["그대로", "소문자", "대문자"], state="readonly", width=10).grid(row=4, column=1, sticky="w", padx=6)
        ttk.Checkbutton(rules, text="충돌 시 자동 번호 추가", variable=self.autonum_var).grid(row=4, column=2, columnspan=2, sticky="w", padx=6)

        preview = ttk.LabelFrame(self, text="미리보기")
        preview.grid(row=2, column=0, sticky="nsew", padx=10, pady=6)
        preview.columnconfigure(0, weight=1)
        preview.rowconfigure(0, weight=1)

        self.tree = ttk.Treeview(preview, columns=("old", "new", "status"), show="headings", height=14)
        self.tree.heading("old", text="현재 이름")
        self.tree.heading("new", text="새 이름")
        self.tree.heading("status", text="상태")
        self.tree.column("old", width=300)
        self.tree.column("new", width=300)
        self.tree.column("status", width=110, anchor="center")
        self.tree.grid(row=0, column=0, sticky="nsew", padx=(6, 0), pady=6)
        bar = ttk.Scrollbar(preview, orient="vertical", command=self.tree.yview)
        bar.grid(row=0, column=1, sticky="ns", pady=6)
        self.tree.configure(yscrollcommand=bar.set)

        actions = ttk.Frame(self)
        actions.grid(row=3, column=0, sticky="ew", padx=10, pady=(0, 4))
        actions.columnconfigure(0, weight=1)
        self.status = ttk.Label(actions, text="폴더를 선택하고 미리보기를 누르세요.")
        self.status.grid(row=0, column=0, sticky="w")
        ttk.Button(actions, text="미리보기", command=self.preview).grid(row=0, column=1, padx=6)
        ttk.Button(actions, text="실행", command=self.apply).grid(row=0, column=2)
        ttk.Button(actions, text="닫기", command=self.destroy).grid(row=0, column=3, padx=(6, 0))

    def choose_folder(self):
        path = filedialog.askdirectory()
        if path:
            self.folder_var.set(path)

    def _collect_files(self, folder):
        exts = [e.strip().lower() for e in self.ext_var.get().split(",") if e.strip()]
        paths = []
        if self.recursive_var.get():
            for root, _dirs, names in os.walk(folder):
                paths.extend(os.path.join(root, n) for n in names)
        else:
            paths = [os.path.join(folder, n) for n in os.listdir(folder) if os.path.isfile(os.path.join(folder, n))]
        if exts:
            paths = [p for p in paths if any(p.lower().endswith(e) for e in exts)]
        return sorted(paths, key=lambda p: p.lower())

    def _unique_name(self, path, taken):
        directory, name = os.path.split(path)
        stem, ext = os.path.splitext(name)
        index = 1
        while True:
            candidate = os.path.join(directory, f"{stem}_{index}{ext}")
            key = os.path.normcase(os.path.abspath(candidate))
            if key not in taken and not os.path.exists(candidate):
                return candidate
            index += 1

    def _build_plan(self):
        folder = self.folder_var.get().strip()
        if not os.path.isdir(folder):
            raise ValueError("유효한 폴더를 선택하세요.")
        paths = self._collect_files(folder)
        if not paths:
            raise ValueError("조건에 맞는 파일이 없습니다.")

        try:
            start = int(self.start_var.get())
            step = int(self.step_var.get())
            digits = max(0, int(self.digits_var.get()))
        except ValueError:
            raise ValueError("시작/증가/자릿수는 숫자여야 합니다.")

        find = self.find_var.get()
        replace = self.replace_var.get()
        prefix = self.prefix_var.get()
        suffix = self.suffix_var.get()
        pattern = self.pattern_var.get() or "{name}_{n}"
        case = self.case_var.get()
        numbering = self.number_var.get()

        raw = []
        for index, path in enumerate(paths):
            directory, name = os.path.split(path)
            stem, ext = os.path.splitext(name)
            base = stem
            if find:
                base = base.replace(find, replace)
            if case == "소문자":
                base = base.lower()
            elif case == "대문자":
                base = base.upper()
            if numbering:
                number = str(start + index * step).zfill(digits)
                base = pattern.replace("{name}", base).replace("{n}", number)
            base = f"{prefix}{base}{suffix}"
            raw.append((path, os.path.join(directory, f"{base}{ext}")))

        old_keys = {os.path.normcase(os.path.abspath(o)) for o, _ in raw}
        taken = set(old_keys)
        plan = []
        auto = self.autonum_var.get()
        for old, new in raw:
            old_key = os.path.normcase(os.path.abspath(old))
            new_key = os.path.normcase(os.path.abspath(new))
            if old_key == new_key and old == new:
                plan.append((old, new, "변경 없음"))
                continue
            conflict = new_key in taken or (os.path.exists(new) and new_key not in old_keys)
            status = "OK"
            if conflict:
                if auto:
                    new = self._unique_name(new, taken)
                    new_key = os.path.normcase(os.path.abspath(new))
                    status = "자동번호"
                else:
                    status = "충돌"
            if status in ("OK", "자동번호"):
                taken.add(new_key)
            plan.append((old, new, status))
        return plan

    def preview(self):
        try:
            self._plan = self._build_plan()
        except Exception as error:
            messagebox.showerror("오류", str(error))
            return
        self.tree.delete(*self.tree.get_children())
        for old, new, status in self._plan:
            self.tree.insert("", "end", values=(os.path.basename(old), os.path.basename(new), status))
        changeable = sum(1 for _, _, status in self._plan if status in ("OK", "자동번호"))
        conflicts = sum(1 for _, _, status in self._plan if status == "충돌")
        self.status.config(text=f"총 {len(self._plan)}개 · 변경 예정 {changeable}개 · 충돌 {conflicts}개")

    def apply(self):
        try:
            self._plan = self._build_plan()
        except Exception as error:
            messagebox.showerror("오류", str(error))
            return
        todo = [(old, new) for old, new, status in self._plan if status in ("OK", "자동번호")]
        if not todo:
            messagebox.showinfo("알림", "변경할 파일이 없습니다.")
            return
        if not messagebox.askyesno("확인", f"{len(todo)}개 파일의 이름을 변경할까요?"):
            return
        moved = []
        try:
            for old, new in todo:
                temp = f"{old}.__renaming_{uuid.uuid4().hex}__"
                os.rename(old, temp)
                moved.append((temp, new))
            for temp, new in moved:
                os.rename(temp, new)
        except Exception as error:
            messagebox.showerror("오류", f"이름 변경 중 문제가 발생했습니다.\n{error}")
            self.status.config(text="이름 변경 중 오류가 발생했습니다.")
            return
        self.status.config(text=f"{len(todo)}개 파일의 이름을 변경했습니다.")
        self.preview()


if __name__ == "__main__":
    enable_dpi_awareness()
    RenamerApp().mainloop()
