const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV,
})

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const db = cloud.database()
  const users = db.collection('users')

  const openid = wxContext.OPENID

  const inputUserInfo = (event && event.userInfo) ? event.userInfo : {}
  const nickName = inputUserInfo.nickName || ''
  const avatarUrl = inputUserInfo.avatarUrl || ''

  const existRes = await users.where({ openid }).limit(1).get()
  const now = db.serverDate()

  if (existRes.data && existRes.data.length > 0) {
    const userDoc = existRes.data[0]
    
    // 只更新登录时间，不覆盖已保存的头像和用户名
    await users.doc(userDoc._id).update({
      data: {
        updatedAt: now,
      },
    })

    return {
      openid,
      userId: userDoc._id,
      isNew: false,
      user: {
        // 优先返回数据库中已保存的值
        nickName: userDoc.nickName || nickName || '',
        avatarUrl: userDoc.avatarUrl || avatarUrl || '',
      },
    }
  }

  const addRes = await users.add({
    data: {
      openid,
      nickName,
      avatarUrl,
      createdAt: now,
      updatedAt: now,
    },
  })

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
