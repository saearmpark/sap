"""
codestudio 게시판 API 서버 (Flask + SQLite)

실행 방법:
  pip install -r requirements.txt
  python app.py

서버는 http://127.0.0.1:5000 에서 실행됩니다.
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import sqlite3
import os
from datetime import datetime

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "board.db")
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_CONTENT_LENGTH = 20 * 1024 * 1024  # 업로드 용량 제한 20MB

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH
CORS(app)  # 프론트엔드(Live Server 등 다른 포트)에서 요청 허용


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS posts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS files (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            original_name TEXT NOT NULL,
            stored_name TEXT NOT NULL UNIQUE,
            size_bytes INTEGER NOT NULL,
            uploaded_at TEXT NOT NULL
        )
        """
    )
    conn.commit()
    conn.close()


@app.route("/api/posts", methods=["GET"])
def list_posts():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, title, content, created_at FROM posts ORDER BY id DESC"
    ).fetchall()
    conn.close()
    return jsonify([dict(row) for row in rows])


@app.route("/api/posts/<int:post_id>", methods=["GET"])
def get_post(post_id):
    conn = get_db()
    row = conn.execute(
        "SELECT id, title, content, created_at FROM posts WHERE id = ?", (post_id,)
    ).fetchone()
    conn.close()
    if row is None:
        return jsonify({"error": "게시글을 찾을 수 없습니다."}), 404
    return jsonify(dict(row))


@app.route("/api/posts", methods=["POST"])
def create_post():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    content = (data.get("content") or "").strip()

    if not title or not content:
        return jsonify({"error": "제목과 내용을 모두 입력하세요."}), 400

    conn = get_db()
    cursor = conn.execute(
        "INSERT INTO posts (title, content, created_at) VALUES (?, ?, ?)",
        (title, content, datetime.now().strftime("%Y-%m-%d %H:%M")),
    )
    conn.commit()
    new_id = cursor.lastrowid
    conn.close()
    return jsonify({"id": new_id, "message": "게시글이 등록되었습니다."}), 201


@app.route("/api/posts/<int:post_id>", methods=["DELETE"])
def delete_post(post_id):
    conn = get_db()
    conn.execute("DELETE FROM posts WHERE id = ?", (post_id,))
    conn.commit()
    conn.close()
    return jsonify({"message": "삭제되었습니다."})


def format_size(num_bytes):
    for unit in ["B", "KB", "MB", "GB"]:
        if num_bytes < 1024:
            return f"{num_bytes:.0f}{unit}" if unit == "B" else f"{num_bytes:.1f}{unit}"
        num_bytes /= 1024
    return f"{num_bytes:.1f}TB"


@app.route("/api/files", methods=["GET"])
def list_files():
    conn = get_db()
    rows = conn.execute(
        "SELECT id, original_name, stored_name, size_bytes, uploaded_at FROM files ORDER BY id DESC"
    ).fetchall()
    conn.close()
    result = []
    for row in rows:
        item = dict(row)
        item["size_display"] = format_size(item["size_bytes"])
        result.append(item)
    return jsonify(result)


@app.route("/api/files", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"error": "업로드할 파일을 선택하세요."}), 400

    uploaded = request.files["file"]
    if uploaded.filename == "":
        return jsonify({"error": "업로드할 파일을 선택하세요."}), 400

    original_name = uploaded.filename
    safe_name = secure_filename(original_name) or "file"

    # 같은 이름 파일이 이미 있으면 타임스탬프를 붙여 겹치지 않게 저장
    stored_name = safe_name
    save_path = os.path.join(UPLOAD_DIR, stored_name)
    if os.path.exists(save_path):
        stamp = datetime.now().strftime("%Y%m%d%H%M%S")
        name, ext = os.path.splitext(safe_name)
        stored_name = f"{name}_{stamp}{ext}"
        save_path = os.path.join(UPLOAD_DIR, stored_name)

    uploaded.save(save_path)
    size_bytes = os.path.getsize(save_path)

    conn = get_db()
    conn.execute(
        "INSERT INTO files (original_name, stored_name, size_bytes, uploaded_at) VALUES (?, ?, ?, ?)",
        (original_name, stored_name, size_bytes, datetime.now().strftime("%Y-%m-%d %H:%M")),
    )
    conn.commit()
    conn.close()
    return jsonify({"message": "업로드되었습니다.", "stored_name": stored_name}), 201


@app.route("/api/files/<path:stored_name>", methods=["GET"])
def download_file(stored_name):
    conn = get_db()
    row = conn.execute(
        "SELECT original_name FROM files WHERE stored_name = ?", (stored_name,)
    ).fetchone()
    conn.close()
    if row is None:
        return jsonify({"error": "파일을 찾을 수 없습니다."}), 404
    return send_from_directory(UPLOAD_DIR, stored_name, as_attachment=True, download_name=row["original_name"])


@app.route("/api/files/<path:stored_name>", methods=["DELETE"])
def delete_file(stored_name):
    conn = get_db()
    conn.execute("DELETE FROM files WHERE stored_name = ?", (stored_name,))
    conn.commit()
    conn.close()

    file_path = os.path.join(UPLOAD_DIR, stored_name)
    if os.path.exists(file_path):
        os.remove(file_path)

    return jsonify({"message": "삭제되었습니다."})


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
