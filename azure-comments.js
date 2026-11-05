// Azure DevOps pull request thread API helpers.
// Depends on nothing; pass credentials explicitly.

const ThreadStatus = { 1: 'Active', 2: 'Resolved', 3: "Won't fix", 4: 'Closed', 5: 'Pending' };
// GET returns status as a string ("active", "fixed", ...); normalise to numeric codes.
const ThreadStatusByName = { active: 1, fixed: 2, wontfix: 3, closed: 4, pending: 5, bydesign: 3 };
function normStatus(s) {
  if (typeof s === 'number') return s;
  return ThreadStatusByName[String(s || 'active').toLowerCase()] || 1;
}

function prThreadsBase(org, project, repo, prId) {
  return `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}` +
    `/_apis/git/repositories/${encodeURIComponent(repo)}/pullRequests/${encodeURIComponent(prId)}/threads`;
}

async function adoRequest(url, pat, method, body) {
  const headers = { 'Accept': 'application/json' };
  if (pat) headers['Authorization'] = 'Basic ' + btoa(':' + pat);
  if (body) headers['Content-Type'] = 'application/json';
  const resp = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  if (!resp.ok) {
    let hint = '';
    if (resp.status === 401 || resp.status === 203) hint = ' — check your PAT in the extension popup.';
    else if (resp.status === 403) hint = ' — your PAT needs "Code (Read & Write)" scope to comment.';
    throw new Error(`HTTP ${resp.status} ${resp.statusText}${hint}`);
  }
  return resp.json();
}

// Returns visible threads anchored to `filePath` (right side), as
// [{ id, status, lineStart, lineEnd, comments:[{id, author, content, date}] }]
async function listFileThreads(org, project, repo, prId, filePath, pat) {
  const data = await adoRequest(`${prThreadsBase(org, project, repo, prId)}?api-version=7.1`, pat, 'GET');
  const norm = p => (p || '').replace(/^\/+/, '').toLowerCase();
  return (data.value || [])
    .filter(t => !t.isDeleted && t.threadContext?.filePath && norm(t.threadContext.filePath) === norm(filePath))
    .map(t => {
      const start = t.threadContext.rightFileStart?.line ?? t.threadContext.leftFileStart?.line;
      const end = t.threadContext.rightFileEnd?.line ?? t.threadContext.leftFileEnd?.line ?? start;
      return {
        id: t.id,
        status: normStatus(t.status),
        lineStart: start || 1, // file-level comments (no line) attach to the top
        lineEnd: end || start || 1,
        comments: (t.comments || [])
          .filter(c => !c.isDeleted && c.commentType !== 'system')
          .map(c => ({ id: c.id, author: c.author?.displayName || 'Unknown', content: c.content || '', date: c.publishedDate })),
      };
    })
    .filter(t => t.comments.length);
}

function mapThread(t) {
  return {
    id: t.id, status: normStatus(t.status),
    lineStart: t.threadContext?.rightFileStart?.line, lineEnd: t.threadContext?.rightFileEnd?.line,
    comments: (t.comments || []).map(c => ({ id: c.id, author: c.author?.displayName || 'You', content: c.content || '', date: c.publishedDate })),
  };
}

async function createFileThread(org, project, repo, prId, filePath, lineStart, lineEnd, content, pat) {
  const path = filePath.startsWith('/') ? filePath : '/' + filePath;
  const t = await adoRequest(`${prThreadsBase(org, project, repo, prId)}?api-version=7.1`, pat, 'POST', {
    comments: [{ parentCommentId: 0, content, commentType: 1 }],
    status: 1,
    threadContext: {
      filePath: path,
      rightFileStart: { line: lineStart, offset: 1 },
      rightFileEnd: { line: lineEnd, offset: 1 },
    },
  });
  return mapThread(t);
}

async function replyToThread(org, project, repo, prId, threadId, content, pat) {
  const c = await adoRequest(`${prThreadsBase(org, project, repo, prId)}/${threadId}/comments?api-version=7.1`, pat, 'POST',
    { parentCommentId: 1, content, commentType: 1 });
  return { id: c.id, author: c.author?.displayName || 'You', content: c.content || '', date: c.publishedDate };
}

async function setThreadStatus(org, project, repo, prId, threadId, status, pat) {
  await adoRequest(`${prThreadsBase(org, project, repo, prId)}/${threadId}?api-version=7.1`, pat, 'PATCH', { status });
}
