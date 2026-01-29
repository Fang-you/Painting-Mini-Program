const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

const DASHSCOPE_HOST = 'dashscope.aliyuncs.com'
const CREATE_PATH = '/api/v1/services/aigc/text2image/image-synthesis'
const GET_TASK_PATH_PREFIX = '/api/v1/tasks/'

function safeJsonParse(str) {
  try {
    return JSON.parse(str)
  } catch (e) {
    return null
  }
}

function httpRequest({ method, path, headers, body }) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: DASHSCOPE_HOST,
        method,
        path,
        headers,
      },
      (res) => {
        let raw = ''
        res.on('data', (chunk) => {
          raw += chunk
        })
        res.on('end', () => {
          const json = safeJsonParse(raw)
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            raw,
            json,
          })
        })
      }
    )

    req.on('error', reject)

    if (body) {
      req.write(body)
    }
    req.end()
  })
}

function normalizeTaskResult(json) {
  const output = (json && json.output) ? json.output : {}
  const taskId = output.task_id || ''
  const taskStatus = output.task_status || ''

  // 新旧协议可能返回 results 或 choices
  let imageUrl = ''
  let actualPrompt = ''
  if (Array.isArray(output.results) && output.results.length > 0) {
    const first = output.results[0] || {}
    imageUrl = first.url || ''
    actualPrompt = first.actual_prompt || ''
  } else if (Array.isArray(output.choices) && output.choices.length > 0) {
    const firstChoice = output.choices[0] || {}
    const message = firstChoice.message || {}
    const content = message.content
    if (Array.isArray(content) && content.length > 0) {
      const firstContent = content[0] || {}
      imageUrl = firstContent.image || ''
    }
  }

  return {
    taskId,
    taskStatus,
    imageUrl,
    actualPrompt,
    output,
    requestId: (json && json.request_id) ? json.request_id : '',
  }
}

exports.main = async (event) => {
  const name = (event && event.name) ? event.name : ''
  const apiKey = process.env.DASHSCOPE_API_KEY

  if (!apiKey) {
    return {
      ok: false,
      errMsg: 'missing env DASHSCOPE_API_KEY',
    }
  }

  if (name === 'create') {
    const prompt = (event && event.prompt) ? String(event.prompt) : ''
    const negativePrompt = (event && event.negativePrompt) ? String(event.negativePrompt) : ''
    const size = (event && event.size) ? String(event.size) : '1024*1024'
    const n = Number(event && event.n ? event.n : 1)
    const promptExtend = (event && typeof event.promptExtend !== 'undefined') ? !!event.promptExtend : true
    const watermark = (event && typeof event.watermark !== 'undefined') ? !!event.watermark : false
    const seed = (event && typeof event.seed !== 'undefined') ? Number(event.seed) : undefined

    if (!prompt) {
      return { ok: false, errMsg: 'prompt required' }
    }

    const input = { prompt }
    if (negativePrompt) {
      input.negative_prompt = negativePrompt
    }

    const payload = {
      model: 'wanx2.1-t2i-plus',
      input,
      parameters: {
        size,
        n: (typeof n === 'number' && isFinite(n)) ? Math.max(1, Math.min(4, n)) : 1,
        prompt_extend: promptExtend,
        watermark: watermark,
      },
    }

    if (typeof seed === 'number' && isFinite(seed) && seed >= 0) {
      payload.parameters.seed = Math.floor(seed)
    }

    const body = JSON.stringify(payload)

    const resp = await httpRequest({
      method: 'POST',
      path: CREATE_PATH,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-DashScope-Async': 'enable',
        'Content-Length': Buffer.byteLength(body),
      },
      body,
    })

    const json = resp.json
    if (!json) {
      return { ok: false, errMsg: 'DashScope response parse failed', raw: resp.raw }
    }

    if (resp.statusCode >= 400 || json.code || json.message) {
      return {
        ok: false,
        errMsg: json.message || json.code || `DashScope HTTP ${resp.statusCode}`,
        raw: json,
      }
    }

    const normalized = normalizeTaskResult(json)
    return Object.assign({ ok: true }, normalized)
  }

  if (name === 'get') {
    const taskId = (event && event.taskId) ? String(event.taskId) : ''
    if (!taskId) {
      return { ok: false, errMsg: 'taskId required' }
    }

    const resp = await httpRequest({
      method: 'GET',
      path: `${GET_TASK_PATH_PREFIX}${encodeURIComponent(taskId)}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    const json = resp.json
    if (!json) {
      return { ok: false, errMsg: 'DashScope response parse failed', raw: resp.raw }
    }

    if (resp.statusCode >= 400 || json.code || json.message) {
      return {
        ok: false,
        errMsg: json.message || json.code || `DashScope HTTP ${resp.statusCode}`,
        raw: json,
      }
    }

    const normalized = normalizeTaskResult(json)
    return Object.assign({ ok: true }, normalized)
  }

  return { ok: false, errMsg: 'unknown name' }
}
