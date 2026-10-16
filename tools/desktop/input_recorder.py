import os
import sys
import json
import time
import threading
import tkinter as tk
from tkinter import ttk, filedialog, messagebox

try:
    from pynput import mouse, keyboard
except ImportError:
    mouse = None
    keyboard = None

MOVE_INTERVAL = 0.03
MOVE_DISTANCE = 4


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


def key_to_string(key):
    if isinstance(key, keyboard.Key):
        return "key:" + key.name
    char = getattr(key, "char", None)
    if char:
        return "char:" + char
    vk = getattr(key, "vk", None)
    if vk is not None:
        return f"vk:{vk}"
    return None


def string_to_key(text):
    kind, _, value = text.partition(":")
    if kind == "key":
        return getattr(keyboard.Key, value)
    if kind == "char":
        return keyboard.KeyCode.from_char(value)
    return keyboard.KeyCode.from_vk(int(value))


class InputRecorder(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("키보드 · 마우스 녹화 / 재생")
        self.minsize(720, 600)
        center(self, 840, 660)
        self.events = []
        self.recording = False
        self.playing = False
        self._start_time = 0.0
        self._last_move = (0.0, (0, 0))
        self._mouse_listener = None
        self._key_listener = None
        self._stop_playback = threading.Event()
        self._build_ui()
        if mouse is None or keyboard is None:
            self.after(200, lambda: messagebox.showerror(
                "pynput 필요", "녹화/재생 기능을 사용하려면 pynput이 필요합니다.\npip install pynput"))

    def _build_ui(self):
        self.columnconfigure(0, weight=1)
        self.rowconfigure(2, weight=1)

        info = ttk.LabelFrame(self, text="녹화")
        info.grid(row=0, column=0, sticky="ew", padx=10, pady=(10, 6))
        info.columnconfigure(0, weight=1)
        ttk.Label(info, text="녹화 시작 후 3초 뒤부터 마우스와 키보드 동작이 기록됩니다. 녹화 중지는 F9 키입니다.").grid(row=0, column=0, columnspan=4, sticky="w", padx=6, pady=6)
        self.record_button = ttk.Button(info, text="녹화 시작", command=self.start_recording)
        self.record_button.grid(row=1, column=0, sticky="w", padx=6, pady=(0, 6))
        ttk.Button(info, text="지우기", command=self.clear_events).grid(row=1, column=1, sticky="w", padx=6, pady=(0, 6))
        ttk.Button(info, text="매크로 저장", command=self.save_macro).grid(row=1, column=2, sticky="w", padx=6)
        ttk.Button(info, text="매크로 불러오기", command=self.load_macro).grid(row=1, column=3, sticky="w", padx=6)

        playback = ttk.LabelFrame(self, text="재생")
        playback.grid(row=1, column=0, sticky="ew", padx=10, pady=6)
        ttk.Label(playback, text="속도(x)").grid(row=0, column=0, sticky="w", padx=6, pady=6)
        self.speed_var = tk.StringVar(value="1.0")
        ttk.Entry(playback, textvariable=self.speed_var, width=8).grid(row=0, column=1, sticky="w", padx=6)
        ttk.Label(playback, text="반복(0=무한)").grid(row=0, column=2, sticky="w", padx=6)
        self.repeat_var = tk.StringVar(value="1")
        ttk.Entry(playback, textvariable=self.repeat_var, width=8).grid(row=0, column=3, sticky="w", padx=6)
        ttk.Label(playback, text="재생 중지: 화면의 '중지' 버튼 또는 ESC").grid(row=0, column=4, sticky="w", padx=12)
        self.play_button = ttk.Button(playback, text="재생 시작", command=self.start_playback)
        self.play_button.grid(row=1, column=0, sticky="w", padx=6, pady=(0, 6))

        log = ttk.LabelFrame(self, text="기록")
        log.grid(row=2, column=0, sticky="nsew", padx=10, pady=6)
        log.columnconfigure(0, weight=1)
        log.rowconfigure(0, weight=1)
        self.text = tk.Text(log, height=16, wrap="none")
        self.text.grid(row=0, column=0, sticky="nsew", padx=(6, 0), pady=6)
        bar = ttk.Scrollbar(log, orient="vertical", command=self.text.yview)
        bar.grid(row=0, column=1, sticky="ns", pady=6)
        self.text.configure(yscrollcommand=bar.set)

        status = ttk.Frame(self)
        status.grid(row=3, column=0, sticky="ew", padx=10, pady=(0, 8))
        status.columnconfigure(0, weight=1)
        self.status = ttk.Label(status, text="녹화 시작을 누르고 대상 화면에서 동작하세요.")
        self.status.grid(row=0, column=0, sticky="w")

    def _log(self, message):
        self.text.insert("end", message + "\n")
        self.text.see("end")

    def clear_events(self):
        if self.recording or self.playing:
            return
        self.events = []
        self.text.delete("1.0", "end")
        self.status.config(text="기록을 비웠습니다.")

    def start_recording(self):
        if mouse is None or keyboard is None:
            messagebox.showerror("pynput 필요", "pip install pynput 후 다시 실행하세요.")
            return
        if self.recording or self.playing:
            return
        self.events = []
        self.text.delete("1.0", "end")
        self.record_button.config(state="disabled")
        self._countdown(3)

    def _countdown(self, remaining):
        if remaining > 0:
            self.status.config(text=f"{remaining}초 후 녹화를 시작합니다...")
            self.after(1000, self._countdown, remaining - 1)
        else:
            self._begin_recording()

    def _begin_recording(self):
        self.recording = True
        self._start_time = time.perf_counter()
        self._last_move = (0.0, (0, 0))
        self.record_button.config(text="녹화 중 (F9 종료)", state="normal", command=self.stop_recording)
        self.status.config(text="녹화 중...  마우스/키보드를 동작하세요. 종료는 F9.")
        self._mouse_listener = mouse.Listener(on_move=self._on_move, on_click=self._on_click, on_scroll=self._on_scroll)
        self._key_listener = keyboard.Listener(on_press=self._on_press, on_release=self._on_release)
        self._mouse_listener.start()
        self._key_listener.start()

    def stop_recording(self):
        if not self.recording:
            return
        self.recording = False
        for listener in (self._mouse_listener, self._key_listener):
            if listener is not None:
                listener.stop()
        self._mouse_listener = None
        self._key_listener = None
        self.record_button.config(text="녹화 시작", command=self.start_recording)
        self.status.config(text=f"녹화를 마쳤습니다. 이벤트 {len(self.events)}개")
        self._log(f"--- 녹화 종료 · {len(self.events)}개 이벤트 ---")

    def _now(self):
        return time.perf_counter() - self._start_time

    def _on_move(self, x, y):
        if not self.recording:
            return
        now, (last_t, last_pos) = self._last_move
        timestamp = self._now()
        if timestamp - last_t < MOVE_INTERVAL:
            return
        if abs(x - last_pos[0]) + abs(y - last_pos[1]) < MOVE_DISTANCE:
            return
        self._last_move = (timestamp, (x, y))
        self.events.append({"t": round(timestamp, 3), "type": "move", "x": int(x), "y": int(y)})

    def _on_click(self, x, y, button, pressed):
        if not self.recording:
            return
        self.events.append({
            "t": round(self._now(), 3),
            "type": "mousedown" if pressed else "mouseup",
            "x": int(x), "y": int(y), "button": button.name
        })

    def _on_scroll(self, x, y, dx, dy):
        if not self.recording:
            return
        self.events.append({
            "t": round(self._now(), 3),
            "type": "scroll", "x": int(x), "y": int(y), "dx": int(dx), "dy": int(dy)
        })

    def _on_press(self, key):
        if key == keyboard.Key.f9:
            self.stop_recording()
            return False
        if self.recording:
            text = key_to_string(key)
            if text:
                self.events.append({"t": round(self._now(), 3), "type": "keydown", "key": text})
        return True

    def _on_release(self, key):
        if self.recording:
            text = key_to_string(key)
            if text:
                self.events.append({"t": round(self._now(), 3), "type": "keyup", "key": text})

    def save_macro(self):
        if not self.events:
            messagebox.showinfo("알림", "저장할 기록이 없습니다.")
            return
        path = filedialog.asksaveasfilename(defaultextension=".json",
                                            filetypes=[("매크로 파일", "*.json")], initialfile="macro.json")
        if not path:
            return
        with open(path, "w", encoding="utf-8") as handle:
            json.dump(self.events, handle, ensure_ascii=False, indent=2)
        self.status.config(text=f"매크로를 저장했습니다: {os.path.basename(path)}")

    def load_macro(self):
        if self.recording or self.playing:
            return
        path = filedialog.askopenfilename(filetypes=[("매크로 파일", "*.json")])
        if not path:
            return
        with open(path, "r", encoding="utf-8") as handle:
            self.events = json.load(handle)
        self.text.delete("1.0", "end")
        for index, event in enumerate(self.events, start=1):
            self._log(f"{index:>4}. {event['type']:<9} {event['t']:>8}s")
        self.status.config(text=f"매크로를 불러왔습니다: {os.path.basename(path)} · {len(self.events)}개 이벤트")

    def start_playback(self):
        if mouse is None or keyboard is None:
            messagebox.showerror("pynput 필요", "pip install pynput 후 다시 실행하세요.")
            return
        if self.recording or self.playing or not self.events:
            if not self.events:
                messagebox.showinfo("알림", "재생할 기록이 없습니다.")
            return
        try:
            speed = float(self.speed_var.get())
            repeat = int(self.repeat_var.get())
        except ValueError:
            messagebox.showerror("오류", "속도와 반복 값은 숫자여야 합니다.")
            return
        if speed <= 0:
            messagebox.showerror("오류", "속도는 0보다 커야 합니다.")
            return
        self.playing = True
        self._stop_playback.clear()
        self.play_button.config(text="중지", command=self.stop_playback)
        self.status.config(text="2초 뒤 재생을 시작합니다. (ESC 또는 중지 버튼으로 종료)")
        threading.Thread(target=self._play_worker, args=(list(self.events), speed, repeat), daemon=True).start()

    def stop_playback(self):
        self._stop_playback.set()

    def _play_worker(self, events, speed, repeat):
        controller_mouse = mouse.Controller()
        controller_key = keyboard.Controller()
        time.sleep(2.0)
        count = 0
        try:
            while not self._stop_playback.is_set():
                previous = 0.0
                for event in events:
                    if self._stop_playback.is_set():
                        break
                    target = event["t"] / speed
                    wait = target - previous
                    if wait > 0:
                        end = time.perf_counter() + wait
                        while time.perf_counter() < end:
                            if self._stop_playback.is_set():
                                break
                            time.sleep(min(0.02, max(0.0, end - time.perf_counter())))
                        previous = target
                    if self._stop_playback.is_set():
                        break
                    self._perform(controller_mouse, controller_key, event)
                count += 1
                if repeat and count >= repeat:
                    break
                time.sleep(0.3)
        finally:
            self.after(0, self._finish_playback, count)

    def _perform(self, controller_mouse, controller_key, event):
        kind = event["type"]
        if kind == "move":
            controller_mouse.position = (event["x"], event["y"])
        elif kind in ("mousedown", "mouseup"):
            controller_mouse.position = (event["x"], event["y"])
            button = mouse.Button[event["button"]]
            if kind == "mousedown":
                controller_mouse.press(button)
            else:
                controller_mouse.release(button)
        elif kind == "scroll":
            controller_mouse.position = (event["x"], event["y"])
            controller_mouse.scroll(event["dx"], event["dy"])
        elif kind == "keydown":
            controller_key.press(string_to_key(event["key"]))
        elif kind == "keyup":
            controller_key.release(string_to_key(event["key"]))

    def _finish_playback(self, count):
        self.playing = False
        self.play_button.config(text="재생 시작", command=self.start_playback)
        self.status.config(text=f"재생을 마쳤습니다. ({count}회 실행)")

    def destroy(self):
        self.recording = False
        self._stop_playback.set()
        for listener in (self._mouse_listener, self._key_listener):
            if listener is not None:
                listener.stop()
        super().destroy()


if __name__ == "__main__":
    enable_dpi_awareness()
    InputRecorder().mainloop()
