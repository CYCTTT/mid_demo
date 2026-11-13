from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from backend.db import get_db_connection

app = FastAPI(
    title="投稿審查系統",
    description="作者投稿與編輯審查 API",
    version="1.0.0"
)
# 設定靜態檔案資料夾
app.mount(
    "/static",
    StaticFiles(directory="static"),
    name="static"
)

# 設定 HTML 模板資料夾
templates = Jinja2Templates(directory="templates")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# 資料格式
# ==============================

class SubmissionCreate(BaseModel):
    author: str
    category: str
    title: str
    content: str


class SubmissionUpdate(BaseModel):
    category: str
    title: str
    content: str


# ==============================
# 首頁與資料庫測試
# ==============================

@app.get("/")
def home(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="index.html",
        context={}
    )

@app.get("/author")
def author_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="author.html",
        context={}
    )


@app.get("/editor")
def editor_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="editor.html",
        context={}
    )

@app.get("/db-test")
def db_test():
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("SELECT current_database();")
        result = cur.fetchone()

        return {
            "message": "資料庫連線成功！",
            "database": result[0]
        }

    except Exception as e:
        return {
            "message": "資料庫連線失敗！",
            "error": str(e)
        }

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


# ==============================
# 作者：查看自己的投稿
# ==============================

@app.get("/api/submissions")
def get_submissions(author: str):

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                SELECT id, author, category, title, content,
                       status, created_at, updated_at
                FROM submissions
                WHERE author = %s
                ORDER BY created_at DESC
                """,
                (author,)
            )

            return cur.fetchall()

    finally:
        conn.close()


# ==============================
# 作者：新增投稿
# ==============================

@app.post("/api/submissions")
def create_submission(data: SubmissionCreate):

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                INSERT INTO submissions
                (author, category, title, content)
                VALUES (%s, %s, %s, %s)
                RETURNING *
                """,
                (
                    data.author,
                    data.category,
                    data.title,
                    data.content
                )
            )

            result = cur.fetchone()
            conn.commit()

            return dict(result)

    finally:
        conn.close()


# ==============================
# 作者：查看單篇投稿
# ==============================

@app.get("/api/submissions/{submission_id}")
def get_submission(submission_id: int, author: str):

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                SELECT *
                FROM submissions
                WHERE id = %s AND author = %s
                """,
                (submission_id, author)
            )

            result = cur.fetchone()

            if not result:
                raise HTTPException(
                    status_code=404,
                    detail="找不到這篇投稿"
                )

            return dict(result)

    finally:
        conn.close()


# ==============================
# 作者：修改投稿
# 只能修改編輯中的文章
# ==============================

@app.put("/api/submissions/{submission_id}")
def update_submission(
    submission_id: int,
    author: str,
    data: SubmissionUpdate
):

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                UPDATE submissions
                SET category = %s,
                    title = %s,
                    content = %s,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND author = %s
                  AND status = 'editing'
                RETURNING *
                """,
                (
                    data.category,
                    data.title,
                    data.content,
                    submission_id,
                    author
                )
            )

            result = cur.fetchone()

            if not result:
                raise HTTPException(
                    status_code=400,
                    detail="投稿不存在或目前不能修改"
                )

            conn.commit()

            return dict(result)

    finally:
        conn.close()


# ==============================
# 作者：刪除投稿
# 只能刪除編輯中的文章
# ==============================

@app.delete("/api/submissions/{submission_id}")
def delete_submission(submission_id: int, author: str):

    conn = get_db_connection()

    try:
        with conn.cursor() as cur:

            cur.execute(
                """
                DELETE FROM submissions
                WHERE id = %s
                  AND author = %s
                  AND status = 'editing'
                """,
                (submission_id, author)
            )

            if cur.rowcount == 0:
                raise HTTPException(
                    status_code=400,
                    detail="投稿不存在或目前不能刪除"
                )

            conn.commit()

            return {
                "message": "投稿刪除成功"
            }

    finally:
        conn.close()


# ==============================
# 作者：送出審查
# 編輯中 -> 審查中
# ==============================

@app.post("/api/submissions/{submission_id}/submit")
def submit_submission(submission_id: int, author: str):

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                UPDATE submissions
                SET status = 'reviewing',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND author = %s
                  AND status = 'editing'
                RETURNING *
                """,
                (submission_id, author)
            )

            result = cur.fetchone()

            if not result:
                raise HTTPException(
                    status_code=400,
                    detail="投稿不存在或目前不能送審"
                )

            conn.commit()

            return {
                "message": "投稿送審成功",
                "submission": dict(result)
            }

    finally:
        conn.close()
# ==============================
# 編輯：查看待審查清單
# ==============================

@app.get("/api/editor/submissions")
def get_pending_submissions():

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                SELECT id, author, category, title,
                       status, created_at
                FROM submissions
                WHERE status = 'reviewing'
                ORDER BY created_at ASC
                """
            )

            return cur.fetchall()

    finally:
        conn.close()


# ==============================
# 編輯：查看投稿內容
# ==============================

@app.get("/api/editor/submissions/{submission_id}")
def get_editor_submission(submission_id: int):

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                SELECT *
                FROM submissions
                WHERE id = %s
                  AND status = 'reviewing'
                """,
                (submission_id,)
            )

            result = cur.fetchone()

            if not result:
                raise HTTPException(
                    status_code=404,
                    detail="找不到待審查的投稿"
                )

            return dict(result)

    finally:
        conn.close()


# ==============================
# 編輯：通過投稿
# 審查中 -> 已通過
# ==============================

@app.post("/api/editor/submissions/{submission_id}/approve")
def approve_submission(submission_id: int):

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                UPDATE submissions
                SET status = 'approved',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND status = 'reviewing'
                RETURNING *
                """,
                (submission_id,)
            )

            result = cur.fetchone()

            if not result:
                raise HTTPException(
                    status_code=400,
                    detail="投稿不存在或目前不能通過"
                )

            conn.commit()

            return {
                "message": "投稿審查通過",
                "submission": dict(result)
            }

    finally:
        conn.close()


# ==============================
# 編輯：退回投稿
# 審查中 -> 編輯中
# ==============================

@app.post("/api/editor/submissions/{submission_id}/return")
def return_submission(submission_id: int):

    conn = get_db_connection()

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                UPDATE submissions
                SET status = 'editing',
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = %s
                  AND status = 'reviewing'
                RETURNING *
                """,
                (submission_id,)
            )

            result = cur.fetchone()

            if not result:
                raise HTTPException(
                    status_code=400,
                    detail="投稿不存在或目前不能退回"
                )

            conn.commit()

            return {
                "message": "投稿已退回作者修改",
                "submission": dict(result)
            }

    finally:
        conn.close()