// Express 4 doesn't catch async errors automatically.
// This wrapper ensures any thrown error is forwarded to the error-handling middleware.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
