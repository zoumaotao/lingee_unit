// Netlify Function: 代理GitHub API写入records.md
// 环境变量 GITHUB_TOKEN 在 Netlify 后台配置
exports.handler = async (event) => {
  // 只允许POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (!GITHUB_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GITHUB_TOKEN not configured' }) };
  }

  const OWNER = 'zoumaotao';
  const REPO = 'lingee_unit';
  const FILE_PATH = 'records.md';

  try {
    const { record, description } = JSON.parse(event.body);

    if (!record || !description) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing record or description' }) };
    }

    const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${FILE_PATH}`;

    // 1. 获取当前文件内容和SHA
    const getResponse = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!getResponse.ok) {
      const errText = await getResponse.text();
      return { statusCode: getResponse.status, body: JSON.stringify({ error: 'Failed to get file', detail: errText }) };
    }

    const fileData = await getResponse.json();
    const sha = fileData.sha;
    
    // 解码Base64内容
    const existingContent = Buffer.from(fileData.content, 'base64').toString('utf-8');

    // 2. 追加新记录
    const newContent = existingContent + record;

    // 3. 更新文件
    const now = new Date().toLocaleString('zh-CN', { 
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit'
    }).replace(/\//g, '-');

    const updateResponse = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: `添加Session记录: ${description} (${now})`,
        content: Buffer.from(newContent, 'utf-8').toString('base64'),
        sha: sha
      })
    });

    if (updateResponse.ok) {
      const result = await updateResponse.json();
      return { 
        statusCode: 200, 
        body: JSON.stringify({ success: true, message: '记录已保存', commit: result.commit?.sha }) 
      };
    } else {
      const errData = await updateResponse.json();
      return { 
        statusCode: updateResponse.status, 
        body: JSON.stringify({ error: 'Failed to update file', detail: errData.message }) 
      };
    }
  } catch (error) {
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: 'Internal error', detail: error.message }) 
    };
  }
};
