const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const users = db.collection('users')

  const openid = wxContext.OPENID

  try {
    await db.createCollection('users')
  } catch (e) {
    const msg = (e && (e.errMsg || e.message)) ? (e.errMsg || e.message) : ''
    const isAlreadyExists = /already exists/i.test(msg)
    if (!isAlreadyExists) {
      // ignore
    }
  }

  const inputUserInfo = (event && event.userInfo) ? event.userInfo : {}
  const nickName = inputUserInfo.nickName || ''
  const avatarUrl = inputUserInfo.avatarUrl || ''

  let existRes = { data: [] }
  try {
    existRes = await users.where({ openid }).limit(1).get()
  } catch (e) {
    const msg = (e && (e.errMsg || e.message)) ? (e.errMsg || e.message) : ''
    const isCollectionNotExist = e && (e.errCode === -502005 || /collection.*not exists|Db or Table not exist/i.test(msg))
    if (!isCollectionNotExist) {
      throw e
    }
  }
  const now = db.serverDate()

  if (existRes.data && existRes.data.length > 0) {
    const userDoc = existRes.data[0]
    await users.doc(userDoc._id).update({
      data: {
        nickName,
        avatarUrl,
        updatedAt: now,
      },
    })

    return {
      openid,
      userId: userDoc._id,
      isNew: false,
      user: {
        nickName: nickName || userDoc.nickName || '',
        avatarUrl: avatarUrl || userDoc.avatarUrl || '',
      },
    }
  }

  let addRes
  try {
    addRes = await users.add({
      data: {
        openid,
        nickName,
        avatarUrl,
        createdAt: now,
        updatedAt: now,
      },
    })
  } catch (e) {
    const msg = (e && (e.errMsg || e.message)) ? (e.errMsg || e.message) : ''
    const isCollectionNotExist = e && (e.errCode === -502005 || /collection.*not exists|Db or Table not exist/i.test(msg))
    if (!isCollectionNotExist) {
      throw e
    }
    await db.createCollection('users')
    addRes = await users.add({
      data: {
        openid,
        nickName,
        avatarUrl,
        createdAt: now,
        updatedAt: now,
      },
    })
  }

  return {
    openid,
    userId: addRes._id,
    isNew: true,
    user: {
      nickName,
      avatarUrl,
    },
  }
}
