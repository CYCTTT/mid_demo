
const API_BASE = "http://127.0.0.1:8000";

// 取得 HTML 元素
const pendingList = document.getElementById("pendingList");
const refreshButton = document.getElementById("refreshEditorButton");
const reviewPanel = document.getElementById("reviewPanel");

const reviewAuthor = document.getElementById("reviewAuthor");
const reviewCategory = document.getElementById("reviewCategory");
const reviewTitle = document.getElementById("reviewTitle");
const reviewContent = document.getElementById("reviewContent");

const approveButton = document.getElementById("approveButton");
const returnButton = document.getElementById("returnButton");
const closeReviewButton = document.getElementById("closeReviewButton");

// 目前選擇的投稿 ID
let currentSubmissionId = null;


// ==============================
// 讀取待審查投稿清單
// ==============================
async function loadPendingSubmissions() {

    pendingList.textContent = "正在載入待審查投稿...";

    try {
        const response = await fetch(
            `${API_BASE}/api/editor/submissions`
        );

        if (!response.ok) {
            throw new Error("無法取得待審查投稿");
        }

        const submissions = await response.json();

        if (submissions.length === 0) {
            pendingList.textContent = "目前沒有待審查的投稿。";
            return;
        }

        const table = document.createElement("table");

        table.innerHTML = `
            <thead>
                <tr>
                    <th>作者</th>
                    <th>文章分類</th>
                    <th>文章標題</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector("tbody");

        submissions.forEach(submission => {

            const row = document.createElement("tr");

            const authorCell = document.createElement("td");
            authorCell.textContent = submission.author;

            const categoryCell = document.createElement("td");
            categoryCell.textContent = submission.category;

            const titleCell = document.createElement("td");
            titleCell.textContent = submission.title;

            const actionCell = document.createElement("td");

            const viewButton = document.createElement("button");
            viewButton.textContent = "查看";
            viewButton.className = "action-button edit-button";

            viewButton.addEventListener("click", () => {
                viewSubmission(submission.id);
            });

            actionCell.appendChild(viewButton);

            row.append(
                authorCell,
                categoryCell,
                titleCell,
                actionCell
            );

            tbody.appendChild(row);
        });

        pendingList.replaceChildren(table);

    } catch (error) {
        console.error(error);
        pendingList.textContent = "讀取失敗，請確認後端是否正常運作。";
    }
}


// ==============================
// 查看投稿完整內容
// ==============================
async function viewSubmission(id) {

    try {
        const response = await fetch(
            `${API_BASE}/api/editor/submissions/${id}`
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "無法取得文章內容");
        }

        currentSubmissionId = result.id;

        reviewAuthor.textContent = result.author;
        reviewCategory.textContent = result.category;
        reviewTitle.textContent = result.title;
        reviewContent.textContent = result.content;

        reviewPanel.style.display = "block";

        reviewPanel.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });

    } catch (error) {
        alert("讀取文章失敗：" + error.message);
    }
}


// ==============================
// 通過審查
// ==============================
async function approveSubmission() {

    if (currentSubmissionId === null) {
        alert("請先選擇一篇文章！");
        return;
    }

    if (!confirm("確定要通過這篇投稿嗎？")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/api/editor/submissions/${currentSubmissionId}/approve`,
            {
                method: "POST"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "審查失敗");
        }

        alert("文章已通過審查！");

        closeReview();

        await loadPendingSubmissions();

    } catch (error) {
        alert("操作失敗：" + error.message);
    }
}


// ==============================
// 退回修改
// ==============================
async function returnSubmission() {

    if (currentSubmissionId === null) {
        alert("請先選擇一篇文章！");
        return;
    }

    if (!confirm("確定要將這篇投稿退回作者修改嗎？")) {
        return;
    }

    try {
        const response = await fetch(
            `${API_BASE}/api/editor/submissions/${currentSubmissionId}/return`,
            {
                method: "POST"
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.detail || "退回失敗");
        }

        alert("文章已退回作者修改！");

        closeReview();

        await loadPendingSubmissions();

    } catch (error) {
        alert("操作失敗：" + error.message);
    }
}


// ==============================
// 關閉文章內容
// ==============================
function closeReview() {

    reviewPanel.style.display = "none";

    currentSubmissionId = null;

    reviewAuthor.textContent = "";
    reviewCategory.textContent = "";
    reviewTitle.textContent = "";
    reviewContent.textContent = "";
}


// ==============================
// 按鈕事件
// ==============================
refreshButton.addEventListener(
    "click",
    loadPendingSubmissions
);

approveButton.addEventListener(
    "click",
    approveSubmission
);

returnButton.addEventListener(
    "click",
    returnSubmission
);

closeReviewButton.addEventListener(
    "click",
    closeReview
);


// ==============================
// 頁面載入時自動讀取
// ==============================
loadPendingSubmissions();
