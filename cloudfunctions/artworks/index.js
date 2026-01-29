const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

function buildTempUrlMap(tmp) {
  return (tmp.fileList || []).reduce((acc, cur) => {
    acc[cur.fileID] = cur.tempFileURL
    return acc
  }, {})
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()

  const action = (event && event.action) ? event.action : ''
  const openid = wxContext.OPENID

  try {
    await db.createCollection('artworks')
  } catch (e) {
    // ignore
  }

  if (action === 'create') {
    const imageUrl = (event && event.imageUrl) ? event.imageUrl : ''
    const imageFileId = (event && event.imageFileId) ? event.imageFileId : ''
    const prompt = (event && event.prompt) ? event.prompt : ''

    if (!imageUrl && !imageFileId) {
      return { ok: false, errMsg: 'image required' }
    }

    // 优先使用前端传入的作者信息，否则从 users 集合查询
    let authorName = (event && event.authorName) ? event.authorName : ''
    let authorAvatarUrl = (event && event.authorAvatarUrl) ? event.authorAvatarUrl : ''

    if (!authorName) {
      try {
        await db.createCollection('users')
      } catch (e) {
        // ignore
      }

      const users = db.collection('users')
      const userRes = await users.where({ openid }).limit(1).get().catch((e) => {
        const msg = (e && (e.errMsg || e.message)) ? (e.errMsg || e.message) : ''
        const isCollectionNotExist = e && (e.errCode === -502005 || /collection.*not exists|Db or Table not exist/i.test(msg))
        if (!isCollectionNotExist) throw e
        return { data: [] }
      })

      if (userRes.data && userRes.data.length > 0) {
        authorName = userRes.data[0].nickName || ''
        authorAvatarUrl = authorAvatarUrl || userRes.data[0].avatarUrl || ''
      }
    }

    const now = db.serverDate()
    const artworks = db.collection('artworks')

    const addRes = await artworks.add({
      data: {
        openid,
        imageUrl,
        imageFileId,
        prompt,
        authorName,
        authorAvatarUrl,
        likeCount: 0,
        createdAt: now,
        updatedAt: now,
      },
    })

    return {
      ok: true,
      id: addRes._id,
    }
  }

  if (action === 'list') {
    const page = Number(event && event.page ? event.page : 1)
    const pageSize = Number(event && event.pageSize ? event.pageSize : 20)
    const skip = Math.max(0, (page - 1) * pageSize)

    const artworks = db.collection('artworks')
    const res = await artworks.orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get().catch((e) => {
      const msg = (e && (e.errMsg || e.message)) ? (e.errMsg || e.message) : ''
      const isCollectionNotExist = e && (e.errCode === -502005 || /collection.*not exists|Db or Table not exist/i.test(msg))
      if (!isCollectionNotExist) throw e
      return { data: [] }
    })

    const data = res.data || []
    const fileIdSet = new Set()
    data.forEach((item) => {
      const img = item.imageFileId || item.imageUrl
      if (img && typeof img === 'string' && img.indexOf('cloud://') === 0) fileIdSet.add(img)
      const authorAvatar = item.authorAvatarUrl
      if (authorAvatar && typeof authorAvatar === 'string' && authorAvatar.indexOf('cloud://') === 0) fileIdSet.add(authorAvatar)
    })

    const fileList = Array.from(fileIdSet)
      .filter((fileID) => typeof fileID === 'string' && fileID)
      .map((fileID) => ({ fileID, maxAge: 24 * 60 * 60 }))
    let urlMap = {}
    if (fileList.length > 0) {
      const tmp = await cloud.getTempFileURL({ fileList })
      urlMap = buildTempUrlMap(tmp)
    }

    const list = data.map((item) => {
      const img = item.imageFileId || item.imageUrl || ''
      const authorAvatar = item.authorAvatarUrl || ''
      return {
        ...item,
        imageUrl: urlMap[img] || img,
        authorAvatarUrl: urlMap[authorAvatar] || authorAvatar,
      }
    })

    return {
      ok: true,
      list,
      page,
      pageSize,
      hasMore: (res.data || []).length === pageSize,
    }
  }

  if (action === 'listUser') {
    const page = Number(event && event.page ? event.page : 1)
    const pageSize = Number(event && event.pageSize ? event.pageSize : 50)
    const skip = Math.max(0, (page - 1) * pageSize)

    const artworks = db.collection('artworks')
    const res = await artworks.where({ openid }).orderBy('createdAt', 'desc').skip(skip).limit(pageSize).get().catch((e) => {
      const msg = (e && (e.errMsg || e.message)) ? (e.errMsg || e.message) : ''
      const isCollectionNotExist = e && (e.errCode === -502005 || /collection.*not exists|Db or Table not exist/i.test(msg))
      if (!isCollectionNotExist) throw e
      return { data: [] }
    })

    const data = res.data || []
    const fileIdSet = new Set()
    data.forEach((item) => {
      const img = item.imageFileId || item.imageUrl
      if (img && typeof img === 'string' && img.indexOf('cloud://') === 0) fileIdSet.add(img)
      const avatar = item.authorAvatarUrl
      if (avatar && typeof avatar === 'string' && avatar.indexOf('cloud://') === 0) fileIdSet.add(avatar)
    })

    const fileList = Array.from(fileIdSet)
      .filter((fileID) => typeof fileID === 'string' && fileID)
      .map((fileID) => ({ fileID, maxAge: 24 * 60 * 60 }))
    let urlMap = {}
    if (fileList.length > 0) {
      const tmp = await cloud.getTempFileURL({ fileList })
      urlMap = buildTempUrlMap(tmp)
    }

    const list = data.map((item) => {
      const img = item.imageFileId || item.imageUrl || ''
      const avatar = item.authorAvatarUrl || ''
      return {
        ...item,
        imageUrl: urlMap[img] || img,
        authorAvatarUrl: urlMap[avatar] || avatar,
      }
    })

    return {
      ok: true,
      list,
      page,
      pageSize,
      hasMore: (res.data || []).length === pageSize,
    }
  }

  // 删除画作
  if (action === 'delete') {
    const artworkId = (event && event.artworkId) ? event.artworkId : ''
    if (!artworkId) {
      return { ok: false, errMsg: 'artworkId required' }
    }

    const artworks = db.collection('artworks')
    
    // 先查询确认是当前用户的画作
    const artworkRes = await artworks.doc(artworkId).get().catch(() => null)
    if (!artworkRes || !artworkRes.data) {
      return { ok: false, errMsg: '画作不存在' }
    }
    if (artworkRes.data.openid !== openid) {
      return { ok: false, errMsg: '无权删除他人画作' }
    }

    // 删除云存储中的图片文件
    const imageFileId = artworkRes.data.imageFileId
    if (imageFileId && typeof imageFileId === 'string' && imageFileId.indexOf('cloud://') === 0) {
      try {
        await cloud.deleteFile({ fileList: [imageFileId] })
      } catch (e) {
        // ignore delete file error
      }
    }

    // 删除数据库记录
    await artworks.doc(artworkId).remove()

    return { ok: true }
  }

  return {
    ok: false,
    errMsg: 'unknown action',
  }
}
