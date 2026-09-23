const { REQUIRED_ROLE_ID, STATUS_ALLOWED_USERS } = require('../config');

/** True if the guild member has the role every command (except /status) requires. */
function hasRequiredRole(member) {
  if (!member || !member.roles) return false;
  return member.roles.cache.has(REQUIRED_ROLE_ID);
}

/** True if the user id is one of the two allowed to run /status. */
function isStatusAllowed(userId) {
  return STATUS_ALLOWED_USERS.includes(userId);
}

module.exports = { hasRequiredRole, isStatusAllowed };