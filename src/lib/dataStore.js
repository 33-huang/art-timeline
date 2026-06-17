export async function loadData(filename) {
  const res = await fetch('/data/' + filename);
  if (!res.ok) {
    throw new Error(`loadData("${filename}") failed: HTTP ${res.status}`);
  }
  return res.json();
}

// TODO Step 9: 实现 GitHub Contents API 写回 data 分支
export async function saveData(filename, data) {
  throw new Error('saveData 未实现，见 Step 9');
}
