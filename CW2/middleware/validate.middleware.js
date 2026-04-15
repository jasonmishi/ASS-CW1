const validate = (schema, target = 'body') => {
  return (req, res, next) => {
    const parsed = schema.safeParse(req[target])

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: 'Validation error.',
        errors: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.') || target,
          message: issue.message
        }))
      })
    }

    req.validated = req.validated || {}
    req.validated[target] = parsed.data

    if (target !== 'query') {
      req[target] = parsed.data
    }

    return next()
  }
}

module.exports = {
  validate
}
