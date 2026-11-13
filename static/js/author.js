
const API_BASE = "http://127.0.0.1:8000";

// HTML 元素
const authorNameInput = document.getElementById("authorName");
const submissionForm = document.getElementById("submissionForm");
const submissionList = document.getElementById("submissionList");
const refreshButton = document.getElementById("refreshButton");

// 記錄目前正在編輯的投稿 ID
let editingSubmissionId = null;

// 狀態文字
function getStatusText(status) {
    const statusMap = {
        editing: "編輯中",
        reviewing: "審查中",
        approved: "已通過"
    };

    return statusMap[status] || status;
}

// ==============================
// 讀取投稿清單
// ==============================
async function loadSubmissions() {
    const author = authorNameInput.value.trim();

    if (!author) {
        submissionList.textContent = "請先輸入作者名稱。";
        return;
    }

    submissionList.textContent = "正在載入投稿資料...";

    try {
        const params = new URLSearchParams({ author });

        const response = await fetch(
            `${API_BASE}/api/submissions?${params}`
        );

        if (!response.ok) {
            throw new Error("無法取得投稿資料");
        }

        const submissions = await response.json();

        if (submissions.length === 0) {
            submissionList.textContent = "目前沒有任何投稿。";
            return;
        }

        const table = document.createElement("table");

        table.innerHTML = `
            <thead>
                <tr>
                    <th>文章分類</th>
                    <th>文章標題</th>
                    <th>審查狀態</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector("tbody");

        submissions.forEach(submission => {
            const row = document.createElement("tr");

            const categoryCell = document.createElement("td");
            categoryCell.textContent = submission.category;

            const titleCell = document.createElement("td");
            titleCell.textContent = submission.title;

            const statusCell = document.createElement("td");
            statusCell.textContent = getStatusText(submission.status);

            const actionCell = document.createElement("td");

            if (submission.status === "editing") {

                // 編輯按鈕
                const editButton = document.createElement("button");
                editButton.textContent = "編輯";
                editButton.className = "action-button edit-button";

                editButton.addEventListener("click", () => {
                    editSubmission(submission);
                });

                // 刪除按鈕
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "刪除";
                deleteButton.className = "action-button delete-button";

                deleteButton.addEventListener("click", () => {
                    deleteSubmission(submission.id);
                });

                // 送審按鈕
                const submitButton = document.createElement("button");
                submitButton.textContent = "送審";
                submitButton.className = "action-button submit-button";

                submitButton.addEventListener("click", () => {
                    submitSubmission(submission.id);
                });

                actionCell.append(
                    editButton,
                    deleteButton,
                    submitButton
                );

            } else {
                actionCell.textContent = "無可用操作";
            }

            row.append(
                categoryCell,
                titleCell,
                statusCell,
                actionCell
            );

            tbody.appendChild(row);
        });

        submissionList.replaceChildren(table);

    } catch (error) {
        console.error(error);
        submissionList.textContent = "讀取投稿資料失敗。";
    }
}

// ==============================
// 新增投稿
// ==============================
submissionForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const author = authorNameInput.value.trim();
    const category = document.getElementById("category").value.trim();
    const title = document.getElementById("title").value.trim();
    const content = document.getElementById("content").value.trim();

    if (!author) {
        alert("請輸入作者名稱！");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/api/submissions`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                author,
                category,
                title,
                content
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "新增投稿失敗");
        }

        alert("投稿新增成功！");
        submissionForm.reset();

        await loadSubmissions();

    } catch (error) {
        alert("新增失敗：" + error.message);
    }
});

// ==============================
// 編輯投稿：顯示網頁內的編輯表單
// ==============================
function editSubmission(submission) {

    editingSubmissionId = submission.id;

    document.getElementById("editCategory").value =
        submission.category;

    document.getElementById("editTitle").value =
        submission.title;

    document.getElementById("editContent").value =
        submission.content;

    const editPanel = document.getElementById("editPanel");

    editPanel.style.display = "block";

    editPanel.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}

// ==============================
// 儲存修改
// ==============================
document.getElementById("editForm").addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        if (editingSubmissionId === null) {
            alert("目前沒有選擇要編輯的投稿！");
            return;
        }

        const author = authorNameInput.value.trim();

        const category =
            document.getElementById("editCategory").value.trim();

        const title =
            document.getElementById("editTitle").value.trim();

        const content =
            document.getElementById("editContent").value.trim();

        if (!category || !title || !content) {
            alert("請完整填寫所有欄位！");
            return;
        }

        const params = new URLSearchParams({ author });

        try {
            const response = await fetch(
                `${API_BASE}/api/submissions/${editingSubmissionId}?${params}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        category,
                        title,
                        content
                    })
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || "修改失敗");
            }

            alert("投稿修改成功！");

            closeEditPanel();

            await loadSubmissions();

        } catch (error) {
            alert("修改失敗：" + error.message);
        }
    }
);

// ==============================
// 取消編輯
// ==============================
document.getElementById("cancelEditButton").addEventListener(
    "click",
    closeEditPanel
);

// 關閉編輯區域
function closeEditPanel() {

    document.getElementById("editPanel").style.display = "none";

    document.getElementById("editForm").reset();

    editingSubmissionId = null;
}

// ==============================
// 刪除投稿
// ==============================
async function deleteSubmission(id) {

    if (!confirm("確定要刪除這篇投稿嗎？")) {
        return;
    }

    const author = authorNameInput.value.trim();
    const params = new URLSearchParams({ author });

    try {
        const response = await fetch(
            `${API_BASE}/api/submissions/${id}?${params}`,
            { method: "DELETE" }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "刪除失敗");
        }

        alert("投稿刪除成功！");

        await loadSubmissions();

    } catch (error) {
        alert("刪除失敗：" + error.message);
    }
}

// ==============================
// 送出審查
// ==============================
async function submitSubmission(id) {

    if (!confirm("確定要將這篇投稿送交編輯審查嗎？")) {
        return;
    }

    const author = authorNameInput.value.trim();
    const params = new URLSearchParams({ author });

    try {
        const response = await fetch(
            `${API_BASE}/api/submissions/${id}/submit?${params}`,
            { method: "POST" }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "送審失敗");
        }

        alert("投稿送審成功！");

        await loadSubmissions();

    } catch (error) {
        alert("送審失敗：" + error.message);
    }
}

// ==============================
// 重新整理投稿清單
// ==============================
refreshButton.addEventListener("click", loadSubmissions);

// 頁面載入時，自動讀取投稿
loadSubmissions();
