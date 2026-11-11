module.exports = (u) => ({ _id: u._id, username: u.username, email: u.email, fullName: u.fullName, avatar: u.avatar, bio: u.bio, saved: u.saved || [] });
