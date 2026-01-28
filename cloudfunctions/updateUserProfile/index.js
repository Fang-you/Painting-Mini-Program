const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const users = db.collection('users')

  const openid = wxContext.OPENID
  const avatarUrl = (event && event.avatarUrl) ? event.avatarUrl : ''
  const nickName = (event && event.nickName) ? event.nickName : ''

  try {
    await db.createCollection('users')
  } catch (e) {
    // ignore
  }

  const now = db.serverDate()

  const existRes = await users.where({ openid }).limit(1).get().catch((e) => {
    const msg = (e && (e.errMsg || e.message)) ? (e.errMsg || e.message) : ''
    const isCollectionNotExist = e && (e.errCode === -502005 || /collection.*not exists|Db or Table not exist/i.test(msg))
    if (!isCollectionNotExist) throw e
    return { data: [] }
  })

  if (existRes.data && existRes.data.length > 0) {
    const userDoc = existRes.data[0]
    await users.doc(userDoc._id).update({
      data: {
        avatarUrl: avatarUrl || userDoc.avatarUrl || '',
        nickName: nickName || userDoc.nickName || '',
        updatedAt: now,
      },
    })

    return {
      ok: true,
      userId: userDoc._id,
    }
  }

  const addRes = await users.add({
    data: {
      openid,
      avatarUrl,
      nickName,
      createdAt: now,
      updatedAt: now,
    },
  })

  return {
    ok: true,
    userId: addRes._id,
  }
}
