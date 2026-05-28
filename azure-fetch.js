// Shared helper: fetches a file from Azure DevOps, resolving PR source branch if needed.
// Expects `params` (URLSearchParams) and `pat` (string, may be empty) to be available
// in the calling script's scope.

async function fetchAzureFile(params, pat) {
  const org = params.get('org');
  const project = params.get('project');
  const repo = params.get('repo');
  const filePath = params.get('path');
  const prId = params.get('prId');

  const headers = pat ? { 'Authorization': 'Basic ' + btoa(':' + pat) } : {};
  const base = `https://dev.azure.com/${encodeURIComponent(org)}/${encodeURIComponent(project)}`;

  // Resolve source branch when viewing a PR
  let versionParam = '';
  if (prId) {
    const prApiUrl = `${base}/_apis/git/pullrequests/${prId}?api-version=7.1`;
    const prResp = await fetch(prApiUrl, { headers });
    if (!prResp.ok) {
      throw new Error(`Could not fetch PR #${prId}: HTTP ${prResp.status} ${prResp.statusText}`);
    }
    const prData = await prResp.json();
    // sourceRefName is like "refs/heads/feature/my-branch" → strip prefix
    const refName = prData.sourceRefName?.replace(/^refs\/heads\//, '') ?? '';
    if (refName) {
      versionParam = `&versionDescriptor.version=${encodeURIComponent(refName)}&versionDescriptor.versionType=branch`;
    }
  }

  const apiUrl =
    `${base}/_apis/git/repositories/${encodeURIComponent(repo)}/items` +
    `?path=${encodeURIComponent(filePath)}&$format=text&api-version=7.1${versionParam}`;

  const resp = await fetch(apiUrl, { headers });
  if (!resp.ok) {
    const hint =
      resp.status === 401 || resp.status === 203
        ? ' — check your PAT in the extension popup (needs Code: Read).'
        : resp.status === 404
        ? ` — resource not found.\nFetched: ${apiUrl}`
        : '';
    throw new Error(`HTTP ${resp.status} ${resp.statusText}${hint}`);
  }
  return { text: await resp.text(), apiUrl };
}
